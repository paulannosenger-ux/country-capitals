// Game modes for quick rounds and duels: 10 questions, points for being right and for being fast.
// Pure logic (no React, no Firebase), so it is easy to test.
import { geoDistance } from 'd3-geo'
import { countries, countryById, inArea, type Area, type Country } from '../data/countries'
import { checkAnswer, checkCountryName } from '../study/matcher'

export type GameMode = 'capital' | 'flag' | 'reverse' | 'pin'
export const GAME_MODES: GameMode[] = ['capital', 'flag', 'reverse', 'pin']
export const MODE_ICON: Record<GameMode, string> = { capital: '🏙️', flag: '🚩', reverse: '🔄', pin: '📍' }

export const ROUND_LENGTH = 10
export const TIME_LIMIT_MS = 15_000 // per question
export const MAX_POINTS = 200 // per question: 100 for right + up to 100 speed bonus

/** One answered question. ok: 2 = right, 1 = partly (pin: close by), 0 = wrong / time up. */
export interface Answer { id: string; ok: 0 | 1 | 2; pts: number; ms: number; km?: number; given?: string }
export interface RoundResult { score: number; correct: number; ms: number; answers: Answer[] }

/** `n` different random countries of the area (null = the whole world). */
export function pickQuestions(area: Area | null, n = ROUND_LENGTH, random: () => number = Math.random): string[] {
  const pool = countries.filter((c) => inArea(c, area)).map((c) => c.id)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, n)
}

/** Points for a right answer: 100 + up to 100 for speed (answer at once = 200, at the time limit = 100). */
export const speedPoints = (ms: number) => 100 + Math.round(100 * Math.max(0, 1 - ms / TIME_LIMIT_MS))

// Flags that are (almost) identical: in flag mode either name counts.
const LOOKALIKE_FLAGS: Record<string, string[]> = { TD: ['RO'], RO: ['TD'], MC: ['ID'], ID: ['MC'] }

/** Checks a typed answer in the text modes. Returns ok (2 = right, 0 = wrong). */
export function checkTyped(mode: Exclude<GameMode, 'pin'>, input: string, country: Country): 0 | 2 {
  if (mode === 'capital') return checkAnswer(input, country, countries).kind === 'wrong' ? 0 : 2
  const ids = mode === 'flag' ? [country.id, ...(LOOKALIKE_FLAGS[country.id] ?? [])] : [country.id]
  return ids.some((id) => checkCountryName(input, countryById.get(id)!, countries).kind !== 'wrong') ? 2 : 0
}

/** Kilometres between two countries (their main coordinates). */
export function distanceKm(a: string, b: string): number {
  const p = countryById.get(a)?.latlng
  const q = countryById.get(b)?.latlng
  if (!p || !q) return 20_000
  return Math.round(geoDistance([p[1], p[0]], [q[1], q[0]]) * 6371)
}

export const PIN_FULL_KM = 2500 // a click further away than this gives 0 points
/** Pin mode: the right country = speed points; another country = up to 99 points, the closer the more. */
export function scorePin(target: string, clicked: string, ms: number): Answer {
  if (clicked === target) return { id: target, ok: 2, pts: speedPoints(ms), ms, km: 0, given: clicked }
  const km = distanceKm(target, clicked)
  const pts = Math.round(99 * Math.max(0, 1 - km / PIN_FULL_KM))
  return { id: target, ok: pts > 0 ? 1 : 0, pts, ms, km, given: clicked }
}

export function scoreTyped(target: string, ok: 0 | 2, ms: number, given: string): Answer {
  return { id: target, ok, pts: ok ? speedPoints(ms) : 0, ms, given }
}

export function summarizeRound(answers: Answer[]): RoundResult {
  return {
    score: answers.reduce((n, a) => n + a.pts, 0),
    correct: answers.filter((a) => a.ok === 2).length,
    ms: answers.reduce((n, a) => n + a.ms, 0),
    answers,
  }
}

// ---- personal records per mode + area (only in this browser) ----
const BEST_KEY = 'country-capitals:games:best'
export const bestKey = (mode: GameMode, area: Area | null) => `${mode}|${area ?? 'World'}`
export function loadBest(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') } catch { return {} }
}
/** Saves the score if it is a new record; returns the old record (or null). */
export function saveBest(mode: GameMode, area: Area | null, score: number): number | null {
  const all = loadBest()
  const key = bestKey(mode, area)
  const old = all[key] ?? null
  if (old === null || score > old) {
    try { localStorage.setItem(BEST_KEY, JSON.stringify({ ...all, [key]: score })) } catch { /* not saved */ }
  }
  return old
}
