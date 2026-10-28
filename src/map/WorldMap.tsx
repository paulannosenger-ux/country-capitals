// Interactive SVG world map (Natural Earth 50m via world-atlas).
// - Pan/zoom with mouse wheel, drag, touch and pinch (d3-zoom) + zoom buttons.
// - Countries are colored by learning status; other continents are dimmed.
// - Tiny countries (and Tuvalu, which has no polygon) get a circle marker.
// - The focused country gets a highlight ring.
// - Satellite look (mapStyle.ts): public/satellite.jpg lies under the countries, which then only show their borders.
// - `cities`: dots + names of a country's biggest cities; `zoomTo`: zoom in on one country.
// - Globe look (only where `globe` is set: home page, flashcards): GlobeMap.tsx draws a 3D globe instead.
import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { geoGraticule10, geoPath } from 'd3-geo'
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'
import { select } from 'd3-selection'
import 'd3-transition'
import { feature } from 'topojson-client'
import atlas from 'world-atlas/countries-50m.json'
import { countries, countryById, countryName, displayName, inArea, type Area } from '../data/countries'
import { useLang, useT } from '../i18n'
import { statusOf, useDirection, useProgress } from '../progress/progress'
import { citiesOf, cityName } from '../data/cities'
import { H, SAT_SCALE, W, makeProjection } from './projection'
import { renderDetail } from './satDetail'
import { SAT_CREDIT } from './satTiles'
import { setMapStyle, useMapStyle, type MapStyle } from './mapStyle'

// the 3D globe brings three.js (~600 KB), so it is only loaded when someone switches to it
const GlobeMap = lazy(() => import('./GlobeMap'))

const SAT_URL = `${import.meta.env.BASE_URL}satellite.jpg`
const MARKER_PX = 5 // marker radius in screen pixels
const TINY_AREA = 14 // polygons smaller than this (viewBox units²) also get a marker

// ---- Static geometry, computed once ----
const topo = atlas as any
export const allFeatures: any[] = (feature(topo, topo.objects.countries) as any).features.filter(
  (f: any) => f.id !== '010', // drop Antarctica to save space
)
const projection = makeProjection()
const pathGen = geoPath(projection)
const graticulePath = pathGen(geoGraticule10())!
const spherePath = pathGen({ type: 'Sphere' } as any)!

/** SVG path of any GeoJSON geometry in map coordinates (rivers, lakes, mountains on top of the map). */
export const geoPathD = (geometry: any) => pathGen(geometry) ?? ''

// Natural Earth polygons without a numeric id that belong to a country on our list.
// (Somaliland is internationally part of Somalia, Northern Cyprus part of Cyprus.)
const POLYGON_NAME_TO_COUNTRY: Record<string, string> = { Kosovo: 'XK', Somaliland: 'SO', 'N. Cyprus': 'CY' }

const byCcn3 = new Map(countries.filter((c) => c.ccn3).map((c) => [c.ccn3!, c.id]))
/** The country (on our list) a map polygon belongs to, or null (Antarctica, Western Sahara, ...). */
export const countryOfFeature = (f: any): string | null => (f.id && byCcn3.get(f.id)) || POLYGON_NAME_TO_COUNTRY[f.properties?.name] || null

interface Shape { key: string; d: string; countryId: string | null; minX: number }
interface Marker { id: string; x: number; y: number; area: number }

const shapes: Shape[] = []
const markers: Marker[] = []
/** Where a country's name label goes: centre of its largest piece (France: mainland, not French Guiana) + that piece's width. */
interface LabelSpot { x: number; y: number; w: number; area: number }
const labelSpots = new Map<string, LabelSpot>()
/** The pieces of each country (bounds + area), for zooming in on it. */
const pieces = new Map<string, { b: [[number, number], [number, number]]; area: number }[]>()
// Countries just west of the date line (Tonga, Samoa, ...) sit at the far LEFT edge of the map.
// For Oceania we draw that strip a second time at the RIGHT edge, so they appear next to Fiji and Kiribati.
const WRAP_STRIP = 0.12 * W
const hasPolygon = new Set<string>()
for (const f of allFeatures) {
  const countryId = countryOfFeature(f)
  const d = pathGen(f)
  if (!d) continue
  shapes.push({ key: f.id ?? f.properties?.name, d, countryId, minX: pathGen.bounds(f)[0][0] })
  if (countryId) {
    hasPolygon.add(countryId)
    const parts = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.map((coordinates: any) => ({ type: 'Polygon', coordinates })) : [f.geometry]
    for (const piece of parts) {
      const area = pathGen.area(piece)
      if (!pieces.has(countryId)) pieces.set(countryId, [])
      pieces.get(countryId)!.push({ b: pathGen.bounds(piece) as any, area })
      if (area <= (labelSpots.get(countryId)?.area ?? -1)) continue
      const [x, y] = pathGen.centroid(piece)
      const [[x0], [x1]] = pathGen.bounds(piece)
      labelSpots.set(countryId, { x, y, w: x1 - x0, area })
    }
    const area = pathGen.area(f)
    const isExtraPiece = !f.id && f.properties?.name !== 'Kosovo' // e.g. Somaliland, N. Cyprus
    if (area < TINY_AREA && !isExtraPiece && !markers.some((m) => m.id === countryId)) {
      const [x, y] = pathGen.centroid(f)
      markers.push({ id: countryId, x, y, area })
    }
  }
}
// Countries without any polygon (e.g. Tuvalu): place a marker from their coordinates.
for (const c of countries) {
  if (hasPolygon.has(c.id) || !c.latlng) continue
  const p = projection([c.latlng[1], c.latlng[0]])
  if (p) markers.push({ id: c.id, x: p[0], y: p[1], area: 0 })
  if (p) labelSpots.set(c.id, { x: p[0], y: p[1], w: 0, area: 0 })
}
// Oceania west of the date line is shown at the right edge (see WRAP_STRIP below)
for (const [id, sp] of labelSpots) {
  if (sp.x < 0.12 * W && countryById.get(id)?.continent === 'Oceania') sp.x += W
}

/** Countries too small to tap on the map (they get a dot); the globe uses the same list. */
export const tinyCountryIds = (): string[] => markers.map((m) => m.id)

const wrappedMarkers: Marker[] = markers
  .filter((m) => m.x < WRAP_STRIP && countryById.get(m.id)?.continent === 'Oceania')
  .map((m) => ({ ...m, x: m.x + W, id: m.id }))

/** Where the target reticle goes: the country's coordinates (more reliable than polygon centroids, e.g. France). */
function targetPoint(id: string): [number, number] | null {
  const c = countryById.get(id)
  if (c?.latlng) {
    const p = projection([c.latlng[1], c.latlng[0]])
    if (p) return [p[0], p[1]]
  }
  const m = markers.find((m) => m.id === id)
  return m ? [m.x, m.y] : null
}

/** Same, but Oceanian countries west of the date line are shown at the right edge of the map. */
function displayPoint(id: string): [number, number] | null {
  const p = targetPoint(id)
  if (p && p[0] < WRAP_STRIP && countryById.get(id)?.continent === 'Oceania') return [p[0] + W, p[1]]
  return p
}

/** [x0, y0, x1, y1] around a country: its bigger pieces (not every far-away island) and its cities. */
function countryBox(id: string): [number, number, number, number] | null {
  const ps = pieces.get(id) ?? []
  const biggest = Math.max(0, ...ps.map((p) => p.area))
  const xs: number[] = [], ys: number[] = []
  for (const p of ps) if (p.area >= biggest * 0.15) { xs.push(p.b[0][0], p.b[1][0]); ys.push(p.b[0][1], p.b[1][1]) }
  for (const c of citiesOf(id)) {
    const q = projection(c.at)
    if (q) { xs.push(q[0]); ys.push(q[1]) }
  }
  if (!xs.length) {
    const q = targetPoint(id)
    if (!q) return null
    xs.push(q[0]); ys.push(q[1])
  }
  let [x0, y0, x1, y1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  // tiny countries: show some surroundings
  const minSize = 14
  if (x1 - x0 < minSize) { const c = (x0 + x1) / 2; x0 = c - minSize / 2; x1 = c + minSize / 2 }
  if (y1 - y0 < minSize * 0.6) { const c = (y0 + y1) / 2; y0 = c - minSize * 0.3; y1 = c + minSize * 0.3 }
  if (x1 < WRAP_STRIP && countryById.get(id)?.continent === 'Oceania') { x0 += W; x1 += W }
  return [x0, y0, x1, y1]
}

// Where to zoom for each continent: [west, south, east, north] in degrees.
export const VIEW_BOX: Record<Area, [number, number, number, number]> = {
  'North Africa': [-18, 8, 40, 38],
  'West Africa': [-26, -4, 20, 28],
  'East Africa': [12, -13, 57, 19],
  'Southern Africa': [10, -36, 59, 4],
  Europe: [-25, 34, 45, 72],
  Asia: [25, -11, 180, 78],
  Africa: [-26, -36, 52, 38], // west edge: Cape Verde
  'North America': [-168, 7, -12, 84],
  'South America': [-82, -56, -34, 13],
  Oceania: [110, -48, 180, 22],
}

/** The visible area in viewBox units, minus space reserved for panels floating over the map. */
interface Box { w: number; h: number; left: number; right: number; top: number; bottom: number }

/** Zoom/pan so the continent (or the whole world, or one country) fills the free part of the box. */
function transformFor(continent: Area | null, box: Box, fitBox?: [number, number, number, number] | null, country?: string | null): ZoomTransform {
  let x0 = 0, y0 = 0, x1 = W, y1 = H
  let pad = 0.98
  const cb = country ? countryBox(country) : null
  if (cb) {
    ;[x0, y0, x1, y1] = cb
    pad = 0.45 // the country in the middle, its neighbours around it
  } else if (continent) {
    // fitBox only ever widens the continent's usual view
    const v = VIEW_BOX[continent]
    const f = fitBox ?? v
    const [w, s, e, n] = [Math.min(v[0], f[0]), Math.min(v[1], f[1]), Math.max(v[2], f[2]), Math.max(v[3], f[3])]
    ;[x0, y0] = projection([w, n])!
    ;[x1, y1] = projection([e, s])!
    if (continent === 'Oceania') x1 += W * 0.09 // include the wrapped strip with Tonga, Samoa, ...
    pad = 0.92
  }
  const aw = box.w - box.left - box.right
  const ah = box.h - box.top - box.bottom
  let k = Math.min(aw / Math.abs(x1 - x0), ah / Math.abs(y1 - y0)) * pad
  // a country: not closer than 5x the continent view (tiny countries would fill the screen)
  if (cb) k = Math.min(k, transformFor(continent, box, fitBox).k * 5)
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  return zoomIdentity.translate(box.left + aw / 2 - k * cx, box.top + ah / 2 - k * cy).scale(k)
}

interface Props {
  /** the continent or region to zoom to (others are dimmed); null = whole world */
  continent: Area | null
  focusId: string | null
  onPickCountry: (id: string) => void
  /** fill = stretch to the parent's size (full-screen study view) instead of the fixed 960x500 shape */
  fill?: boolean
  /** pixels at the edges of the map that are covered by floating panels (the continent is fitted into the rest) */
  reserve?: { left?: number; right?: number; top?: number; bottom?: number }
  /** color class per country instead of the learning status (map quiz); changing `colorKey` re-renders the colors */
  classFor?: (id: string) => string
  colorKey?: string
  /** don't show country names as hover tooltips (they would give away the quiz answer) */
  hideNames?: boolean
  /** countries whose name is written on the map (map quiz: the ones already named) */
  labelIds?: string[]
  /** extra shapes drawn on top of the countries (use geoPathD for their paths) */
  overlay?: React.ReactNode
  /** [west, south, east, north] that must also be visible besides the continent (Nature tab: the Urals are in Europe) */
  fitBox?: [number, number, number, number] | null
  /** names written just above any [lon, lat] (Nature tab: the rivers and mountains named so far) */
  freeLabels?: { key: string; at: [number, number]; text: string; className?: string }[]
  /** [lon, lat] to mark with the target ring when no country is focused */
  targetLonLat?: [number, number] | null
  /** called with the focused country's position in screen pixels (relative to the map) whenever it moves */
  onTargetMove?: (p: { x: number; y: number } | null) => void
  /** show the biggest cities of this country (dots + names) */
  cities?: string | null
  /** zoom in on this country (back to the continent when it is null again) */
  zoomTo?: string | null
  /** this map may be shown as a 3D globe (when the globe look is chosen) */
  globe?: boolean
}
export type MapProps = Props

export default function WorldMap(props: Props) {
  const style = useMapStyle()
  if (props.globe && style === 'globe') {
    return <Suspense fallback={<div className="globe-wrap" />}><GlobeMap {...props} /></Suspense>
  }
  return <FlatMap {...props} />
}

/** Button that switches the map look: flat -> satellite (-> globe, where allowed) -> flat. Shows where it goes next. */
export function StyleButton({ globe = false }: { globe?: boolean }) {
  const t = useT()
  const style = useMapStyle()
  const shown: MapStyle = style === 'globe' && !globe ? 'satellite' : style
  const next: MapStyle = shown === 'flat' ? 'satellite' : shown === 'satellite' && globe ? 'globe' : 'flat'
  const label = { flat: t.flatView, satellite: t.satelliteView, globe: t.globeView }[next]
  return (
    <button className="map-btn style-btn" onClick={() => setMapStyle(next)} aria-label={label} title={label}>
      <span aria-hidden="true">{{ flat: '🗺️', satellite: '🛰️', globe: '🌍' }[next]}</span>
    </button>
  )
}

function FlatMap({ continent, focusId, onPickCountry, fill = false, reserve, classFor, colorKey, hideNames = false, onTargetMove, labelIds, overlay, targetLonLat, fitBox, freeLabels, cities, zoomTo, globe }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const markerRef = useRef<SVGGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const current = useRef<ZoomTransform>(zoomIdentity)
  const progressVersion = useProgress() // colors change after each review
  const direction = useDirection() // ... and when switching between country -> capital and capital -> country
  const lang = useLang()
  const t = useT()
  const style = useMapStyle()
  const sat = style === 'satellite' || style === 'globe' // (globe here = a map that can't be one)
  const satRef = useRef(sat)
  satRef.current = sat
  // sharp satellite picture of the visible area (satDetail.ts), redrawn after every zoom/pan
  const [detail, setDetail] = useState<{ href: string; x: number; y: number; w: number; h: number } | null>(null)
  const detailJob = useRef(0)
  const detailTimer = useRef<number | undefined>(undefined)
  function scheduleDetail() {
    clearTimeout(detailTimer.current)
    const job = ++detailJob.current
    detailTimer.current = window.setTimeout(async () => {
      const svg = svgRef.current
      if (!svg || !satRef.current || !svg.clientWidth) return setDetail(null)
      const t = current.current
      const { w: vw, h: vh } = vbRef.current
      const pxPerUnit = (svg.clientWidth / vw) * t.k // screen pixels per map unit
      if (pxPerUnit < SAT_SCALE * 1.3) return setDetail(null) // the normal picture is sharp enough
      // visible part of the map, in map units (only the part on the map)
      const x0 = Math.max(0, -t.x / t.k), y0 = Math.max(0, -t.y / t.k)
      const x1 = Math.min(W, (vw - t.x) / t.k), y1 = Math.min(H, (vh - t.y) / t.k)
      if (x1 <= x0 || y1 <= y0) return setDetail(null)
      const scale = pxPerUnit * Math.min(1.5, window.devicePixelRatio || 1)
      const canvas = await renderDetail([x0, y0, x1, y1], Math.round((x1 - x0) * scale), Math.round((y1 - y0) * scale), () => job !== detailJob.current)
      if (job !== detailJob.current || !canvas) return
      canvas.toBlob((blob) => {
        if (!blob || job !== detailJob.current) return
        setDetail((old) => {
          if (old) URL.revokeObjectURL(old.href)
          return { href: URL.createObjectURL(blob), x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
        })
      }, 'image/jpeg', 0.9)
    }, 250)
  }
  const scheduleDetailRef = useRef(scheduleDetail)
  scheduleDetailRef.current = scheduleDetail
  useEffect(() => { scheduleDetailRef.current() }, [sat])
  // free the last detail picture when the map goes away
  const detailRef = useRef(detail)
  detailRef.current = detail
  useEffect(() => () => { detailJob.current++; if (detailRef.current) URL.revokeObjectURL(detailRef.current.href) }, [])
  const dragged = useRef(false) // true right after a drag/pinch, so it is not treated as a tap
  // viewBox: fixed 960x500, or (fill mode) the same height with the width of the container's aspect ratio
  const [vb, setVb] = useState({ w: W, h: H })
  const vbRef = useRef(vb)
  vbRef.current = vb
  const reserveRef = useRef(reserve)
  const fitBoxRef = useRef(fitBox)
  fitBoxRef.current = fitBox
  reserveRef.current = reserve
  const reserveKey = JSON.stringify(reserve ?? {})
  const prevContinent = useRef<Area | null | undefined>(undefined)
  const prevZoomTo = useRef<string | null | undefined>(undefined)
  const onTargetMoveRef = useRef(onTargetMove)
  onTargetMoveRef.current = onTargetMove

  /** CSS classes of a country (polygon or marker). */
  const classOf = (id: string) => {
    const c = countryById.get(id)!
    return (classFor ? classFor(id) : `c-${statusOf(id)}`) + (continent && !inArea(c, continent) ? ' dim' : '') + (id === focusId ? ' focus' : '')
  }
  const tip = (id: string) => (hideNames ? null : <title>{displayName(countryById.get(id)!, lang)}</title>)

  /** Free area of the map in viewBox units. */
  function currentBox(): Box {
    const svg = svgRef.current
    const { w, h } = vbRef.current
    const u = svg && svg.clientHeight ? h / svg.clientHeight : 1 // viewBox units per screen pixel
    const r = reserveRef.current ?? {}
    return { w, h, left: (r.left ?? 0) * u, right: (r.right ?? 0) * u, top: (r.top ?? 0) * u, bottom: (r.bottom ?? 0) * u }
  }

  /** Position + size the markers and the reticle for the current zoom transform. */
  function updateMarkers() {
    const svg = svgRef.current
    const group = markerRef.current
    if (!svg || !group) return
    const t = current.current
    const pxPerUnit = (svg.clientWidth || W) / vbRef.current.w
    let targetPx: { x: number; y: number } | null = null
    const placed: [number, number, number, number][] = [] // city name boxes already shown (screen pixels)
    for (const el of Array.from(group.children) as SVGGElement[]) {
      const x = t.applyX(+el.dataset.x!)
      const y = t.applyY(+el.dataset.y!)
      if (el.classList.contains('city')) {
        // drawn in screen pixels; a name that would overlap one already shown is hidden (the dot stays)
        el.setAttribute('transform', `translate(${x},${y}) scale(${1 / pxPerUnit})`)
        const sx = x * pxPerUnit, sy = y * pxPerUnit
        const box: [number, number, number, number] = [sx + 6, sy - 8, sx + 10 + Number(el.dataset.tw), sy + 8]
        const free = !placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])
        if (free) placed.push(box)
        ;(el.querySelector('text') as SVGTextElement).style.display = free ? '' : 'none'
        continue
      }
      if (el.classList.contains('map-label')) {
        // drawn in screen pixels; only shown once the country is wide enough on screen for its name
        const screenW = Number(el.dataset.w) * t.k * pxPerUnit
        el.style.display = el.classList.contains('free') || screenW >= Number(el.dataset.tw) * 0.8 ? '' : 'none'
        el.setAttribute('transform', `translate(${x},${y}) scale(${1 / pxPerUnit})`)
        continue
      }
      if (el.classList.contains('reticle')) {
        el.setAttribute('transform', `translate(${x},${y}) scale(${1 / pxPerUnit})`) // drawn in screen pixels
        targetPx = { x: x * pxPerUnit, y: y * pxPerUnit }
        continue
      }
      const area = Number(el.dataset.area)
      const screenArea = area * t.k * t.k * pxPerUnit * pxPerUnit
      // once the polygon is big enough to tap, hide its marker (Tuvalu etc. with area 0 stay)
      el.style.display = area > 0 && screenArea > 120 ? 'none' : ''
      el.setAttribute('transform', `translate(${x},${y})`)
      el.querySelectorAll('circle').forEach((c) => c.setAttribute('r', String(MARKER_PX / pxPerUnit)))
    }
    onTargetMoveRef.current?.(targetPx)
  }

  // Fill mode: use the container's aspect ratio for the viewBox (measured before the first paint).
  function measure() {
    const svg = svgRef.current
    if (!fill || !svg || !svg.clientWidth || !svg.clientHeight) return
    const w = Math.round((H * svg.clientWidth) / svg.clientHeight)
    if (w !== vbRef.current.w) setVb({ w, h: H })
  }
  useLayoutEffect(measure, [fill])

  // Set up d3-zoom once.
  useEffect(() => {
    const svg = svgRef.current!
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 40])
      .translateExtent([[0, 0], [W, H]])
      .on('start', (e: D3ZoomEvent<SVGSVGElement, unknown>) => {
        if (e.sourceEvent) dragged.current = false
      })
      .on('zoom', (e: D3ZoomEvent<SVGSVGElement, unknown>) => {
        current.current = e.transform
        if (!gRef.current) return // the map was removed while an animation was still running
        gRef.current.setAttribute('transform', e.transform.toString())
        if (e.sourceEvent) dragged.current = true
        updateMarkers()
      })
      .on('end', (e: D3ZoomEvent<SVGSVGElement, unknown>) => {
        if (e.sourceEvent) setTimeout(() => (dragged.current = false), 60)
        scheduleDetailRef.current()
      })
    zoomRef.current = z
    select(svg).call(z)

    const ro = new ResizeObserver(() => { measure(); updateMarkers() })
    ro.observe(svg)
    updateMarkers()
    return () => {
      ro.disconnect()
      select(svg).interrupt().on('.zoom', null) // stop a running zoom animation
    }
  }, [])

  // Zoom to the selected continent (or the whole world). Re-fits when the window size changes.
  useEffect(() => {
    const svg = svgRef.current
    const z = zoomRef.current
    if (!svg || !z) return
    const k0 = Math.min(vb.w / W, vb.h / H) // zoom level at which the whole world fits
    z.scaleExtent([k0, k0 * 40]).translateExtent(fill ? [[-W * 0.6, -H * 0.6], [W * 1.6, H * 1.6]] : [[0, 0], [W, H]])
    const target = transformFor(continent, currentBox(), fitBoxRef.current, zoomTo)
    const animate = prevContinent.current !== undefined && (prevContinent.current !== continent || prevZoomTo.current !== (zoomTo ?? null))
    prevContinent.current = continent
    prevZoomTo.current = zoomTo ?? null
    const sel = select(svg).interrupt()
    if (animate) sel.transition().duration(800).call(z.transform, target)
    else sel.call(z.transform, target) // first paint or window resize: jump
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continent, vb.w, vb.h, fill, reserveKey, zoomTo])

  const paths = useMemo(
    () =>
      shapes.map((s) => {
        const c = s.countryId ? countryById.get(s.countryId) : undefined
        return (
          <path
            key={s.key}
            d={s.d}
            className={c ? 'land ' + classOf(c.id) : 'land other'}
            onClick={c ? () => !dragged.current && onPickCountry(c.id) : undefined}
          >
            {c && tip(c.id)}
          </path>
        )
      }),
    // progressVersion is not read inside, but statusOf() reads the store: re-render when progress changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [continent, focusId, onPickCountry, progressVersion, direction, colorKey, hideNames, lang],
  )

  const dots = useMemo(
    () =>
      markers.map((m) => {
        return (
          <g key={m.id} className={'marker ' + classOf(m.id)} data-x={m.x} data-y={m.y} data-area={m.area}
             onClick={() => !dragged.current && onPickCountry(m.id)}>
            <circle className="dot" r={MARKER_PX} />
            {tip(m.id)}
          </g>
        )
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [continent, focusId, onPickCountry, progressVersion, direction, colorKey, hideNames, lang],
  )

  const wrapped = useMemo(
    () =>
      shapes.filter((sh) => sh.minX < WRAP_STRIP).map((sh) => {
        const c = sh.countryId ? countryById.get(sh.countryId) : undefined
        return <path key={'w' + sh.key} d={sh.d} className={c ? 'land ' + classOf(c.id) : 'land other'} onClick={c ? () => !dragged.current && onPickCountry(c.id) : undefined} />
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [continent, focusId, onPickCountry, progressVersion, direction, colorKey],
  )
  const wrappedDots = useMemo(
    () =>
      wrappedMarkers.map((m) => {
        return (
          <g key={m.id + '@w'} className={'marker ' + classOf(m.id)} data-x={m.x} data-y={m.y} data-area={m.area} onClick={() => !dragged.current && onPickCountry(m.id)}>
            <circle className="dot" r={MARKER_PX} />
            {tip(m.id)}
          </g>
        )
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [continent, focusId, onPickCountry, progressVersion, direction, colorKey, hideNames, lang],
  )

  // the country whose cities are shown doesn't get its name too (it would sit between the cities)
  const labelList = (labelIds ?? []).filter((id) => id !== cities)
  const labelKey = labelList.join(',')
  const labels = useMemo(
    () =>
      labelList.map((id) => {
        const sp = labelSpots.get(id)
        const c = countryById.get(id)
        const name = c && countryName(c, lang)
        if (!sp || !name) return null
        return (
          <g key={'l' + id} className="map-label" data-x={sp.x} data-y={sp.y} data-w={sp.w} data-tw={name.length * 6.4 + 4} style={{ display: 'none' }}>
            <text>{name}</text>
          </g>
        )
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [labelKey, lang],
  )

  const lonLatPoint = targetLonLat ? projection(targetLonLat) : null
  // zoomed in on a country: it fills the view, the ring would only cover its cities
  const target = zoomTo ? null : focusId ? displayPoint(focusId) : lonLatPoint ? [lonLatPoint[0], lonLatPoint[1]] : null

  const freeKey = (freeLabels ?? []).map((l) => l.key + l.text + (l.className ?? '')).join('|')
  const free = useMemo(
    () =>
      (freeLabels ?? []).map((l) => {
        const p = projection(l.at)
        if (!p) return null
        return (
          <g key={'f' + l.key} className={'map-label free ' + (l.className ?? '')} data-x={p[0]} data-y={p[1]}>
            <text y={-15}>{l.text}</text>
          </g>
        )
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [freeKey],
  )

  const cityEls = useMemo(() => {
    if (!cities) return null
    const wrap = countryById.get(cities)?.continent === 'Oceania'
    // capital first, so its name wins when names would overlap
    return [...citiesOf(cities)].sort((a, b) => (b.cap ?? 0) - (a.cap ?? 0)).map((c, i) => {
      const p = projection(c.at)
      if (!p) return null
      const x = wrap && p[0] < WRAP_STRIP ? p[0] + W : p[0]
      const name = cityName(c, lang)
      return (
        <g key={cities + i} className={'city' + (c.cap ? ' cap' : '')} data-x={x} data-y={p[1]} data-tw={name.length * 6.6}>
          {c.cap ? <rect x={-4.5} y={-4.5} width={9} height={9} transform="rotate(45)" /> : <circle r={3.5} />}
          <text x={8}>{name}</text>
        </g>
      )
    })
  }, [cities, lang])

  // After re-render (new classes, labels, reticle) make sure everything keeps its position.
  useEffect(updateMarkers, [dots, wrappedDots, labels, free, target, cityEls])

  function zoomBy(factor: number) {
    if (!svgRef.current || !zoomRef.current) return
    select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, factor)
  }
  function resetView() {
    if (!svgRef.current || !zoomRef.current) return
    select(svgRef.current).transition().duration(600).call(zoomRef.current.transform, transformFor(continent, currentBox(), fitBoxRef.current, zoomTo))
  }

  return (
    <>
      <svg ref={svgRef} className={'world-map' + (fill ? ' fill' : '') + (sat ? ' sat' : '')} viewBox={`0 0 ${vb.w} ${vb.h}`} role="img" aria-label={t.worldMap}>
        <defs>
          <clipPath id="wrap-clip"><rect x="0" y="0" width={WRAP_STRIP} height={H} /></clipPath>
          <clipPath id="sphere-clip"><path d={spherePath} /></clipPath>
        </defs>
        <g ref={gRef}>
          <path className="sphere" d={spherePath} />
          {sat && <image className="sat-img" href={SAT_URL} x="0" y="0" width={W} height={H} preserveAspectRatio="none" clipPath="url(#sphere-clip)" />}
          {sat && detail && <image className="sat-img" href={detail.href} x={detail.x} y={detail.y} width={detail.w} height={detail.h} preserveAspectRatio="none" clipPath="url(#sphere-clip)" />}
          <path className="graticule" d={graticulePath} />
          {paths}
          <g transform={`translate(${W},0)`} clipPath="url(#wrap-clip)">
            {sat && <image className="sat-img" href={SAT_URL} x="0" y="0" width={W} height={H} preserveAspectRatio="none" />}
            {wrapped}
          </g>
          {overlay}
        </g>
        <g ref={markerRef}>
          {dots}
          {wrappedDots}
          {cityEls}
          {labels}
          {free}
          {target && (
            <g key={'reticle-' + (focusId ?? targetLonLat?.join(','))} className="reticle" data-x={target[0]} data-y={target[1]} data-area="0">
              <circle className="halo" r="16" />
              <circle className="ring" r="16" />
            </g>
          )}
        </g>
      </svg>
      <div className="zoom-btns">
        <button className="map-btn zoom-pm" onClick={() => zoomBy(1.7)} aria-label={t.zoomIn}>+</button>
        <button className="map-btn zoom-pm" onClick={() => zoomBy(1 / 1.7)} aria-label={t.zoomOut}>−</button>
        <button className="map-btn" onClick={resetView} aria-label={t.resetView}>⤢</button>
        <StyleButton globe={globe} />
      </div>
      {sat && <div className="sat-credit">{SAT_CREDIT}</div>}
    </>
  )
}
