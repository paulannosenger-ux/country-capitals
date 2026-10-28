// Sharp satellite detail for the flat map. The map uses its own projection (Natural Earth), the tiles from the
// internet use Web Mercator, so after every zoom/pan the visible part is redrawn pixel by pixel:
//   screen pixel -> map position -> lon/lat (projection.invert) -> pixel in the right Mercator tile.
// The result is one picture exactly covering the visible area, laid over the coarse public/satellite.jpg.
import { makeProjection } from './projection'
import { SAT_TILE_URL } from './satTiles'

const projection = makeProjection()
const TILE = 256
const MAX_TILES = 90 // per picture (each ~20 KB)
const MAX_LAT = 85.05 // Web Mercator ends here

const tiles = new Map<string, Promise<HTMLImageElement | null>>()
function loadTile(z: number, x: number, y: number): Promise<HTMLImageElement | null> {
  const key = `${z}/${x}/${y}`
  if (!tiles.has(key)) {
    tiles.set(key, new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous' // needed to read its pixels (the server allows it)
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null) // offline: the coarse picture stays
      img.src = SAT_TILE_URL(x, y, z)
    }))
  }
  return tiles.get(key)!
}

/** Mercator tile coordinates (fractional) of lon/lat at zoom z. */
function merc(lon: number, lat: number, z: number): [number, number] {
  const n = 2 ** z
  const s = Math.sin((lat * Math.PI) / 180)
  return [((lon + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n]
}

/**
 * Picture of the map area [x0, y0, x1, y1] (map units) at w x h pixels, or null (too far out, offline, cancelled).
 * `stale()` is checked after the tiles arrived: the view may have moved on in the meantime.
 */
export async function renderDetail(box: [number, number, number, number], w: number, h: number, stale: () => boolean): Promise<HTMLCanvasElement | null> {
  const [x0, y0, x1, y1] = box
  // 1. lon/lat of every pixel
  const lonlat = new Float64Array(w * h * 2)
  let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 2
      const ll = projection.invert!([x0 + ((px + 0.5) / w) * (x1 - x0), y0 + ((py + 0.5) / h) * (y1 - y0)])
      if (!ll || !(Math.abs(ll[0]) <= 180) || !(Math.abs(ll[1]) <= MAX_LAT)) { lonlat[i] = NaN; continue }
      lonlat[i] = ll[0]; lonlat[i + 1] = ll[1]
      if (ll[0] < minLon) minLon = ll[0]
      if (ll[0] > maxLon) maxLon = ll[0]
      if (ll[1] < minLat) minLat = ll[1]
      if (ll[1] > maxLat) maxLat = ll[1]
    }
  }
  if (maxLon <= minLon || maxLon - minLon > 200) return null // nothing visible, or most of the world (the coarse picture is enough)

  // 2. tile zoom level: about one tile pixel per screen pixel, fewer if that needs too many tiles
  const degPerPx = (maxLon - minLon) / w
  let z = Math.min(17, Math.max(2, Math.ceil(Math.log2(360 / (TILE * degPerPx)))))
  let tx0 = 0, ty0 = 0, tx1 = 0, ty1 = 0
  for (; z >= 2; z--) {
    ;[tx0, ty0] = merc(minLon, maxLat, z).map(Math.floor)
    ;[tx1, ty1] = merc(maxLon, minLat, z).map(Math.floor)
    const n = 2 ** z
    tx1 = Math.min(tx1, n - 1); ty1 = Math.min(ty1, n - 1)
    if ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) <= MAX_TILES) break
  }

  // 3. load the tiles and put them side by side
  const cols = tx1 - tx0 + 1, rows = ty1 - ty0 + 1
  const jobs: Promise<void>[] = []
  const mosaic = document.createElement('canvas')
  mosaic.width = cols * TILE; mosaic.height = rows * TILE
  const mctx = mosaic.getContext('2d', { willReadFrequently: true })!
  let loaded = 0
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      jobs.push(loadTile(z, tx, ty).then((img) => {
        if (img) { mctx.drawImage(img, (tx - tx0) * TILE, (ty - ty0) * TILE); loaded++ }
      }))
    }
  }
  await Promise.all(jobs)
  if (stale() || !loaded) return null
  const src = mctx.getImageData(0, 0, mosaic.width, mosaic.height).data

  // 4. every pixel: its colour from the mosaic (transparent outside the globe / where a tile is missing)
  const out = document.createElement('canvas')
  out.width = w; out.height = h
  const octx = out.getContext('2d')!
  const img = octx.createImageData(w, h)
  const n = 2 ** z
  for (let p = 0; p < w * h; p++) {
    const lon = lonlat[p * 2]
    if (Number.isNaN(lon)) continue
    const lat = lonlat[p * 2 + 1]
    const s = Math.sin((lat * Math.PI) / 180)
    const mx = Math.floor((((lon + 180) / 360) * n - tx0) * TILE)
    const my = Math.floor(((0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n - ty0) * TILE)
    if (mx < 0 || my < 0 || mx >= mosaic.width || my >= mosaic.height) continue
    const si = (my * mosaic.width + mx) * 4
    if (src[si + 3] === 0) continue
    img.data[p * 4] = src[si]; img.data[p * 4 + 1] = src[si + 1]; img.data[p * 4 + 2] = src[si + 2]; img.data[p * 4 + 3] = 255
  }
  octx.putImageData(img, 0, 0)
  return out
}
