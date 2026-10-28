// Builds data/cities.json: the biggest cities of every country (shown on the map after a right answer).
//   node scripts/fetch-cities.ts            (uses the cached download in scripts/.cache/ne)
//   node scripts/fetch-cities.ts --refresh  (re-downloads Natural Earth)
// Source: Natural Earth 1:10m populated places (public domain).
// Ranking: POP_MIN is the city itself, POP_MAX the whole urban region (puts Mannheim before Munich),
// but POP_MIN is broken for some big cities (Paris 11 000, Lagos 0). So: the city, at least a quarter of the region.
// The numbers are not exact enough to show, so the file only keeps the order.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const REFRESH = process.argv.includes('--refresh')
const CACHE = 'scripts/.cache/ne'
const FILE = 'ne_10m_populated_places'
const URL = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/${FILE}.geojson`
const PER_COUNTRY = 5
const size = (p: any) => Math.max(p.POP_MIN, p.POP_MAX / 4)
const MIN_GAP_DEG = 0.35 // a suburb this close to a bigger city already picked is left out (e.g. Thane next to Mumbai)
mkdirSync(CACHE, { recursive: true })

const path = `${CACHE}/${FILE}.geojson`
if (REFRESH || !existsSync(path)) {
  console.log('downloading', FILE)
  const res = await fetch(URL)
  if (!res.ok) throw new Error(`Failed to fetch ${FILE}: ${res.status}`)
  writeFileSync(path, await res.text())
}
const places: any[] = JSON.parse(readFileSync(path, 'utf8')).features.map((f: any) => f.properties)
const countries: { id: string; cca3: string; capitals: string[]; latlng?: [number, number]; de?: { capitals?: string[] } }[] = JSON.parse(readFileSync('data/countries.json', 'utf8')).countries

/** One city: [English, German] name, [lon, lat], capital = 1. Biggest first. */
interface City { n: [string, string]; at: [number, number]; cap?: 1 }

const round = (x: number) => Math.round(x * 100) / 100
const out: Record<string, City[]> = {}
const problems: string[] = []

for (const c of countries) {
  // ISO_A2 is "-99" for Kosovo, so the 3-letter code is the fallback (Natural Earth: KOS, our data: UNK)
  const a3 = c.id === 'XK' ? 'KOS' : c.cca3
  const mine = places
    .filter((p) => p.ISO_A2 === c.id || p.ADM0_A3 === a3)
    .sort((a, b) => size(b) - size(a))
  const picked: any[] = []
  const near = (p: any) => picked.some((q) => Math.hypot(q.LONGITUDE - p.LONGITUDE, q.LATITUDE - p.LATITUDE) < MIN_GAP_DEG)
  // the capital(s) always (Bolivia has two), then the biggest others
  const capitals = mine.filter((p) => p.ADM0CAP === 1)
  picked.push(...capitals)
  for (const p of mine) {
    if (picked.length >= Math.max(PER_COUNTRY, capitals.length)) break
    if (!capitals.includes(p) && !near(p)) picked.push(p)
  }
  if (!picked.length) {
    // Nauru has no place in the file: at least its capital, at the country's coordinates
    if (c.latlng && c.capitals[0]) out[c.id] = [{ n: [c.capitals[0], c.de?.capitals?.[0] ?? c.capitals[0]], at: [round(c.latlng[1]), round(c.latlng[0])], cap: 1 }]
    else problems.push(`${c.id}: no cities`)
    continue
  }
  out[c.id] = picked
    .sort((a, b) => size(b) - size(a))
    .map((p) => {
      const en = String(p.NAME_EN ?? p.NAME).trim()
      const city: City = { n: [en, String(p.NAME_DE ?? en).trim()], at: [round(p.LONGITUDE), round(p.LATITUDE)] }
      if (capitals.includes(p)) city.cap = 1
      return city
    })
}

writeFileSync('data/cities.json', JSON.stringify(out))
const kb = Math.round(readFileSync('data/cities.json').length / 1024)
console.log(`${Object.keys(out).length} / ${countries.length} countries written to data/cities.json (${kb} KB)`)
if (problems.length) {
  console.log('\nProblems:\n  ' + problems.join('\n  '))
  process.exitCode = 1
}
