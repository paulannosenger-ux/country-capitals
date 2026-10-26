// Builds data/nature-geo.json: the shapes of the rivers, waters and mountain ranges listed in data/nature.ts.
//   node scripts/fetch-nature.ts            (uses cached downloads in scripts/.cache/ne)
//   node scripts/fetch-nature.ts --refresh  (re-downloads Natural Earth)
// Source: Natural Earth (public domain), 1:50m files; rivers/lakes missing there are taken from the 1:10m files.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { NATURE, type NatureSource } from '../data/nature.ts'

const REFRESH = process.argv.includes('--refresh')
const CACHE = 'scripts/.cache/ne'
const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'
mkdirSync(CACHE, { recursive: true })

const FILES: Record<NatureSource, string[]> = {
  rivers: ['ne_50m_rivers_lake_centerlines', 'ne_10m_rivers_lake_centerlines'],
  lakes: ['ne_50m_lakes', 'ne_10m_lakes'],
  marine: ['ne_50m_geography_marine_polys'],
  regions: ['ne_50m_geography_regions_polys'],
}

async function load(name: string): Promise<any[]> {
  const file = `${CACHE}/${name}.geojson`
  if (REFRESH || !existsSync(file)) {
    console.log('downloading', name)
    const res = await fetch(BASE + name + '.geojson')
    if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status}`)
    writeFileSync(file, await res.text())
  }
  return JSON.parse(readFileSync(file, 'utf8')).features
}

const nameOf = (f: any) => String(f.properties.name ?? f.properties.NAME ?? '').replace(/\s+/g, ' ').trim()
type Pt = [number, number]

/** Fewer points + 2 decimals (about 1 km): keeps the file small, still looks the same on the map. */
function simplifyLine(line: Pt[], tol: number): Pt[] {
  const out: Pt[] = []
  for (const p of line) {
    const q: Pt = [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]
    const last = out[out.length - 1]
    if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) >= tol) out.push(q)
  }
  const end = line[line.length - 1]
  const e: Pt = [Math.round(end[0] * 100) / 100, Math.round(end[1] * 100) / 100]
  const last = out[out.length - 1]
  if (last[0] !== e[0] || last[1] !== e[1]) out.push(e) // keep the end point (closes rings)
  return out
}

const lineLength = (l: Pt[]) => l.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - l[i - 1][0], p[1] - l[i - 1][1]) : 0), 0)

/** Planar centroid of a ring (in degrees; fine for marking a spot). */
function ringCentroid(r: Pt[]): { c: Pt; area: number } {
  let a = 0, x = 0, y = 0
  for (let i = 0; i < r.length - 1; i++) {
    const f = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
    a += f; x += (r[i][0] + r[i + 1][0]) * f; y += (r[i][1] + r[i + 1][1]) * f
  }
  if (Math.abs(a) < 1e-9) return { c: r[0], area: 0 }
  return { c: [x / (3 * a), y / (3 * a)], area: Math.abs(a / 2) }
}

const out: Record<string, { geo: any; at: Pt }> = {}
const problems: string[] = []

for (const item of NATURE) {
  const lines: Pt[][] = []
  const polys: Pt[][][] = []
  for (const wanted of item.names) {
    let found = false
    for (const file of FILES[item.src]) {
      for (const f of await load(file)) {
        if (nameOf(f) !== wanted || !f.geometry) continue
        const g = f.geometry
        // the pieces of the feature; with a bbox, each piece is checked on its own
        // (Natural Earth puts both "Negro" rivers, Amazon and Patagonia, into one feature)
        const pieces: { line?: Pt[]; poly?: Pt[][] }[] =
          g.type === 'LineString' ? [{ line: g.coordinates }]
          : g.type === 'MultiLineString' ? g.coordinates.map((line: Pt[]) => ({ line }))
          : g.type === 'Polygon' ? [{ poly: g.coordinates }]
          : g.type === 'MultiPolygon' ? g.coordinates.map((poly: Pt[][]) => ({ poly }))
          : []
        for (const piece of pieces) {
          if (item.bbox) {
            const [w, s, e, n] = item.bbox
            const pts = piece.line ?? piece.poly![0]
            const inside = pts.filter(([x, y]) => x >= w && x <= e && y >= s && y <= n).length
            if (inside < pts.length / 2) continue
          }
          found = true
          if (piece.line) lines.push(piece.line)
          else polys.push(piece.poly!)
        }
      }
      if (found) break // 1:50m had it, don't add the 1:10m copy as well
    }
    if (!found) problems.push(`${item.id}: no feature named "${wanted}" in ${item.src}`)
  }

  let at: Pt
  let geo: any
  if (lines.length) {
    const simple = lines.map((l) => simplifyLine(l, item.kind === 'water' ? 0.01 : 0.05)).filter((l) => l.length > 1)
    geo = { type: 'MultiLineString', coordinates: simple }
    // mark the middle of the longest piece
    const longest = simple.reduce((a, b) => (lineLength(b) > lineLength(a) ? b : a))
    let half = lineLength(longest) / 2
    at = longest[0]
    for (let i = 1; i < longest.length; i++) {
      half -= Math.hypot(longest[i][0] - longest[i - 1][0], longest[i][1] - longest[i - 1][1])
      if (half <= 0) { at = longest[i]; break }
    }
  } else if (polys.length) {
    const tol = item.src === 'lakes' ? 0.03 : 0.1
    // tiny rings (small lakes) would vanish when simplified: keep them with all their points
    const ringOf = (ring: Pt[]) => { const r = simplifyLine(ring, tol); return r.length >= 4 ? r : simplifyLine(ring, 0) }
    const simple = polys.map((p) => p.map(ringOf).filter((r) => r.length >= 4)).filter((p) => p.length)
    geo = { type: 'MultiPolygon', coordinates: simple }
    at = simple.map((p) => ringCentroid(p[0])).reduce((a, b) => (b.area > a.area ? b : a)).c
  } else {
    continue
  }
  out[item.id] = { geo, at: [Math.round(at[0] * 100) / 100, Math.round(at[1] * 100) / 100] }
}

writeFileSync('data/nature-geo.json', JSON.stringify(out))
const size = Math.round(readFileSync('data/nature-geo.json').length / 1024)
console.log(`${Object.keys(out).length} / ${NATURE.length} shapes written to data/nature-geo.json (${size} KB)`)
if (problems.length) {
  console.log('\nProblems:\n  ' + problems.join('\n  '))
  process.exitCode = 1
}
