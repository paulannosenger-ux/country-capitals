// Interactive SVG world map (Natural Earth 50m via world-atlas).
// - Pan/zoom with mouse wheel, drag, touch and pinch (d3-zoom) + zoom buttons.
// - Countries are colored by learning status; other continents are dimmed.
// - Tiny countries (and Tuvalu, which has no polygon) get a circle marker.
// - The focused country gets a highlight ring.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo'
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'
import { select } from 'd3-selection'
import 'd3-transition'
import { feature } from 'topojson-client'
import atlas from 'world-atlas/countries-50m.json'
import { countries, countryById, countryName, displayName, inArea, type Area } from '../data/countries'
import { useLang, useT } from '../i18n'
import { statusOf, useDirection, useProgress } from '../progress/progress'

const W = 960
const H = 500
const MARKER_PX = 5 // marker radius in screen pixels
const TINY_AREA = 14 // polygons smaller than this (viewBox units²) also get a marker

// ---- Static geometry, computed once ----
const topo = atlas as any
const allFeatures: any[] = (feature(topo, topo.objects.countries) as any).features.filter(
  (f: any) => f.id !== '010', // drop Antarctica to save space
)
// fit the whole globe outline (not just the land) so the hologram frame is never cut off
const projection = geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' } as any)
const pathGen = geoPath(projection)
const graticulePath = pathGen(geoGraticule10())!
const spherePath = pathGen({ type: 'Sphere' } as any)!

// Natural Earth polygons without a numeric id that belong to a country on our list.
// (Somaliland is internationally part of Somalia, Northern Cyprus part of Cyprus.)
const POLYGON_NAME_TO_COUNTRY: Record<string, string> = { Kosovo: 'XK', Somaliland: 'SO', 'N. Cyprus': 'CY' }

const byCcn3 = new Map(countries.filter((c) => c.ccn3).map((c) => [c.ccn3!, c.id]))

interface Shape { key: string; d: string; countryId: string | null; minX: number }
interface Marker { id: string; x: number; y: number; area: number }

const shapes: Shape[] = []
const markers: Marker[] = []
/** Where a country's name label goes: centre of its largest piece (France: mainland, not French Guiana) + that piece's width. */
interface LabelSpot { x: number; y: number; w: number; area: number }
const labelSpots = new Map<string, LabelSpot>()
// Countries just west of the date line (Tonga, Samoa, ...) sit at the far LEFT edge of the map.
// For Oceania we draw that strip a second time at the RIGHT edge, so they appear next to Fiji and Kiribati.
const WRAP_STRIP = 0.12 * W
const hasPolygon = new Set<string>()
for (const f of allFeatures) {
  const countryId = (f.id && byCcn3.get(f.id)) || POLYGON_NAME_TO_COUNTRY[f.properties?.name] || null
  const d = pathGen(f)
  if (!d) continue
  shapes.push({ key: f.id ?? f.properties?.name, d, countryId, minX: pathGen.bounds(f)[0][0] })
  if (countryId) {
    hasPolygon.add(countryId)
    const pieces = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.map((coordinates: any) => ({ type: 'Polygon', coordinates })) : [f.geometry]
    for (const piece of pieces) {
      const area = pathGen.area(piece)
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

// Where to zoom for each continent: [west, south, east, north] in degrees.
const VIEW_BOX: Record<Area, [number, number, number, number]> = {
  'North Africa': [-18, 8, 40, 38],
  'West Africa': [-26, -4, 20, 28],
  'East Africa': [12, -13, 57, 19],
  'Southern Africa': [10, -36, 59, 4],
  Europe: [-25, 34, 45, 72],
  Asia: [25, -11, 180, 78],
  Africa: [-20, -36, 52, 38],
  'North America': [-168, 7, -12, 84],
  'South America': [-82, -56, -34, 13],
  Oceania: [110, -48, 180, 22],
}

/** The visible area in viewBox units, minus space reserved for panels floating over the map. */
interface Box { w: number; h: number; left: number; right: number; top: number; bottom: number }

/** Zoom/pan so the continent (or the whole world) fills the free part of the box. */
function transformFor(continent: Area | null, box: Box): ZoomTransform {
  let x0 = 0, y0 = 0, x1 = W, y1 = H
  let pad = 0.98
  if (continent) {
    const [w, s, e, n] = VIEW_BOX[continent]
    ;[x0, y0] = projection([w, n])!
    ;[x1, y1] = projection([e, s])!
    if (continent === 'Oceania') x1 += W * 0.09 // include the wrapped strip with Tonga, Samoa, ...
    pad = 0.92
  }
  const aw = box.w - box.left - box.right
  const ah = box.h - box.top - box.bottom
  const k = Math.min(aw / Math.abs(x1 - x0), ah / Math.abs(y1 - y0)) * pad
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
  /** called with the focused country's position in screen pixels (relative to the map) whenever it moves */
  onTargetMove?: (p: { x: number; y: number } | null) => void
}

export default function WorldMap({ continent, focusId, onPickCountry, fill = false, reserve, classFor, colorKey, hideNames = false, onTargetMove, labelIds }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const markerRef = useRef<SVGGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const current = useRef<ZoomTransform>(zoomIdentity)
  const progressVersion = useProgress() // colors change after each review
  const direction = useDirection() // ... and when switching between country -> capital and capital -> country
  const lang = useLang()
  const t = useT()
  const dragged = useRef(false) // true right after a drag/pinch, so it is not treated as a tap
  // viewBox: fixed 960x500, or (fill mode) the same height with the width of the container's aspect ratio
  const [vb, setVb] = useState({ w: W, h: H })
  const vbRef = useRef(vb)
  vbRef.current = vb
  const reserveRef = useRef(reserve)
  reserveRef.current = reserve
  const reserveKey = JSON.stringify(reserve ?? {})
  const prevContinent = useRef<Area | null | undefined>(undefined)
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
    for (const el of Array.from(group.children) as SVGGElement[]) {
      const x = t.applyX(+el.dataset.x!)
      const y = t.applyY(+el.dataset.y!)
      if (el.classList.contains('map-label')) {
        // drawn in screen pixels; only shown once the country is wide enough on screen for its name
        const screenW = Number(el.dataset.w) * t.k * pxPerUnit
        el.style.display = screenW >= Number(el.dataset.tw) * 0.8 ? '' : 'none'
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
    const target = transformFor(continent, currentBox())
    const animate = prevContinent.current !== undefined && prevContinent.current !== continent
    prevContinent.current = continent
    const sel = select(svg).interrupt()
    if (animate) sel.transition().duration(800).call(z.transform, target)
    else sel.call(z.transform, target) // first paint or window resize: jump
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continent, vb.w, vb.h, fill, reserveKey])

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

  const labelKey = (labelIds ?? []).join(',')
  const labels = useMemo(
    () =>
      (labelIds ?? []).map((id) => {
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

  const target = focusId ? displayPoint(focusId) : null

  // After re-render (new classes, labels, reticle) make sure everything keeps its position.
  useEffect(updateMarkers, [dots, wrappedDots, labels, target])

  function zoomBy(factor: number) {
    if (!svgRef.current || !zoomRef.current) return
    select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, factor)
  }
  function resetView() {
    if (!svgRef.current || !zoomRef.current) return
    select(svgRef.current).transition().duration(600).call(zoomRef.current.transform, transformFor(continent, currentBox()))
  }

  return (
    <>
      <svg ref={svgRef} className={'world-map' + (fill ? ' fill' : '')} viewBox={`0 0 ${vb.w} ${vb.h}`} role="img" aria-label={t.worldMap}>
        <defs>
          <clipPath id="wrap-clip"><rect x="0" y="0" width={WRAP_STRIP} height={H} /></clipPath>
        </defs>
        <g ref={gRef}>
          <path className="sphere" d={spherePath} />
          <path className="graticule" d={graticulePath} />
          {paths}
          <g transform={`translate(${W},0)`} clipPath="url(#wrap-clip)">{wrapped}</g>
        </g>
        <g ref={markerRef}>
          {dots}
          {wrappedDots}
          {labels}
          {target && (
            <g key={'reticle-' + focusId} className="reticle" data-x={target[0]} data-y={target[1]} data-area="0">
              <circle className="halo" r="16" />
              <circle className="ring" r="16" />
            </g>
          )}
        </g>
      </svg>
      <div className="zoom-btns">
        <button className="map-btn" onClick={() => zoomBy(1.7)} aria-label={t.zoomIn}>+</button>
        <button className="map-btn" onClick={() => zoomBy(1 / 1.7)} aria-label={t.zoomOut}>−</button>
        <button className="map-btn" onClick={resetView} aria-label={t.resetView}>⤢</button>
      </div>
    </>
  )
}
