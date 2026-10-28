// Map look: the normal flat map, or the satellite photo (remembered in this browser, applies to every map).
import { useSyncExternalStore } from 'react'

export type MapStyle = 'flat' | 'satellite'

const KEY = 'country-capitals:mapstyle'
let style: MapStyle = (() => {
  try { return localStorage.getItem(KEY) === 'satellite' ? 'satellite' : 'flat' } catch { return 'flat' }
})()
const listeners = new Set<() => void>()
export function setMapStyle(s: MapStyle) {
  style = s
  try { localStorage.setItem(KEY, s) } catch { /* not remembered */ }
  listeners.forEach((fn) => fn())
}
export const getMapStyle = () => style
export const useMapStyle = () => useSyncExternalStore((fn) => { listeners.add(fn); return () => { listeners.delete(fn) } }, getMapStyle)
