// Anki-style spaced repetition (SM-2 variant, modelled on Anki's classic "v2" scheduler).
//
// A card moves through these states:
//   new -> learning (short steps: 1 min, 10 min) -> review (days, weeks, months ...)
//   review --Again--> relearning (short step: 10 min) -> review (with a much shorter interval)
//
// This file is pure logic (no browser, no storage), so it is easy to test.

export type Rating = 'again' | 'hard' | 'good' | 'easy'
export const RATINGS: Rating[] = ['again', 'hard', 'good', 'easy']

export type CardState = 'new' | 'learning' | 'review' | 'relearning'

export interface Card {
  state: CardState
  step: number // index into the learning/relearning steps
  dueAt: number // ms timestamp; used while learning/relearning
  dueDay: number // day number; used for review cards
  interval: number // days (review cards)
  ease: number // growth factor of the interval, e.g. 2.5
  reps: number
  lapses: number
}

export interface SchedulerConfig {
  learningSteps: number[] // minutes
  relearningSteps: number[] // minutes
  graduatingInterval: number // days, after finishing the learning steps with "Good"
  easyInterval: number // days, when pressing "Easy" on a learning card
  startingEase: number
  easyBonus: number
  hardFactor: number
  intervalModifier: number
  lapseInterval: number // fraction of the old interval kept after a lapse (Anki default 0 -> back to minimum)
  minInterval: number
  maxInterval: number
}

export const DEFAULT_CONFIG: SchedulerConfig = {
  learningSteps: [1, 10],
  relearningSteps: [10],
  graduatingInterval: 1,
  easyInterval: 4,
  startingEase: 2.5,
  easyBonus: 1.3,
  hardFactor: 1.2,
  intervalModifier: 1,
  lapseInterval: 0,
  minInterval: 1,
  maxInterval: 36500,
}

const MIN_EASE = 1.3
const MINUTE = 60_000

export const newCard = (cfg = DEFAULT_CONFIG): Card => ({
  state: 'new', step: 0, dueAt: 0, dueDay: 0, interval: 0, ease: cfg.startingEase, reps: 0, lapses: 0,
})

/** Day number in local time; the day rolls over at 4 am like in Anki (so late-night study counts for "today"). */
export function dayNumber(now: number): number {
  const offsetMs = new Date(now).getTimezoneOffset() * MINUTE
  return Math.floor((now - offsetMs - 4 * 3_600_000) / 86_400_000)
}

/** Returns the card after answering with `rating` (does not change the input). */
export function schedule(card: Card, rating: Rating, now: number, cfg = DEFAULT_CONFIG): Card {
  const c: Card = { ...card, reps: card.reps + 1 }
  switch (card.state) {
    case 'new':
    case 'learning':
      return learningStep(c, rating, now, cfg.learningSteps, false, cfg)
    case 'relearning':
      return learningStep(c, rating, now, cfg.relearningSteps, true, cfg)
    case 'review':
      return reviewCard(c, rating, now, cfg)
  }
}

function learningStep(c: Card, rating: Rating, now: number, steps: number[], relearning: boolean, cfg: SchedulerConfig): Card {
  const state: CardState = relearning ? 'relearning' : 'learning'
  const wait = (minutes: number, step: number): Card => ({ ...c, state, step, dueAt: now + minutes * MINUTE })

  switch (rating) {
    case 'again':
      return wait(steps[0], 0)
    case 'hard': {
      // first step with several steps: halfway to the next one; otherwise repeat the step
      const delay =
        c.step === 0 && steps.length > 1 ? (steps[0] + steps[1]) / 2 : steps.length === 1 ? steps[0] * 1.5 : steps[c.step]
      return wait(delay, c.step)
    }
    case 'good':
      return c.step + 1 < steps.length ? wait(steps[c.step + 1], c.step + 1) : graduate(c, now, false, relearning, cfg)
    case 'easy':
      return graduate(c, now, true, relearning, cfg)
  }
}

function graduate(c: Card, now: number, easy: boolean, relearning: boolean, cfg: SchedulerConfig): Card {
  const interval = relearning
    ? Math.min(cfg.maxInterval, c.interval + (easy ? 1 : 0)) // keeps the (already reduced) interval from the lapse
    : easy ? cfg.easyInterval : cfg.graduatingInterval
  return { ...c, state: 'review', step: 0, dueAt: 0, interval, dueDay: dayNumber(now) + interval }
}

function reviewCard(c: Card, rating: Rating, now: number, cfg: SchedulerConfig): Card {
  const today = dayNumber(now)
  const late = Math.max(0, today - c.dueDay) // days overdue: a late but successful review counts for more

  if (rating === 'again') {
    const interval = Math.max(cfg.minInterval, Math.round(c.interval * cfg.lapseInterval))
    return {
      ...c, state: 'relearning', step: 0, lapses: c.lapses + 1, interval,
      ease: Math.max(MIN_EASE, c.ease - 0.2), dueAt: now + cfg.relearningSteps[0] * MINUTE,
    }
  }

  // Candidate intervals, each at least one day longer than the previous rating's.
  const m = cfg.intervalModifier
  const hard = Math.max(Math.round((c.interval + late / 4) * cfg.hardFactor * m), c.interval + 1)
  const good = Math.max(Math.round((c.interval + late / 2) * c.ease * m), hard + 1)
  const easy = Math.max(Math.round((c.interval + late) * c.ease * cfg.easyBonus * m), good + 1)

  const chosen = rating === 'hard' ? hard : rating === 'good' ? good : easy
  const ease = rating === 'hard' ? Math.max(MIN_EASE, c.ease - 0.15) : rating === 'easy' ? c.ease + 0.15 : c.ease
  const interval = Math.min(cfg.maxInterval, chosen)
  return { ...c, ease, interval, dueDay: today + interval }
}

/** Short text for the rating buttons: "1m", "10m", "2h", "4d", "3.2mo", "1.1y". */
export function formatInterval(after: Card, now: number): string {
  if (after.state === 'learning' || after.state === 'relearning') {
    return formatMinutes(Math.max(1, (after.dueAt - now) / MINUTE))
  }
  return formatDays(after.dueDay - dayNumber(now))
}

function formatMinutes(min: number): string {
  if (min < 59.5) return `${Math.round(min)}m`
  if (min < 1440) return `${trim(min / 60)}h`
  return formatDays(min / 1440)
}

function formatDays(days: number): string {
  if (days < 30) return `${Math.round(days)}d`
  if (days < 365) return `${trim(days / 30.4)}mo`
  return `${trim(days / 365)}y`
}

const trim = (n: number) => String(Math.round(n * 10) / 10)
