// Small public API for the UI (map, home screen, study view) on top of the store.
import { useSyncExternalStore } from 'react'
import type { Area } from '../data/countries'
import { store, type Direction, type Scope } from './store'

export { RATINGS, type Rating } from './scheduler'
export { store }
export type { Counts, CardKind, Direction } from './store'

/** Call once in a component: it re-renders whenever progress changes. Returns a change counter. */
export const useProgress = () => useSyncExternalStore(store.subscribe, store.getVersion)

// ---- which way round the flashcards are asked (remembered in this browser, like the language) ----
const DIR_KEY = 'country-capitals:direction'
let direction: Direction = (() => {
  try { return localStorage.getItem(DIR_KEY) === 'country' ? 'country' : 'capital' } catch { return 'capital' }
})()
const dirListeners = new Set<() => void>()
export function setDirection(d: Direction) {
  direction = d
  try { localStorage.setItem(DIR_KEY, d) } catch { /* not remembered */ }
  dirListeners.forEach((fn) => fn())
}
export const getDirection = () => direction
export const useDirection = () => useSyncExternalStore((fn) => { dirListeners.add(fn); return () => { dirListeners.delete(fn) } }, getDirection)

// These follow the chosen direction (map colors, home screen numbers, study session).
export const statusOf = (countryId: string) => store.status(countryId, direction)
export const learnedCount = (area: Area) => store.learned(area, direction)
export const countsFor = (scope: Scope) => store.counts(scope, direction)
/** Cards waiting today across all continents (reviews + learning). */
export const dueToday = () => {
  const c = store.counts(null, direction)
  return c.due + c.learning
}
export const intervalLabels = (countryId: string) => store.previewLabels(countryId, direction)
