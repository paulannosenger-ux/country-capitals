// The map projection, shared by the map (WorldMap) and scripts/fetch-satellite.ts,
// which bends the satellite photo into exactly the same shape.
import { geoNaturalEarth1 } from 'd3-geo'

export const W = 960
export const H = 500

// fit the whole globe outline (not just the land)
export const makeProjection = () => geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' } as any)

/** The satellite picture (public/satellite.jpg) covers the viewBox 0..W x 0..H at this many pixels per unit. */
export const SAT_SCALE = 5
