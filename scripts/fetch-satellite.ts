// Builds public/satellite.jpg: the satellite view of the map.
//   node scripts/fetch-satellite.ts            (uses the cached download in scripts/.cache/sat)
//   node scripts/fetch-satellite.ts --refresh  (re-downloads the photo)
// Source: NASA Visible Earth "Blue Marble: Next Generation" (July: little snow in the north, with sea floor), public domain.
// The photo is a plain lon/lat grid; here every pixel is moved into the map's own projection
// (src/map/projection.ts), so it lies exactly under the country borders.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import jpeg from 'jpeg-js'
import { H, SAT_SCALE, W, makeProjection } from '../src/map/projection.ts'

const REFRESH = process.argv.includes('--refresh')
const CACHE = 'scripts/.cache/sat'
const SRC = `${CACHE}/bluemarble.jpg`
const URL = 'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73751/world.topo.bathy.200407.3x5400x2700.jpg'
const QUALITY = 74
const OUTSIDE = [11, 26, 46] // beyond the edge of the globe (hidden by the map anyway)
mkdirSync(CACHE, { recursive: true })

if (REFRESH || !existsSync(SRC)) {
  console.log('downloading Blue Marble')
  const res = await fetch(URL)
  if (!res.ok) throw new Error(`Failed to fetch the photo: ${res.status}`)
  writeFileSync(SRC, Buffer.from(await res.arrayBuffer()))
}

const src = jpeg.decode(readFileSync(SRC), { maxMemoryUsageInMB: 1024 })
const projection = makeProjection()
const ow = W * SAT_SCALE
const oh = H * SAT_SCALE
const out = Buffer.alloc(ow * oh * 4)

/** Colour of the photo at lon/lat, blended from the 4 nearest pixels. */
function sample(lon: number, lat: number, o: number) {
  const x = ((lon + 180) / 360) * src.width - 0.5
  const y = ((90 - lat) / 180) * src.height - 0.5
  const x0 = Math.floor(x), y0 = Math.max(0, Math.floor(y))
  const fx = x - x0, fy = y - y0
  const y1 = Math.min(src.height - 1, y0 + 1)
  const xa = (x0 + src.width) % src.width, xb = (x0 + 1) % src.width
  for (let ch = 0; ch < 3; ch++) {
    const p = (xx: number, yy: number) => src.data[(yy * src.width + xx) * 4 + ch]
    out[o + ch] = (p(xa, y0) * (1 - fx) + p(xb, y0) * fx) * (1 - fy) + (p(xa, y1) * (1 - fx) + p(xb, y1) * fx) * fy
  }
}

for (let py = 0; py < oh; py++) {
  for (let px = 0; px < ow; px++) {
    const o = (py * ow + px) * 4
    out[o + 3] = 255
    const vx = (px + 0.5) / SAT_SCALE
    const vy = (py + 0.5) / SAT_SCALE
    const ll = projection.invert!([vx, vy])
    // outside the globe, invert() still returns something: check that it projects back to the same spot
    const back = ll && Math.abs(ll[0]) <= 180 && Math.abs(ll[1]) <= 90 ? projection(ll) : null
    if (!ll || !back || Math.hypot(back[0] - vx, back[1] - vy) > 0.05) {
      out[o] = OUTSIDE[0]; out[o + 1] = OUTSIDE[1]; out[o + 2] = OUTSIDE[2]
      continue
    }
    sample(ll[0], ll[1], o)
  }
}

const file = jpeg.encode({ data: out, width: ow, height: oh }, QUALITY)
writeFileSync('public/satellite.jpg', file.data)
console.log(`public/satellite.jpg: ${ow} x ${oh}, ${Math.round(file.data.length / 1024)} KB`)
