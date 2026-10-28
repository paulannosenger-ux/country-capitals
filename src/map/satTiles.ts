// Sharp satellite pictures for zooming in: Esri World Imagery map tiles (free with attribution,
// Web Mercator, 256 px, zoom levels 0-19). The globe loads them directly; the flat map bends them into its
// own projection (satDetail.ts).
export const SAT_TILE_URL = (x: number, y: number, z: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`

/** Shown on the map whenever these tiles are visible. */
export const SAT_CREDIT = 'Imagery © Esri, Maxar, Earthstar Geographics · NASA Blue Marble'
