// Quiz duel (like the "Quizduell" app): two friends, 6 rounds of 3 multiple-choice questions.
// The players take turns choosing the category of a round; both answer the same questions.
// Whose turn: whoever still has to answer a round; when both answered every round so far,
// the next round's chooser (rounds 1, 3, 5: the one who started; 2, 4, 6: the other).
// Pure logic (no React, no Firebase). Stored in Firestore as quizduels/{id}.
import { countries, type Country } from '../data/countries'
import { NATURE, type NatureItem } from '../../data/nature'

export type QdCategory = 'capital' | 'country' | 'river' | 'mountains' | 'water'
export const QD_CATEGORIES: QdCategory[] = ['capital', 'country', 'river', 'mountains', 'water']
export const QD_ICON: Record<QdCategory, string> = { capital: '🏙️', country: '🚩', river: '🌊', mountains: '⛰️', water: '💧' }
export const QD_ROUNDS = 6
export const QD_QUESTIONS = 3
export const QD_OPTIONS = 4
export const QD_TIME_MS = 20_000

/** id = country id (capital, country) or nature item id; opts = the 4 choices (ids), in the order shown. */
export interface QdQuestion { id: string; opts: string[] }
/** One player's answers in a round: the picked option per question ('' = time up) and the time taken. */
export interface QdAnswers { picks: string[]; ms: number }
export interface QdRound { cat: QdCategory; qs: QdQuestion[]; ans: Record<string, QdAnswers> }
export interface QuizDuel {
  id: string
  players: string[] // [the one who started, the opponent]
  names: Record<string, string>
  createdAt: number
  updatedAt: number
  rounds: QdRound[]
  turn: string | null // whose turn it is; null = finished (kept up to date on every save, for the lists and the nav badge)
}

/** Who chooses the category of round `i` (0-based). */
export const chooserOf = (players: string[], i: number) => players[i % 2]

export function turnOf(rounds: QdRound[], players: string[]): string | null {
  for (const r of rounds) for (const p of players) if (!r.ans[p]) return p
  return rounds.length < QD_ROUNDS ? chooserOf(players, rounds.length) : null
}

/** What I have to do now: answer an existing round (its index), and/or choose + play a new one. */
export function myTasks(d: Pick<QuizDuel, 'rounds' | 'players'>, me: string): { answer: number | null; choose: boolean } {
  const answer = d.rounds.findIndex((r) => !r.ans[me])
  // after I have answered everything open: is it (still) my turn? Then I choose the next round.
  const after = d.rounds.map((r) => (r.ans[me] ? r : { ...r, ans: { ...r.ans, [me]: { picks: [], ms: 0 } } }))
  const choose = turnOf(after, d.players) === me
  return { answer: answer >= 0 ? answer : null, choose }
}

const shuffled = <T,>(list: T[], random: () => number): T[] => {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 3 wrong choices: preferably from the same continent / area (harder and more sensible), then any. */
function distractors<T extends { id: string }>(target: T, pool: T[], near: (a: T) => boolean, random: () => number): T[] {
  const others = pool.filter((x) => x.id !== target.id)
  const close = shuffled(others.filter(near), random)
  const far = shuffled(others.filter((x) => !near(x)), random)
  return [...close, ...far].slice(0, QD_OPTIONS - 1)
}

const natureOf = (cat: QdCategory) => NATURE.filter((n) => n.kind === cat)

/** 3 questions of a category, none that was already asked in this duel (`used`). */
export function makeQuestions(cat: QdCategory, used: string[] = [], random: () => number = Math.random): QdQuestion[] {
  const make = <T extends { id: string }>(pool: T[], near: (a: T, b: T) => boolean): QdQuestion[] => {
    const fresh = pool.filter((x) => !used.includes(x.id))
    return shuffled(fresh.length >= QD_QUESTIONS ? fresh : pool, random).slice(0, QD_QUESTIONS).map((target) => ({
      id: target.id,
      opts: shuffled([target, ...distractors(target, pool, (x) => near(x, target), random)], random).map((x) => x.id),
    }))
  }
  if (cat === 'capital' || cat === 'country') return make<Country>(countries, (a, b) => a.continent === b.continent)
  return make<NatureItem>(natureOf(cat), (a, b) => a.areas.some((x) => b.areas.includes(x)))
}

/** Points so far (1 per right answer) and total time, per player. Rounds the other has not played yet don't count for me either. */
export function scoresOf(d: Pick<QuizDuel, 'rounds' | 'players'>): Record<string, { pts: number; ms: number }> {
  const out: Record<string, { pts: number; ms: number }> = Object.fromEntries(d.players.map((p) => [p, { pts: 0, ms: 0 }]))
  for (const r of d.rounds) {
    if (!d.players.every((p) => r.ans[p])) continue // only rounds both have played
    for (const p of d.players) {
      out[p].pts += r.qs.filter((q, i) => r.ans[p].picks[i] === q.id).length
      out[p].ms += r.ans[p].ms
    }
  }
  return out
}

/** 'win' | 'loss' | 'draw' for me once the duel is over (most right answers; a tie is a draw). */
export function qdOutcome(d: QuizDuel, me: string): 'win' | 'loss' | 'draw' | null {
  if (d.turn !== null) return null
  const s = scoresOf(d)
  const other = d.players.find((p) => p !== me)!
  return s[me].pts > s[other].pts ? 'win' : s[me].pts < s[other].pts ? 'loss' : 'draw'
}

/** Every question id asked so far (no repeats within a duel). */
export const usedIds = (rounds: QdRound[]) => rounds.flatMap((r) => r.qs.map((q) => q.id))
