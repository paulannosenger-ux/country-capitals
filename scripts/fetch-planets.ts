// Builds public/planets/*: the surface pictures of the 8 planets (wrapped around the 3D planets in the Space tab).
//   node scripts/fetch-planets.ts            (uses cached downloads in scripts/.cache/planets)
//   node scripts/fetch-planets.ts --refresh  (re-downloads them)
// Source: Solar System Scope textures (https://www.solarsystemscope.com/textures/, CC BY 4.0, credit shown in the app),
// based on NASA mission pictures. The 2k JPEGs are re-saved a bit smaller; Saturn's ring stays a PNG (transparency).

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import jpeg from 'jpeg-js'
import { PLANETS } from '../data/planets.ts'

const REFRESH = process.argv.includes('--refresh')
const CACHE = 'scripts/.cache/planets'
const BASE = 'https://www.solarsystemscope.com/textures/download/'
const QUALITY = 80
mkdirSync(CACHE, { recursive: true })
mkdirSync('public/planets', { recursive: true })

async function download(file: string): Promise<string> {
  const path = `${CACHE}/${file}`
  if (REFRESH || !existsSync(path)) {
    console.log('downloading', file)
    const res = await fetch(BASE + file, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) throw new Error(`Failed to fetch ${file}: ${res.status}`)
    writeFileSync(path, Buffer.from(await res.arrayBuffer()))
  }
  return path
}

for (const p of PLANETS) {
  const src = await download(p.texture)
  const img = jpeg.decode(readFileSync(src), { maxMemoryUsageInMB: 512 })
  const out = jpeg.encode(img, QUALITY)
  writeFileSync(`public/planets/${p.id}.jpg`, out.data)
  console.log(`public/planets/${p.id}.jpg: ${img.width} x ${img.height}, ${Math.round(out.data.length / 1024)} KB`)
}
copyFileSync(await download('2k_saturn_ring_alpha.png'), 'public/planets/saturn-ring.png')
console.log('public/planets/saturn-ring.png')
