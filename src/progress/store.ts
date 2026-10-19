// The progress "database": all cards, settings and the review log, plus the logic for
// "which card comes next" and the daily limits. React components subscribe to it.
import { countries, inArea, type Area } from '../data/countries'
import { dayNumber, formatInterval, newCard, schedule, type Card, type Rating } from './scheduler'
import { LocalStorageProgress, emptyData, parseAppData, type AppData, type ProgressStorage, type Settings } from './storage'

const LEARN_AHEAD_MIN = 20 // learning cards due within 20 minutes may be shown early when nothing else is left
const MASTERED_INTERVAL = 21 // days; Anki calls a card "mature" from 21 days

export type Scope = Area | null // a continent or a region (e.g. West Africa); null = all continents
export type CardKind = 'new' | 'learning' | 'review'
export interface Counts { new: number; learning: number; due: number }

class Store {
  private data: AppData
  private version = 0
  private listeners = new Set<() => void>()
  private storage: ProgressStorage
  private now: () => number
  constructor(storage: ProgressStorage, now: () => number = Date.now) {
    this.storage = storage
    this.now = now
    const loaded = storage.load()
    this.data = loaded ? parseAppData(loaded) : emptyData() // parseAppData also upgrades old saves
  }

  // ---- React glue ----
  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
  getVersion = () => this.version
  private commit() {
    this.version++
    this.storage.save(this.data)
    this.listeners.forEach((fn) => fn())
  }

  // ---- reading ----
  get settings(): Settings { return this.data.settings }
  get log() { return this.data.log }
  card(id: string): Card { return this.data.cards[id] ?? newCard() }

  /** What the study map shows: new / learning / mastered. */
  status(id: string): 'new' | 'learning' | 'mastered' {
    const c = this.data.cards[id]
    if (!c || c.state === 'new') return 'new'
    return c.state === 'review' && c.interval >= MASTERED_INTERVAL ? 'mastered' : 'learning'
  }
  /** "Learned" = graduated from the learning steps at least once. */
  learned(scope: Scope): number {
    return this.inScope(scope).filter((id) => this.data.cards[id]?.state === 'review').length
  }
  private inScope(scope: Scope): string[] {
    return countries.filter((c) => inArea(c, scope)).map((c) => c.id)
  }
  private daily() {
    const day = dayNumber(this.now())
    return this.data.daily.day === day ? this.data.daily : { day, newCount: 0, reviewCount: 0 }
  }

  /** The New / Learning / Due numbers (like Anki), respecting today's limits. */
  counts(scope: Scope): Counts {
    const now = this.now()
    const today = dayNumber(now)
    const d = this.daily()
    let newAvail = 0, learning = 0, due = 0
    for (const id of this.inScope(scope)) {
      const c = this.card(id)
      if (c.state === 'new') newAvail++
      else if (c.state === 'review') { if (c.dueDay <= today) due++ }
      else if (c.dueAt <= now + LEARN_AHEAD_MIN * 60_000) learning++
    }
    return {
      new: Math.min(newAvail, Math.max(0, this.settings.newPerDay - d.newCount)),
      learning,
      due: Math.min(due, Math.max(0, this.settings.reviewsPerDay - d.reviewCount)),
    }
  }

  /** Which card to show next, or null when everything is done for now. */
  pickNext(scope: Scope): { id: string; kind: CardKind } | null {
    const now = this.now()
    const today = dayNumber(now)
    const d = this.daily()
    const ids = this.inScope(scope)
    const random = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
    const learningCards = ids.filter((id) => ['learning', 'relearning'].includes(this.card(id).state))
    const byDue = (a: string, b: string) => this.card(a).dueAt - this.card(b).dueAt

    // 1. learning cards whose wait is over
    const learningDue = learningCards.filter((id) => this.card(id).dueAt <= now).sort(byDue)
    if (learningDue.length) return { id: learningDue[0], kind: 'learning' }
    // 2. reviews due today
    if (d.reviewCount < this.settings.reviewsPerDay) {
      const dueReviews = ids.filter((id) => this.card(id).state === 'review' && this.card(id).dueDay <= today)
      if (dueReviews.length) return { id: random(dueReviews), kind: 'review' }
    }
    // 3. new cards, up to the daily limit
    if (d.newCount < this.settings.newPerDay) {
      const fresh = ids.filter((id) => this.card(id).state === 'new')
      if (fresh.length) return { id: random(fresh), kind: 'new' }
    }
    // 4. nothing else: show learning cards that are due within the next 20 minutes
    const soon = learningCards.filter((id) => this.card(id).dueAt <= now + LEARN_AHEAD_MIN * 60_000).sort(byDue)
    if (soon.length) return { id: soon[0], kind: 'learning' }
    return null
  }

  /** Minutes until the next learning card is due (for the "come back later" message). */
  minutesUntilNextLearning(scope: Scope): number | null {
    const now = this.now()
    const times = this.inScope(scope).map((id) => this.card(id)).filter((c) => c.state === 'learning' || c.state === 'relearning').map((c) => c.dueAt)
    return times.length ? Math.max(0, Math.ceil((Math.min(...times) - now) / 60_000)) : null
  }

  /** Button labels for a card: what interval each rating would give. */
  previewLabels(id: string): Record<Rating, string> {
    const now = this.now()
    const c = this.card(id)
    const label = (r: Rating) => formatInterval(schedule(c, r, now), now)
    return { again: label('again'), hard: label('hard'), good: label('good'), easy: label('easy') }
  }

  // ---- writing ----
  review(id: string, rating: Rating): void {
    const now = this.now()
    const before = this.card(id)
    const d = { ...this.daily() }
    if (before.state === 'new') d.newCount++
    if (before.state === 'review') d.reviewCount++
    this.data = {
      ...this.data,
      cards: { ...this.data.cards, [id]: schedule(before, rating, now) },
      daily: d,
      log: [...this.data.log, { t: now, id, r: rating, s: before.state }],
    }
    this.commit()
  }

  updateSettings(patch: Partial<Settings>): void {
    this.data = { ...this.data, settings: { ...this.data.settings, ...patch } }
    this.commit()
  }

  exportJson(): string {
    return JSON.stringify({ ...this.data, exportedAt: new Date(this.now()).toISOString() }, null, 1)
  }
  /** Throws a readable Error if the text is not a valid backup. */
  importJson(text: string): void {
    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { throw new Error('This file is not valid JSON.') }
    this.data = parseAppData(parsed)
    this.commit()
  }
  /** The whole progress, e.g. to upload it to the account. */
  snapshot(): AppData { return this.data }
  /** Replaces the progress (e.g. after merging it with the account). */
  replace(data: AppData): void {
    this.data = parseAppData(data)
    this.commit()
  }
  reset(): void {
    this.storage.clear()
    this.data = emptyData()
    this.commit()
  }
}

export const store = new Store(new LocalStorageProgress())
export { Store }
