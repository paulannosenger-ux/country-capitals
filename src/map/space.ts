// Outer space around the 3D globe and the planets (Space tab): sharp star points and a faint Milky Way.
import { BufferGeometry, Float32BufferAttribute, Points, PointsMaterial } from 'three'

/** Random numbers that are the same every time (the sky looks the same on every visit). */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The night sky as a picture wrapped around the scene: only the faint Milky Way (the stars are real points, see `stars`). */
let sky: string | null = null
export function starrySky(): string {
  if (sky) return sky
  const w = 4096, h = 2048
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  const rnd = seeded(7)
  ctx.fillStyle = '#01020a'
  ctx.fillRect(0, 0, w, h)
  // Milky Way: many soft, faint clouds along a wavy band
  const bandY = (x: number) => h * (0.5 + 0.22 * Math.sin((x / w) * Math.PI * 2 + 0.6))
  for (let i = 0; i < 1800; i++) {
    const x = rnd() * w
    const y = bandY(x) + (rnd() - 0.5) * h * 0.16 * (0.4 + rnd())
    const r = 30 + rnd() * 110
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const tint = rnd() < 0.5 ? '170,180,255' : '255,225,200'
    g.addColorStop(0, `rgba(${tint},${0.018 + rnd() * 0.02})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  sky = canvas.toDataURL('image/jpeg', 0.9)
  return sky
}

/**
 * Stars as points of light around the scene: drawn in screen pixels, so they stay sharp on any screen
 * (in the sky picture they became blurry blobs). Three sizes, more of them along the Milky Way.
 */
export function stars(radius: number): Points[] {
  const rnd = seeded(11)
  const tints: [number, number, number][] = [[1, 1, 1], [0.82, 0.88, 1], [1, 0.94, 0.84], [0.75, 0.8, 1], [1, 0.86, 0.75]]
  const layers = [
    { n: 9000, size: 1.2, opacity: 0.7 },
    { n: 2000, size: 1.8, opacity: 0.9 },
    { n: 260, size: 2.8, opacity: 1 },
  ]
  return layers.map(({ n, size, opacity }) => {
    const pos: number[] = [], col: number[] = []
    for (let i = 0; i < n; i++) {
      // a random direction; a third of them squeezed towards the Milky Way plane (tilted by ~60°)
      let x = rnd() * 2 - 1, y = rnd() * 2 - 1, z = rnd() * 2 - 1
      if (rnd() < 0.33) y *= 0.15
      const len = Math.hypot(x, y, z) || 1
      ;[x, y, z] = [x / len, y / len, z / len]
      const ty = y * 0.5 - z * 0.866, tz = y * 0.866 + z * 0.5
      pos.push(x * radius, ty * radius, tz * radius)
      const tint = tints[Math.floor(rnd() * tints.length)], dim = 0.45 + rnd() * 0.55
      col.push(tint[0] * dim, tint[1] * dim, tint[2] * dim)
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
    geo.setAttribute('color', new Float32BufferAttribute(col, 3))
    return new Points(geo, new PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, opacity, depthWrite: false }))
  })
}
