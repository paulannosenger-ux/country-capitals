import { describe, expect, it } from 'vitest'
import { Store } from './store'
import { computeStats } from './stats'
import type { AppData, ProgressStorage } from './storage'

class Mem implements ProgressStorage {
  d: AppData | null = null
  load() { return this.d }
  save(d: AppData) { this.d = d }
  clear() { this.d = null }
}
const DAY = 86_400_000

describe('computeStats', () => {
  it('is all zero for a new user', () => {
    const s = computeStats(new Store(new Mem(), () => 1e12), 1e12)
    expect(s).toMatchObject({ learned: 0, mastered: 0, retention: null, streak: 0, reviewsToday: 0, total: 198 })
    expect(s.last14).toHaveLength(14)
  })
  it('counts streaks, retention and per-continent progress', () => {
    const clock = { t: new Date('2026-03-10T12:00:00').getTime() }
    const store = new Store(new Mem(), () => clock.t)
    store.updateSettings({ newPerDay: 50 })
    store.review('AT', 'easy') // day 1: new -> review (4d)
    clock.t += DAY
    store.review('FR', 'easy') // day 2
    clock.t += DAY
    store.review('DE', 'easy') // day 3
    clock.t += DAY // day 4: AT reviewed (due after 4d? it is due on day 5, review anyway), then forget it
    store.review('AT', 'again')
    clock.t += 2 * DAY // day 6: gap
    store.review('IT', 'easy')
    const s = computeStats(store, clock.t)
    expect(s.streak).toBe(1) // only today (day 6); day 5 had nothing
    expect(s.longestStreak).toBe(4)
    expect(s.reviewsToday).toBe(1)
    expect(s.totalReviews).toBe(5)
    expect(s.retention).toBe(0) // the only answer on a review-state card was "Again"
    expect(s.retentionSample).toBe(1)
    const europe = s.perContinent.find((c) => c.continent === 'Europe')!
    expect(europe.learned).toBe(3) // FR, DE, IT graduated; AT is relearning
    expect(europe.learning).toBeGreaterThanOrEqual(1)
    expect(s.last14.at(-1)!.count).toBe(1)
  })
  it('keeps the streak alive if you have not studied yet today', () => {
    const clock = { t: new Date('2026-03-10T12:00:00').getTime() }
    const store = new Store(new Mem(), () => clock.t)
    store.review('AT', 'good')
    clock.t += DAY
    expect(computeStats(store, clock.t).streak).toBe(1)
    clock.t += DAY
    expect(computeStats(store, clock.t).streak).toBe(0)
  })
})
