// Completeness + sanity check for data/countries.json.
//   node scripts/validate-data.ts
// Exit code 1 (= build fails) if any country lacks a continent, capital, flag or map entry.

import { existsSync, readFileSync } from 'node:fs'
import { CONTINENTS, EXPECTED_UN_MEMBERS } from '../data/config.ts'

const data = JSON.parse(readFileSync('data/countries.json', 'utf8'))
const countries: any[] = data.countries
const atlas = JSON.parse(readFileSync('node_modules/world-atlas/countries-50m.json', 'utf8'))
const polygons: any[] = atlas.objects.countries.geometries

const errors: string[] = []   // fail the build
const warnings: string[] = [] // worth a look

/** Does the Natural Earth map have a polygon for this country? */
function hasPolygon(c: any): boolean {
  if (c.ccn3 && polygons.some((g) => g.id === c.ccn3)) return true
  // Kosovo has no numeric id in the atlas -> match by name
  return polygons.some((g) => !g.id && g.properties?.name === c.name.en)
}

const seen = new Set<string>()
const mapMode: Record<string, number> = { polygon: 0, marker: 0 }
const perContinent: Record<string, number> = {}

for (const c of countries) {
  const tag = `${c.id} ${c.name.en}`
  if (seen.has(c.id)) errors.push(`${tag}: duplicate id`)
  seen.add(c.id)

  if (!(CONTINENTS as readonly string[]).includes(c.continent)) errors.push(`${tag}: invalid continent "${c.continent}"`)
  perContinent[c.continent] = (perContinent[c.continent] ?? 0) + 1
  if (!c.capitals?.length) errors.push(`${tag}: no capital`)
  if (!c.flag || !existsSync(`public/${c.flag}`)) errors.push(`${tag}: flag missing`)

  if (hasPolygon(c)) mapMode.polygon++
  else if (Array.isArray(c.latlng) && c.latlng.length === 2) mapMode.marker++
  else errors.push(`${tag}: no map polygon and no coordinates for a marker`)

  // softer checks
  if (!c.name.de) warnings.push(`${tag}: no German name`)
  if (!c.population) warnings.push(`${tag}: no population`)
  else {
    if (c.population.value <= 0 || c.population.value > 1.6e9) warnings.push(`${tag}: suspicious population ${c.population.value}`)
    if (c.population.year < 2015) warnings.push(`${tag}: population is old (${c.population.year})`)
    if (c.areaKm2 && c.population.value / c.areaKm2 > 30000) warnings.push(`${tag}: suspicious density`)
  }
  if (!c.areaKm2 || c.areaKm2 <= 0) warnings.push(`${tag}: bad area ${c.areaKm2}`)
  if (!c.languages?.length) warnings.push(`${tag}: no languages`)
  if (!c.currencies?.length) warnings.push(`${tag}: no currency`)
  if (!c.government) warnings.push(`${tag}: no government type`)
  if (!c.summary?.text || c.summary.text.length < 60) warnings.push(`${tag}: missing/short summary`)
}

const un = countries.filter((c) => c.status === 'un-member').length
if (un !== EXPECTED_UN_MEMBERS) errors.push(`Expected ${EXPECTED_UN_MEMBERS} UN members, found ${un}`)

console.log(`Countries: ${countries.length}  (UN members: ${un})   lastUpdated: ${data.lastUpdated}`)
console.log('Per continent:', perContinent)
console.log('Map entries:', mapMode, '(marker = no polygon in Natural Earth 50m, drawn as a circle)')
if (warnings.length) console.log(`\nWARNINGS (${warnings.length}):\n  ` + warnings.join('\n  '))
if (errors.length) {
  console.error(`\nERRORS (${errors.length}):\n  ` + errors.join('\n  '))
  process.exit(1)
}
console.log('\nOK: every country has continent, capital, flag and map entry.')
