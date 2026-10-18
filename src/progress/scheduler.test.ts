import { describe, expect, it } from 'vitest'
import { dayNumber, formatInterval, newCard, schedule, type Card } from './scheduler'

const NOW = new Date('2026-03-10T12:00:00').getTime()
const MIN = 60_000
const DAY = 86_400_000

const review = (over: Partial<Card> = {}): Card => ({
  ...newCard(), state: 'review', interval: 10, ease: 2.5, dueDay: dayNumber(NOW), ...over,
})

describe('new / learning cards', () => {
  it('Good moves through the 1m and 10m steps, then graduates to 1 day', () => {
    let c = schedule(newCard(), 'good', NOW)
    expect(c.state).toBe('learning')
    expect(c.dueAt).toBe(NOW + 10 * MIN)
    c = schedule(c, 'good', NOW + 10 * MIN)
    expect(c.state).toBe('review')
    expect(c.interval).toBe(1)
    expect(c.dueDay).toBe(dayNumber(NOW) + 1)
  })
  it('Again restarts at the first step (1 minute)', () => {
    const c = schedule(schedule(newCard(), 'good', NOW), 'again', NOW)
    expect(c.step).toBe(0)
    expect(c.dueAt).toBe(NOW + 1 * MIN)
  })
  it('Hard on the first step waits 5.5 minutes; Easy graduates to 4 days', () => {
    expect(schedule(newCard(), 'hard', NOW).dueAt).toBe(NOW + 5.5 * MIN)
    const easy = schedule(newCard(), 'easy', NOW)
    expect(easy.state).toBe('review')
    expect(easy.interval).toBe(4)
  })
  it('shows button labels like Anki', () => {
    const c = newCard()
    expect(['again', 'hard', 'good', 'easy'].map((r) => formatInterval(schedule(c, r as any, NOW), NOW))).toEqual(['1m', '6m', '10m', '4d'])
  })
})

describe('review cards', () => {
  it('multiplies the interval: hard x1.2, good x ease, easy x ease x1.3', () => {
    expect(schedule(review(), 'hard', NOW).interval).toBe(12)
    expect(schedule(review(), 'good', NOW).interval).toBe(25)
    expect(schedule(review(), 'easy', NOW).interval).toBe(33)
  })
  it('changes the ease factor: -0.15 hard, -0.2 again, +0.15 easy, never below 1.3', () => {
    expect(schedule(review(), 'hard', NOW).ease).toBeCloseTo(2.35)
    expect(schedule(review(), 'again', NOW).ease).toBeCloseTo(2.3)
    expect(schedule(review(), 'easy', NOW).ease).toBeCloseTo(2.65)
    expect(schedule(review({ ease: 1.35 }), 'again', NOW).ease).toBe(1.3)
  })
  it('a lapse goes to relearning with a 10 minute step and counts the lapse', () => {
    const c = schedule(review(), 'again', NOW)
    expect(c.state).toBe('relearning')
    expect(c.lapses).toBe(1)
    expect(c.dueAt).toBe(NOW + 10 * MIN)
    expect(c.interval).toBe(1)
    const back = schedule(c, 'good', NOW + 10 * MIN)
    expect(back.state).toBe('review')
    expect(back.interval).toBe(1)
  })
  it('a late review earns a bonus', () => {
    // 4 days overdue: good = (10 + 4/2) * 2.5 = 30
    expect(schedule(review({ dueDay: dayNumber(NOW) - 4 }), 'good', NOW).interval).toBe(30)
  })
  it('keeps the order again < hard < good < easy even for tiny intervals', () => {
    const c = review({ interval: 1 })
    const [h, g, e] = (['hard', 'good', 'easy'] as const).map((r) => schedule(c, r, NOW).interval)
    expect(h).toBeLessThan(g)
    expect(g).toBeLessThan(e)
  })
})

describe('day numbers', () => {
  it('roll over at 4 am', () => {
    const d = (s: string) => dayNumber(new Date(s).getTime())
    expect(d('2026-03-10T03:59:00')).toBe(d('2026-03-09T23:00:00'))
    expect(d('2026-03-10T04:01:00')).toBe(d('2026-03-09T23:00:00') + 1)
    expect(dayNumber(NOW + DAY)).toBe(dayNumber(NOW) + 1)
  })
})
