// Small public API for the UI (map, home screen, study view) on top of the store.
import { useSyncExternalStore } from 'react'
import type { Area } from '../data/countries'
import { store, type Scope } from './store'

export { RATINGS, type Rating } from './scheduler'
export { store }
export type { Counts, CardKind } from './store'

/** Call once in a component: it re-renders whenever progress changes. Returns a change counter. */
export const useProgress = () => useSyncExternalStore(store.subscribe, store.getVersion)

export const statusOf = (countryId: string) => store.status(countryId)
export const learnedCount = (area: Area) => store.learned(area)
export const countsFor = (scope: Scope) => store.counts(scope)
/** Cards waiting today across all continents (reviews + learning). */
export const dueToday = () => {
  const c = store.counts(null)
  return c.due + c.learning
}
export const intervalLabels = (countryId: string) => store.previewLabels(countryId)
