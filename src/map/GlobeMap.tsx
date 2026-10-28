// The 3D globe look (globe.gl on three.js), used on the home page and in the flashcards instead of the flat map.
// - Texture: public/earth.jpg (NASA Blue Marble, see scripts/fetch-satellite.ts), countries on top with a light
//   tint of their learning colour, other continents darkened; drag to turn, scroll/pinch to zoom.
// - Turns to the chosen continent; `zoomTo` flies to a country; with nothing chosen it slowly spins.
// - `cities`: the country's biggest cities as small HTML labels (hidden when they are on the back side).
// Lazy-loaded by WorldMap, so three.js is only downloaded by people who switch the globe on.
import { useEffect, useRef } from 'react'
import Globe, { type GlobeInstance } from 'globe.gl'
import { countryById, displayName, inArea } from '../data/countries'
import { citiesOf, cityName, type City } from '../data/cities'
import { useLang, useT } from '../i18n'
import { statusOf, useDirection, useProgress } from '../progress/progress'
import { StyleButton, VIEW_BOX, allFeatures, countryOfFeature, type MapProps } from './WorldMap'

const EARTH_URL = `${import.meta.env.BASE_URL}earth.jpg`
const WORLD_ALTITUDE = 1.9 // camera distance in globe radii when the whole world is shown
const FLY_MS = 1100

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
  return { lat: c.latlng[0], lng: c.latlng[1], altitude: clamp(size / 1800, 0.35, 1.5) } // closer than 0.35 the photo gets blurry
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
    const g = new Globe(el, { animateIn: true })
      .globeImageUrl(EARTH_URL)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#7fb2ff')
      .atmosphereAltitude(0.16)
      .polygonsData(features)
      .polygonSideColor(() => 'rgba(0,0,0,0)')
      .polygonStrokeColor(() => 'rgba(255,255,255,0.55)')
      .polygonsTransitionDuration(300)
      .onPolygonClick((f) => { const id = (f as Feature).cid; if (id) onPickRef.current(id) })
      .htmlLat((d) => (d as City).at[1])
      .htmlLng((d) => (d as City).at[0])
      .htmlAltitude(0.012)
      .htmlTransitionDuration(0)
      .pointOfView({ lat: 25, lng: 10, altitude: WORLD_ALTITUDE })
    const controls = g.controls()
    controls.autoRotateSpeed = 0.35
    controls.enableDamping = true
    globeRef.current = g

    const size = () => g.width(el.clientWidth).height(el.clientHeight)
    size()
    const ro = new ResizeObserver(size)
    ro.observe(el)
    return () => {
      ro.disconnect()
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
      learning: token('--c-learning', 0.55),
      mastered: token('--c-mastered', 0.55),
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
      .polygonAltitude((f) => ((f as Feature).cid === focusId ? 0.022 : 0.006))
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
    g.controls().autoRotate = !view
    g.pointOfView(view ?? { ...g.pointOfView(), altitude: WORLD_ALTITUDE }, ms)
  }
  useEffect(flyHome, [continent, zoomTo]) // eslint-disable-line react-hooks/exhaustive-deps

  function zoomBy(factor: number) {
    const g = globeRef.current
    if (!g) return
    const pov = g.pointOfView()
    g.pointOfView({ ...pov, altitude: clamp(pov.altitude / factor, 0.1, 4) }, 300)
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
    </>
  )
}
