import { describe, expect, it } from 'vitest'
import { Store } from './store'
import { emptyData, type AppData, type ProgressStorage } from './storage'

class MemoryStorage implements ProgressStorage {
  data: AppData | null = null
  load() { return this.data }
  save(d: AppData) { this.data = JSON.parse(JSON.stringify(d)) }
  clear() { this.data = null }
}

const DAY = 86_400_000
function setup() {
  const storage = new MemoryStorage()
  const clock = { t: new Date('2026-03-10T10:00:00').getTime() }
  const store = new Store(storage, () => clock.t)
  return { storage, clock, store }
}

describe('daily limits', () => {
  it('offers at most N new cards per day, then N more tomorrow', () => {
    const { store, clock } = setup()
    store.updateSettings({ newPerDay: 10 })
    expect(store.counts('Europe').new).toBe(10)
    const seen = new Set<string>()
    for (let i = 0; i < 10; i++) {
      const next = store.pickNext('Europe')!
      expect(next.kind).toBe('new')
      seen.add(next.id)
      store.review(next.id, 'easy') // graduates straight to a 4-day interval
    }
    expect(seen.size).toBe(10)
    expect(store.counts('Europe').new).toBe(0)
    expect(store.pickNext('Europe')).toBeNull()
    clock.t += DAY
    expect(store.counts('Europe').new).toBe(10)
    expect(store.pickNext('Europe')!.kind).toBe('new')
  })
  it('by default a whole continent can be played through in one go', () => {
    const { store } = setup()
    expect(store.counts('Europe').new).toBe(46)
    expect(store.counts('Africa').new).toBe(54)
    for (let i = 0; i < 46; i++) {
      const next = store.pickNext('Europe')!
      expect(next.kind).toBe('new')
      store.review(next.id, 'easy')
    }
    expect(store.counts('Europe').new).toBe(0)
  })
  it('old saves with the former default of 10 new cards get the new default', () => {
    const { storage, clock } = setup()
    storage.save({ ...emptyData(), settings: { newPerDay: 10, reviewsPerDay: 200 } })
    const store = new Store(storage, () => clock.t)
    expect(store.settings.newPerDay).toBe(250)
  })
  it('respects a changed setting', () => {
    const { store } = setup()
    store.updateSettings({ newPerDay: 3 })
    expect(store.counts(null).new).toBe(3)
  })
})

describe('queue order', () => {
  it('a card answered with Again comes back after 1 minute, before new cards', () => {
    const { store, clock } = setup()
    const first = store.pickNext('Africa')!
    store.review(first.id, 'again')
    // another new card is offered first (the failed card is not due yet)
    const second = store.pickNext('Africa')!
    expect(second.kind).toBe('new')
    expect(second.id).not.toBe(first.id)
    clock.t += 61_000
    expect(store.pickNext('Africa')).toEqual({ id: first.id, kind: 'learning' })
  })
  it('shows learning cards early (learn-ahead) when nothing else is left', () => {
    const { store } = setup()
    store.updateSettings({ newPerDay: 1 })
    const only = store.pickNext('Asia')!
    store.review(only.id, 'good') // 10 minute step
    expect(store.pickNext('Asia')).toEqual({ id: only.id, kind: 'learning' })
  })
  it('reviews become due on the right day', () => {
    const { store, clock } = setup()
    store.updateSettings({ newPerDay: 1 })
    const c = store.pickNext('Oceania')!
    store.review(c.id, 'easy') // 4 days
    expect(store.counts('Oceania').due).toBe(0)
    clock.t += 3 * DAY
    expect(store.counts('Oceania').due).toBe(0)
    clock.t += DAY
    expect(store.counts('Oceania')).toMatchObject({ due: 1 })
    expect(store.pickNext('Oceania')).toEqual({ id: c.id, kind: 'review' })
  })
  it('limits reviews per day', () => {
    const { store, clock } = setup()
    store.updateSettings({ newPerDay: 5, reviewsPerDay: 2 })
    for (let i = 0; i < 5; i++) store.review(store.pickNext('Europe')!.id, 'easy')
    clock.t += 5 * DAY
    expect(store.counts('Europe').due).toBe(2)
  })
})

describe('status + persistence', () => {
  it('maps cards to map colors', () => {
    const { store } = setup()
    store.updateSettings({ newPerDay: 3 })
    expect(store.status('AT')).toBe('new')
    store.review('AT', 'again')
    expect(store.status('AT')).toBe('learning')
    store.review('FR', 'easy') // review, interval 4 days
    expect(store.status('FR')).toBe('learning')
    expect(store.learned('Europe')).toBe(1)
    store.review('DE', 'easy')
    const c = store.card('DE')
    expect(c.state).toBe('review')
  })
  it('saves after every review and loads it back', () => {
    const { store, storage, clock } = setup()
    store.review('AT', 'good')
    const reloaded = new Store(storage, () => clock.t)
    expect(reloaded.card('AT').state).toBe('learning')
    expect(reloaded.log).toHaveLength(1)
  })
  it('exports, resets and imports again', () => {
    const { store } = setup()
    store.review('AT', 'easy')
    const backup = store.exportJson()
    store.reset()
    expect(store.card('AT').state).toBe('new')
    store.importJson(backup)
    expect(store.card('AT').state).toBe('review')
  })
  it('rejects files that are not backups', () => {
    const { store } = setup()
    expect(() => store.importJson('not json')).toThrow(/JSON/)
    expect(() => store.importJson('{"hello": 1}')).toThrow(/backup/)
    expect(() => store.importJson(JSON.stringify(emptyData()).replace('"version":1', '"version":99'))).toThrow(/backup/)
  })
})
