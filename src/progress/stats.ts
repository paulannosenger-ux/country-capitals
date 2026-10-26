// Numbers for the stats page, computed from the store (cards + review log).
import { CONTINENTS, countries, countriesIn, type Continent } from '../data/countries'
import { dayNumber } from './scheduler'
import type { Direction, Store } from './store'

export interface ContinentStats { continent: Continent; total: number; new: number; learning: number; mastered: number; learned: number }
export interface Stats {
  total: number
  learned: number // graduated from the learning steps
  mastered: number // interval >= 21 days
  retention: number | null // % of review-card answers that were not "Again"
  retentionSample: number
  streak: number // consecutive days with at least one review (today counts if you already studied)
  longestStreak: number
  reviewsToday: number
  totalReviews: number
  last14: { day: number; count: number }[] // oldest first, last entry = today
  perContinent: ContinentStats[]
}

/** `dir`: which deck the learned/mastered numbers are about (streak and reviews count both). */
export function computeStats(store: Store, now: number, dir: Direction = 'capital'): Stats {
  const today = dayNumber(now)
  const perDay = new Map<number, number>()
  let reviewAnswers = 0
  let reviewRemembered = 0
  for (const e of store.log) {
    const d = dayNumber(e.t)
    perDay.set(d, (perDay.get(d) ?? 0) + 1)
    if (e.s === 'review') {
      reviewAnswers++
      if (e.r !== 'again') reviewRemembered++
    }
  }

  // streak: walk back from today (or yesterday, if nothing was studied yet today)
  let streak = 0
  for (let d = perDay.has(today) ? today : today - 1; perDay.has(d); d--) streak++
  // longest streak ever
  let longest = 0
  let run = 0
  const days = [...perDay.keys()].sort((a, b) => a - b)
  days.forEach((d, i) => {
    run = i > 0 && days[i - 1] === d - 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  })

  const perContinent = CONTINENTS.map((continent) => {
    const list = countriesIn(continent)
    const count = (s: string) => list.filter((c) => store.status(c.id, dir) === s).length
    return { continent, total: list.length, new: count('new'), learning: count('learning'), mastered: count('mastered'), learned: store.learned(continent, dir) }
  })

  return {
    total: countries.length,
    learned: perContinent.reduce((n, c) => n + c.learned, 0),
    mastered: perContinent.reduce((n, c) => n + c.mastered, 0),
    retention: reviewAnswers ? Math.round((reviewRemembered / reviewAnswers) * 100) : null,
    retentionSample: reviewAnswers,
    streak,
    longestStreak: longest,
    reviewsToday: perDay.get(today) ?? 0,
    totalReviews: store.log.length,
    last14: Array.from({ length: 14 }, (_, i) => ({ day: today - 13 + i, count: perDay.get(today - 13 + i) ?? 0 })),
    perContinent,
  }
}
