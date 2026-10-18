// Builds data/countries.json from real sources.
//   node scripts/fetch-data.ts            (uses cached downloads in scripts/.cache)
//   node scripts/fetch-data.ts --refresh  (re-downloads everything)
//
// Sources:
//   - mledoze/countries (GitHub): names, German names, capitals, area, languages, currencies, coordinates
//   - Wikidata SPARQL:            population (+ year), government type, Wikipedia article title
//   - Wikipedia REST API:         short summary text
//   - flag-icons (npm):           flag SVGs (copied to public/flags)
// Manual fixes live in data/overrides.json and are applied last.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { EXTRA_TERRITORIES, type Status } from '../data/config.ts'

const REFRESH = process.argv.includes('--refresh')
const CACHE = 'scripts/.cache'
const UA = 'country-capitals-learning-app/1.0 (student project; https://github.com/paulannosenger-ux/country-capitals)'
mkdirSync(CACHE, { recursive: true })
mkdirSync('public/flags', { recursive: true })

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Fetch with on-disk cache + retries so reruns are fast and flaky APIs are tolerated. */
async function cached(name: string, url: string, init: RequestInit = {}): Promise<any> {
  const file = `${CACHE}/${name}`
  if (!REFRESH && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'))
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...(init.headers ?? {}) } })
    if (res.ok) {
      const json = await res.json()
      writeFileSync(file, JSON.stringify(json))
      return json
    }
    if (res.status === 404) return null
    await sleep(1000 * attempt)
  }
  throw new Error(`Failed to fetch ${url}`)
}

// ---------- 1. base dataset ----------
const base: any[] = await cached(
  'mledoze.json',
  'https://raw.githubusercontent.com/mledoze/countries/master/dist/countries.json',
)
const overrides = JSON.parse(readFileSync('data/overrides.json', 'utf8'))

const extraStatus = new Map<string, Status>(EXTRA_TERRITORIES.map((e) => [e.cca2, e.status]))
const selected = base
  .filter((c) => extraStatus.has(c.cca2) || c.unMember)
  .map((c) => ({ raw: c, status: (extraStatus.get(c.cca2) ?? 'un-member') as Status }))
console.log(`Selected ${selected.length} countries from dataset`)

// ---------- 2. Wikidata ----------
const isoList = selected.map((s) => `"${s.raw.cca2}"`).join(' ')
const sparql = `
SELECT ?iso ?c ?pop ?popDate ?govLabel ?instLabel ?article WHERE {
  VALUES ?iso { ${isoList} }
  ?c wdt:P297 ?iso .
  OPTIONAL { ?c p:P1082 ?ps . ?ps ps:P1082 ?pop . OPTIONAL { ?ps pq:P585 ?popDate } }
  OPTIONAL { ?c wdt:P122 ?gov . }
  OPTIONAL { ?c wdt:P31 ?inst . }
  OPTIONAL { ?article schema:about ?c ; schema:isPartOf <https://en.wikipedia.org/> . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}`
const wd = await cached(
  'wikidata.json',
  'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql),
  { headers: { Accept: 'application/sparql-results+json' } },
)

interface WdInfo {
  qid: string
  pops: { value: number; date: string }[]
  gov: Set<string>
  inst: Set<string>
  article?: string
}
const wdByIso = new Map<string, WdInfo>()
for (const row of wd.results.bindings) {
  const iso = row.iso.value as string
  const info = wdByIso.get(iso) ?? { qid: row.c.value.split('/').pop(), pops: [], gov: new Set<string>(), inst: new Set<string>() }
  if (row.pop) info.pops.push({ value: Number(row.pop.value), date: row.popDate?.value ?? '' })
  if (row.govLabel) info.gov.add(row.govLabel.value)
  if (row.instLabel) info.inst.add(row.instLabel.value)
  if (row.article) info.article = row.article.value
  wdByIso.set(iso, info)
}

// Kosovo has no official ISO code on Wikidata -> look it up by its Wikidata id (Q1246).
const QID_FALLBACK: Record<string, string> = { XK: 'Q1246' }
for (const [iso, qid] of Object.entries(QID_FALLBACK)) {
  if (wdByIso.has(iso) || !extraStatus.has(iso)) continue
  const q = `
SELECT ?pop ?popDate ?govLabel ?instLabel ?article WHERE {
  BIND(wd:${qid} AS ?c)
  OPTIONAL { ?c p:P1082 ?ps . ?ps ps:P1082 ?pop . OPTIONAL { ?ps pq:P585 ?popDate } }
  OPTIONAL { ?c wdt:P122 ?gov . }
  OPTIONAL { ?c wdt:P31 ?inst . }
  OPTIONAL { ?article schema:about ?c ; schema:isPartOf <https://en.wikipedia.org/> . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}`
  const r = await cached(`wikidata-${iso}.json`, 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), {
    headers: { Accept: 'application/sparql-results+json' },
  })
  const info: WdInfo = { qid, pops: [], gov: new Set(), inst: new Set() }
  for (const row of r.results.bindings) {
    if (row.pop) info.pops.push({ value: Number(row.pop.value), date: row.popDate?.value ?? '' })
    if (row.govLabel) info.gov.add(row.govLabel.value)
    if (row.instLabel) info.inst.add(row.instLabel.value)
    if (row.article) info.article = row.article.value
  }
  wdByIso.set(iso, info)
}

/** Latest dated population figure. */
function latestPopulation(info?: WdInfo) {
  const dated = (info?.pops ?? []).filter((p) => p.date)
  if (!dated.length) return null
  dated.sort((a, b) => b.date.localeCompare(a.date))
  return { value: dated[0].value, year: Number(dated[0].date.slice(0, 4)) }
}

/** Government type: drop vague labels if a specific one exists. */
const VAGUE = new Set(['unitary state', 'federation', 'sovereign state', 'state', 'unitary republic'])
function governmentType(info?: WdInfo): string | null {
  let all = [...(info?.gov ?? [])]
  // Fallback: Wikidata "instance of" labels that describe a form of government
  const GOV_WORDS = /republic|monarchy|emirate|sultanate|theocracy|principality|duchy|parliament|presidential|federation of|dictatorship/i
  if (!all.length) all = [...(info?.inst ?? [])].filter((l) => GOV_WORDS.test(l))
  if (!all.length) return null
  const specific = all.filter((g) => !VAGUE.has(g.toLowerCase()) && GOV_WORDS.test(g))
  return (specific.length ? specific : all).slice(0, 2).join(', ')
}

// ---------- 2b. World Bank population (second source) ----------
// Most recent non-empty value per country (indicator SP.POP.TOTL). Used when it is newer than Wikidata.
const wbRaw = await cached(
  'worldbank.json',
  'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&mrnev=1&per_page=500',
)
const wbByIso3 = new Map<string, { value: number; year: number }>()
for (const r of wbRaw[1] ?? []) if (r.value && r.countryiso3code) wbByIso3.set(r.countryiso3code, { value: r.value, year: Number(r.date) })

// ---------- 3. Wikipedia summaries ----------
/** Keep 2-3 sentences (max ~350 chars) and drop parentheses (pronunciations etc.). */
function shorten(text: string): string {
  // drop (pronunciations etc.) and [IPA]
  const clean = text.replace(/\s*\([^()]*(\([^()]*\)[^()]*)*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim()
  const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [clean]
  let out = ''
  for (const s of sentences) {
    if (out && (out + s).length > 350) break
    out += s
    if (out.length >= 200) break
  }
  return out.trim()
}

async function wikiSummary(iso: string, article?: string) {
  if (!article) return null
  const title = article.split('/').pop()!
  const j = await cached(
    `wiki-${iso}.json`,
    `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
  )
  if (!j?.extract) return null
  return { text: shorten(j.extract), url: j.content_urls?.desktop?.page ?? article, fetched: true }
}

/** Fallback for government type: the Wikipedia infobox field `government_type`. */
async function infoboxGovernment(iso: string, article?: string): Promise<string | null> {
  if (!article) return null
  const file = `${CACHE}/infobox-${iso}.txt`
  let wikitext: string
  if (!REFRESH && existsSync(file)) wikitext = readFileSync(file, 'utf8')
  else {
    await sleep(700) // be polite: the API rate-limits quickly
    const title = article.split('/').pop()!
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&rvsection=0&format=json&formatversion=2&titles=${title}`
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) return null
    const j: any = await res.json().catch(() => null)
    wikitext = j?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content
    if (!wikitext) return null
    writeFileSync(file, wikitext)
  }
  const m = wikitext.match(/\|\s*government_type\s*=([\s\S]*?)\n\s*\|\s*\w+\s*=/)
  if (!m) return null
  let raw = m[1]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[\s\S]*?<\/ref>/g, '')
    .replace(/<br\s*\/?>/gi, ' ; ')
    .replace(/\{\{\s*(?:plainlist|flatlist|unbulleted list|ubl|hlist|collapsible list)\s*\|/gi, ' ; ')
    .replace(/\n\s*\*/g, ' ; ')
  // remove simple remaining templates (e.g. {{efn|..}}, {{small|..}} keeps nothing)
  for (let k = 0; k < 3; k++) raw = raw.replace(/\{\{[^{}]*\}\}/g, '')
  const parts = raw
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/[{}]/g, '')
    .split(';')
    .map((x) => x.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  // first item only; cut explanatory tails like " under a ..." / " with ..." / " (de jure)"
  let text = (parts[0] ?? '').replace(/\s+(under|with|led by|ruled by|comprising)\s.*$/i, '').replace(/\s*\(.*$/, '').trim()
  if (!text || text.length > 90) return null
  return text.charAt(0).toLowerCase() + text.slice(1)
}

// ---------- 3b. German: capitals, government, Wikipedia summary, languages, currencies ----------
// One Wikidata query for all countries (by Wikidata id, so Kosovo is included).
const sparqlDe = `
SELECT ?c ?capEn ?capDe ?govDe ?article WHERE {
  VALUES ?c { ${[...wdByIso.values()].map((i) => 'wd:' + i.qid).join(' ')} }
  OPTIONAL { ?c wdt:P36 ?cap . ?cap rdfs:label ?capEn . FILTER(lang(?capEn) = 'en')
             OPTIONAL { ?cap rdfs:label ?capDe . FILTER(lang(?capDe) = 'de') } }
  OPTIONAL { ?c wdt:P122 ?gov . ?gov rdfs:label ?govDe . FILTER(lang(?govDe) = 'de') }
  OPTIONAL { ?article schema:about ?c ; schema:isPartOf <https://de.wikipedia.org/> . }
}`
const wdDe = await cached('wikidata-de.json', 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparqlDe), {
  headers: { Accept: 'application/sparql-results+json' },
})
interface DeInfo { capitals: Map<string, string>; gov: Set<string>; article?: string }
const deByQid = new Map<string, DeInfo>()
for (const row of wdDe.results.bindings) {
  const qid = row.c.value.split('/').pop()
  const info = deByQid.get(qid) ?? { capitals: new Map(), gov: new Set<string>() }
  if (row.capEn) info.capitals.set(row.capEn.value, row.capDe?.value ?? row.capEn.value)
  if (row.govDe) info.gov.add(row.govDe.value)
  if (row.article) info.article = row.article.value
  deByQid.set(qid, info)
}
const plain = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')

/** German names of the capitals, in the same order as the English ones (English if Wikidata has nothing). */
function capitalsDe(iso: string, capitals: string[], qid?: string): string[] {
  const manual = overrides.capitalsDe?.[iso]
  if (manual) return manual.value
  const known = qid ? deByQid.get(qid)?.capitals : undefined
  return capitals.map((en) => {
    for (const [wdEn, de] of known ?? []) if (plain(wdEn) === plain(en)) return de
    return en
  })
}

const VAGUE_DE = new Set(['einheitsstaat', 'bundesstaat', 'souveräner staat', 'staat', 'föderation'])
function governmentDe(iso: string, qid?: string): string | null {
  if (overrides.governmentDe?.[iso]) return overrides.governmentDe[iso]
  const all = [...(qid ? deByQid.get(qid)?.gov ?? [] : [])]
  const specific = all.filter((g) => !VAGUE_DE.has(g.toLowerCase()))
  const list = (specific.length ? specific : all).slice(0, 2)
  return list.length ? list.join(', ') : null
}

async function wikiSummaryDe(iso: string, qid?: string) {
  const article = qid ? deByQid.get(qid)?.article : undefined
  if (!article) return null
  const j = await cached(`wikide-${iso}.json`, `https://de.wikipedia.org/api/rest_v1/page/summary/${article.split('/').pop()}`)
  if (!j?.extract) return null
  return { text: shorten(j.extract), url: j.content_urls?.desktop?.page ?? article, source: 'Wikipedia (de)' }
}

// Languages and currencies: German names from the built-in Unicode data (Intl), English as fallback.
const langCodeByName = new Map<string, string>()
for (const c of base) for (const [code, name] of Object.entries<string>(c.languages ?? {})) langCodeByName.set(name, code)
const LANG_DE: Record<string, string> = {
  cnr: 'Montenegrinisch', ber: 'Berbersprachen', smi: 'Samisch', khi: 'Khoisan-Sprachen', zdj: 'Komorisch', toi: 'Tonga',
  hgm: 'Khoekhoe', mey: 'Hassania', nzs: 'Neuseeländische Gebärdensprache', zib: 'Simbabwische Gebärdensprache', bjz: 'Belize-Kreolisch',
}
const intlLang = new Intl.DisplayNames(['de'], { type: 'language', fallback: 'none' })
const intlCur = new Intl.DisplayNames(['de'], { type: 'currency', fallback: 'none' })
function languageDe(name: string): string {
  const code = langCodeByName.get(name)
  if (!code) return name
  try { return LANG_DE[code] ?? intlLang.of(code) ?? name } catch { return name }
}
const CUR_DE: Record<string, string> = { TVD: 'Tuvalu-Dollar', KID: 'Kiribati-Dollar', CKD: 'Cookinseln-Dollar' }
function currencyDe(code: string, name: string): string {
  try { return CUR_DE[code] ?? intlCur.of(code) ?? name } catch { return name }
}

// ---------- 4. continent mapping ----------
function defaultContinent(c: any): string {
  switch (c.region) {
    case 'Europe': case 'Asia': case 'Africa': case 'Oceania':
      return c.region
    case 'Americas':
      return c.subregion === 'South America' ? 'South America' : 'North America'
    default:
      return 'UNKNOWN'
  }
}

// ---------- 5. assemble ----------
const countries: any[] = []
let i = 0
for (const { raw: c, status } of selected) {
  i++
  const iso: string = c.cca2
  const info = wdByIso.get(iso)
  const summary = await wikiSummary(iso, info?.article)
  if (i % 25 === 0) console.log(`  ...${i}/${selected.length}`)

  const ov = (section: string) => overrides[section]?.[iso]
  const wdPop = latestPopulation(info)
  const wbPop = wbByIso3.get(c.cca3 === 'UNK' ? 'XKX' : c.cca3)
  // take the newer of the two sources (Wikidata wins ties)
  const pop = wbPop && (!wdPop || wbPop.year > wdPop.year)
    ? { ...wbPop, source: 'World Bank (SP.POP.TOTL)' }
    : wdPop && { ...wdPop, source: 'Wikidata (P1082)' }

  // flag file
  const flagSrc = `node_modules/flag-icons/flags/4x3/${iso.toLowerCase()}.svg`
  const hasFlag = existsSync(flagSrc)
  if (hasFlag) copyFileSync(flagSrc, `public/flags/${iso.toLowerCase()}.svg`)

  const entry: any = {
    id: iso,
    cca3: c.cca3,
    ccn3: c.ccn3 ?? null,
    name: { en: ov('names')?.value ?? c.name.common, de: c.translations?.deu?.common ?? null },
    status,
    continent: ov('continents')?.value ?? defaultContinent(c),
    capitals: ov('capitals')?.value ?? c.capital ?? [],
    capitalAliases: ov('capitalAliases') ?? [],
    // other accepted country names for the map quiz (official name, alternative spellings, manual extras)
    nameAliases: [...new Set([c.name.official, ...(c.altSpellings ?? []), ...(overrides.nameAliases?.[iso] ?? [])])]
      .filter((n: string) => n && n.length > 2 && n !== (ov('names')?.value ?? c.name.common)),
    flag: hasFlag ? `flags/${iso.toLowerCase()}.svg` : null,
    population: pop || null,
    areaKm2: c.area ?? null,
    languages: Object.values(c.languages ?? {}),
    currencies: Object.entries(c.currencies ?? {}).map(([code, v]: [string, any]) => ({
      code, name: v.name, symbol: v.symbol ?? null,
    })),
    government: (await infoboxGovernment(iso, info?.article)) ?? governmentType(info),
    summary: summary ? { text: summary.text, url: summary.url, source: 'Wikipedia' } : null,
    latlng: c.latlng ?? null,
    wikidata: info?.qid ?? null,
  }

  // generic per-field overrides: { "XK": { "population": { "value": ..., "source": "..." } } }
  for (const [field, o] of Object.entries<any>(overrides.fields?.[iso] ?? {})) entry[field] = o.value

  // German texts (after the overrides, so they follow overridden languages/currencies)
  entry.de = {
    capitals: capitalsDe(iso, entry.capitals, info?.qid),
    government: governmentDe(iso, info?.qid),
    summary: await wikiSummaryDe(iso, info?.qid),
    languages: entry.languages.map(languageDe),
    currencies: entry.currencies.map((x: any) => currencyDe(x.code, x.name)),
  }

  countries.push(entry)
}

countries.sort((a, b) => a.name.en.localeCompare(b.name.en))

writeFileSync(
  'data/countries.json',
  JSON.stringify(
    {
      lastUpdated: new Date().toISOString().slice(0, 10),
      sources: {
        base: 'https://github.com/mledoze/countries',
        wikidata: 'https://www.wikidata.org (SPARQL: population P1082, government P122)',
        summaries: 'https://en.wikipedia.org and https://de.wikipedia.org (REST page summaries, CC BY-SA)',
        flags: 'https://github.com/lipis/flag-icons',
      },
      countries,
    },
    null,
    1,
  ) + '\n',
)
console.log(`Wrote data/countries.json (${countries.length} countries)`)
