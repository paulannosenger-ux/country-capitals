// Storage abstraction. Today: localStorage. Later: a cloud-sync implementation of the same interface.
import type { Card, CardState, Rating } from './scheduler'

export interface Settings {
  newPerDay: number // 250 is more than any continent has, i.e. "play the whole continent through"
  reviewsPerDay: number
  v?: number // settings version: 1 (missing) had a default of 10 new cards per day
}
export const DEFAULT_SETTINGS: Settings = { newPerDay: 250, reviewsPerDay: 500, v: 2 }

/** One answered card, kept for the stats page. t = timestamp, r = rating, s = state before answering. */
export interface LogEntry { t: number; id: string; r: Rating; s: CardState }

export interface AppData {
  version: 1
  settings: Settings
  cards: Record<string, Card> // by country id; cards never studied are simply absent
  daily: { day: number; newCount: number; reviewCount: number } // how much was done on `day`
  log: LogEntry[]
}

export const emptyData = (): AppData => ({
  version: 1, settings: { ...DEFAULT_SETTINGS }, cards: {}, daily: { day: 0, newCount: 0, reviewCount: 0 }, log: [],
})

export interface ProgressStorage {
  load(): AppData | null
  save(data: AppData): void
  clear(): void
}

/** Checks that something loaded from disk / an imported file really looks like AppData. */
export function parseAppData(value: unknown): AppData {
  const v = value as AppData
  if (!v || v.version !== 1 || typeof v.cards !== 'object' || !v.settings || !Array.isArray(v.log) || !v.daily) {
    throw new Error('This file does not look like a Countries & Capitals backup.')
  }
  // Old saves (no settings version) used 10 new cards/day as default -> switch them to the new default.
  const settings = v.settings.v ? { ...DEFAULT_SETTINGS, ...v.settings } : { ...DEFAULT_SETTINGS, ...v.settings, ...DEFAULT_SETTINGS }
  return {
    version: 1,
    settings,
    cards: v.cards,
    daily: v.daily,
    log: v.log,
  }
}

const KEY = 'country-capitals:v1'

export class LocalStorageProgress implements ProgressStorage {
  load(): AppData | null {
    try {
      const text = localStorage.getItem(KEY)
      return text ? parseAppData(JSON.parse(text)) : null
    } catch {
      return null // missing, blocked or corrupt -> start fresh
    }
  }
  save(data: AppData): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* storage full or blocked (private mode): the app keeps working, progress is just not saved */
    }
  }
  clear(): void {
    try {
      localStorage.removeItem(KEY)
    } catch { /* ignore */ }
  }
}
