// The river / lake / mountain shapes (data/nature-geo.json, ~360 KB). Only imported by lazy-loaded parts
// (Nature tab, the map in quiz-duel questions), so the main app does not have to download them.
import { geoPathD } from '../map/WorldMap'
import geoRaw from '../../data/nature-geo.json'

export const GEO = geoRaw as unknown as Record<string, { geo: unknown; at: [number, number] }>

const pathCache = new Map<string, string>()
/** SVG path of an item in map coordinates (computed once). */
export function pathOf(id: string) {
  if (!pathCache.has(id)) pathCache.set(id, geoPathD(GEO[id].geo))
  return pathCache.get(id)!
}

/** [west, south, east, north] around the given items. */
export function boundsOf(ids: string[]): [number, number, number, number] {
  let w = 180, s = 90, e = -180, n = -90
  const visit = (c: unknown): void => {
    if (typeof (c as number[])[0] === 'number') {
      const [x, y] = c as number[]
      w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y)
    } else (c as unknown[]).forEach(visit)
  }
  for (const id of ids) visit((GEO[id].geo as { coordinates: unknown }).coordinates)
  return [w, s, e, n]
}
