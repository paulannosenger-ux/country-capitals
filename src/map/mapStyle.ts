// Map look: the normal flat map, the satellite photo, or the 3D globe (remembered in this browser, applies to every map;
// maps that can't be a globe, like the map quiz, show the satellite photo instead).
import { useSyncExternalStore } from 'react'

export type MapStyle = 'flat' | 'satellite' | 'globe'

const KEY = 'country-capitals:mapstyle'
let style: MapStyle = (() => {
  try {
    const saved = localStorage.getItem(KEY)
    return saved === 'satellite' || saved === 'globe' ? saved : 'flat'
  } catch { return 'flat' }
})()
const listeners = new Set<() => void>()
export function setMapStyle(s: MapStyle) {
  style = s
  try { localStorage.setItem(KEY, s) } catch { /* not remembered */ }
  listeners.forEach((fn) => fn())
}
export const getMapStyle = () => style
export const useMapStyle = () => useSyncExternalStore((fn) => { listeners.add(fn); return () => { listeners.delete(fn) } }, getMapStyle)
