// The 3D globe look (globe.gl on three.js), used on the home page and in the flashcards instead of the flat map.
// - Surface: satellite tiles from Esri World Imagery, sharper the closer you zoom (like Google Earth); offline /
//   before they arrive: public/earth.jpg (NASA Blue Marble). Countries on top with a light tint of their learning
//   colour, other continents darkened; tiny countries get a dot. Drag to turn, scroll/pinch to zoom.
// - Space around it: sharp star points (`stars`) in front of a faint Milky Way picture (`starrySky`).
// - Turns to the chosen continent; `zoomTo` flies to a country. It only moves when you turn it (no auto-spin).
// - `cities`: the country's biggest cities as small HTML labels (hidden when they are on the back side).
// Lazy-loaded by WorldMap, so three.js is only downloaded by people who switch the globe on.
import { useEffect, useRef } from 'react'
import Globe, { type GlobeInstance } from 'globe.gl'
import { BufferGeometry, Float32BufferAttribute, Points, PointsMaterial } from 'three'
import { countryById, displayName, inArea } from '../data/countries'
import { citiesOf, cityName, type City } from '../data/cities'
import { useLang, useT } from '../i18n'
import { statusOf, useDirection, useProgress } from '../progress/progress'
import { StyleButton, VIEW_BOX, allFeatures, countryOfFeature, tinyCountryIds, type MapProps } from './WorldMap'
import { SAT_CREDIT, SAT_TILE_URL } from './satTiles'

const EARTH_URL = `${import.meta.env.BASE_URL}earth.jpg`
const WORLD_ALTITUDE = 1.9 // camera distance in globe radii when the whole world is shown
const FLY_MS = 1100

// tiny countries (Cape Verde, Malta, Tuvalu, ...) as dots you can tap
const tinyDots = tinyCountryIds().flatMap((id) => {
  const c = countryById.get(id)
  return c?.latlng ? [{ id, lat: c.latlng[0], lng: c.latlng[1] }] : []
})
type Dot = (typeof tinyDots)[number]

// the countries with their id (polygons that belong to no country on our list stay plain)
const features = allFeatures.map((f) => ({ ...f, cid: countryOfFeature(f) }))
type Feature = (typeof features)[number]

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** A colour token from index.css with transparency (the tokens are #rrggbb). */
function token(name: string, alpha: number): string {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return `rgba(255,255,255,${alpha})`
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`
}

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
function starrySky(): string {
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
function stars(radius: number): Points[] {
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

/** Where the camera looks for a continent (middle of its usual map view) and how far away it is. */
function continentView(area: NonNullable<MapProps['continent']>) {
  const [w, s, e, n] = VIEW_BOX[area]
  const span = Math.max(e - w, (n - s) * 1.3)
  return { lat: (s + n) / 2, lng: (w + e) / 2, altitude: clamp(span / 72, 0.6, 2) }
}

/** Camera for one country: closer for small countries. */
function countryView(id: string) {
  const c = countryById.get(id)
  if (!c?.latlng) return null
  const size = Math.sqrt(c.areaKm2 ?? 10000)
  return { lat: c.latlng[0], lng: c.latlng[1], altitude: clamp(size / 2000, 0.18, 1.5) }
}

export default function GlobeMap({ continent, focusId, onPickCountry, hideNames = false, cities, zoomTo, reserve, globe: canBeGlobe }: MapProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeInstance | null>(null)
  const onPickRef = useRef(onPickCountry)
  onPickRef.current = onPickCountry
  const progressVersion = useProgress()
  const direction = useDirection()
  const lang = useLang()
  const t = useT()

  // Create the globe once.
  useEffect(() => {
    const el = wrapRef.current!
    let dotRadius = 0.45
    const g: GlobeInstance = new Globe(el, { animateIn: true })
      .globeImageUrl(EARTH_URL)
      .globeTileEngineUrl(SAT_TILE_URL)
      .globeTileEngineMaxLevel(17)
      .backgroundColor('#01020a')
      .backgroundImageUrl(starrySky())
      .showAtmosphere(true)
      .atmosphereColor('#7fb2ff')
      .atmosphereAltitude(0.16)
      .polygonsData(features)
      .polygonSideColor(() => 'rgba(0,0,0,0)')
      // finer triangles: with the default (5°) big countries like DR Congo got holes in their colour
      .polygonCapCurvatureResolution(1.5)
      .polygonStrokeColor(() => 'rgba(255,255,255,0.55)')
      .polygonsTransitionDuration(300)
      .onPolygonClick((f) => { const id = (f as Feature).cid; if (id) onPickRef.current(id) })
      .pointsData(tinyDots)
      .pointLat('lat')
      .pointLng('lng')
      .pointRadius(0.45)
      .pointAltitude(0.002)
      .onPointClick((d) => onPickRef.current((d as Dot).id))
      .htmlLat((d) => (d as City).at[1])
      .htmlLng((d) => (d as City).at[0])
      .htmlAltitude(0.002)
      // tiny-country dots are sized in degrees: smaller the closer you get (else Luxembourg becomes a disc)
      .onZoom(({ altitude }) => {
        const r = clamp(altitude * 0.22, 0.03, 0.45)
        if (Math.abs(r - dotRadius) / dotRadius > 0.15) { dotRadius = r; g.pointRadius(r) }
      })
      .htmlTransitionDuration(0)
      .pointOfView({ lat: 25, lng: 10, altitude: WORLD_ALTITUDE })
    g.controls().enableDamping = true
    const starLayers = stars(g.getGlobeRadius() * 400) // inside the sky sphere (globe.gl puts it at 500 radii)
    starLayers.forEach((p) => g.scene().add(p))
    // sharper satellite tiles: switch to the next detail level at twice the camera distance than globe.gl does
    // (its default gives blurry pictures on big / retina screens)
    g.scene().traverse((o: any) => { if (Array.isArray(o.thresholds)) o.thresholds = o.thresholds.map((t: number) => t * 2) })
    globeRef.current = g

    const size = () => g.width(el.clientWidth).height(el.clientHeight)
    size()
    const ro = new ResizeObserver(size)
    ro.observe(el)
    return () => {
      ro.disconnect()
      starLayers.forEach((p) => { p.geometry.dispose(); (p.material as PointsMaterial).dispose() })
      g._destructor()
      g.renderer().dispose()
      el.innerHTML = ''
      globeRef.current = null
    }
  }, [])

  // Colours: learning status, the focused country, other continents darkened.
  useEffect(() => {
    const g = globeRef.current
    if (!g) return
    const colors = {
      learning: token('--c-learning', 0.42),
      mastered: token('--c-mastered', 0.42),
      focus: token('--accent', 0.6),
    }
    g.polygonCapColor((f) => {
      const id = (f as Feature).cid
      if (!id) return 'rgba(0,0,0,0)'
      if (id === focusId) return colors.focus
      const c = countryById.get(id)!
      if (continent && !inArea(c, continent)) return 'rgba(0,0,0,0.45)'
      const st = statusOf(id)
      return st === 'learning' ? colors.learning : st === 'mastered' ? colors.mastered : 'rgba(255,255,255,0.05)'
    })
      // barely above the ground: higher layers shift against the photo when you look from close by
      .polygonAltitude((f) => ((f as Feature).cid === focusId ? 0.003 : 0.0008))
      .pointColor((d) => {
        const id = (d as Dot).id
        if (id === focusId) return token('--accent', 1)
        const st = statusOf(id)
        return st === 'learning' ? token('--c-learning', 1) : st === 'mastered' ? token('--c-mastered', 1) : 'rgba(235,238,245,0.9)'
      })
      .pointLabel((d) => {
        if (hideNames) return ''
        const box = document.createElement('div')
        box.className = 'g-tip'
        box.textContent = displayName(countryById.get((d as Dot).id)!, lang)
        return box
      })
      .polygonLabel((f) => {
        const id = (f as Feature).cid
        if (!id || hideNames) return ''
        const box = document.createElement('div')
        box.className = 'g-tip'
        box.textContent = displayName(countryById.get(id)!, lang)
        return box
      })
  }, [continent, focusId, progressVersion, direction, hideNames, lang])

  // Cities of a country, as small labels on the surface.
  useEffect(() => {
    const g = globeRef.current
    if (!g) return
    g.htmlElementsData(cities ? citiesOf(cities) : []).htmlElement((d) => {
      const c = d as City
      const el = document.createElement('div')
      el.className = 'g-city' + (c.cap ? ' cap' : '')
      const dot = document.createElement('i')
      const name = document.createElement('span')
      name.textContent = cityName(c, lang)
      el.append(dot, name)
      return el
    })
  }, [cities, lang])

  // Keep the globe in the part of the map that isn't covered by the floating card.
  const reserveKey = JSON.stringify(reserve ?? {})
  useEffect(() => {
    const r = reserve ?? {}
    globeRef.current?.globeOffset([((r.left ?? 0) - (r.right ?? 0)) / 2, ((r.top ?? 0) - (r.bottom ?? 0)) / 2])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reserveKey])

  // Camera: country > continent > the whole world (slowly spinning).
  function flyHome(ms = FLY_MS) {
    const g = globeRef.current
    if (!g) return
    const view = (zoomTo && countryView(zoomTo)) || (continent ? continentView(continent) : null)
    g.pointOfView(view ?? { ...g.pointOfView(), altitude: WORLD_ALTITUDE }, ms)
  }
  useEffect(flyHome, [continent, zoomTo]) // eslint-disable-line react-hooks/exhaustive-deps

  function zoomBy(factor: number) {
    const g = globeRef.current
    if (!g) return
    const pov = g.pointOfView()
    g.pointOfView({ ...pov, altitude: clamp(pov.altitude / factor, 0.005, 4) }, 300)
  }

  return (
    <>
      <div ref={wrapRef} className="globe-wrap" role="img" aria-label={t.worldMap} />
      <div className="zoom-btns">
        <button className="map-btn zoom-pm" onClick={() => zoomBy(1.6)} aria-label={t.zoomIn}>+</button>
        <button className="map-btn zoom-pm" onClick={() => zoomBy(1 / 1.6)} aria-label={t.zoomOut}>−</button>
        <button className="map-btn" onClick={() => flyHome(700)} aria-label={t.resetView}>⤢</button>
        <StyleButton globe={canBeGlobe} />
      </div>
      <div className="sat-credit">{SAT_CREDIT}</div>
    </>
  )
}
