// Map quiz progress: which countries of a round (continent + mode) are already named.
// Saved in its own localStorage key, separate from the flashcard progress.
import { AREAS, type Area } from '../data/countries'

export type Mode = 'easy' | 'hard' // easy = name the country, hard = country + capital
/** solved = right on the first try · helped = right after a mistake or with the flag tip · missed = wrong, ask again */
export type QStatus = 'solved' | 'helped' | 'missed'
export type Round = Record<string, QStatus>

export interface QuizSave {
  continent: Area // a continent or a region (e.g. West Africa)
  mode: Mode
  rounds: Record<string, Round>
}

const KEY = 'country-capitals:quiz:v1'

export const roundKey = (continent: Area, mode: Mode) => `${continent}|${mode}`

export function loadQuiz(): QuizSave {
  const fallback: QuizSave = { continent: 'Europe', mode: 'easy', rounds: {} }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return fallback
    return {
      continent: AREAS.includes(raw.continent) ? raw.continent : fallback.continent,
      mode: raw.mode === 'hard' ? 'hard' : 'easy',
      rounds: raw.rounds && typeof raw.rounds === 'object' ? raw.rounds : {},
    }
  } catch {
    return fallback
  }
}

export function saveQuiz(s: QuizSave): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private window etc.: the round just isn't remembered */ }
}

export interface RoundSummary { total: number; solved: number; helped: number; missed: number; open: number; done: number }

export function summarize(round: Round, ids: string[]): RoundSummary {
  let solved = 0, helped = 0, missed = 0
  for (const id of ids) {
    if (round[id] === 'solved') solved++
    else if (round[id] === 'helped') helped++
    else if (round[id] === 'missed') missed++
  }
  const done = solved + helped
  return { total: ids.length, solved, helped, missed, open: ids.length - done - missed, done }
}

/** A country still to answer: first the never-tried ones, then the missed ones. */
export function pickNextOpen(round: Round, ids: string[], exclude: string | null, random: () => number = Math.random): string | null {
  const pick = (list: string[]) => (list.length ? list[Math.floor(random() * list.length)] : null)
  const open = ids.filter((id) => !round[id] && id !== exclude)
  const missed = ids.filter((id) => round[id] === 'missed' && id !== exclude)
  return pick(open) ?? pick(missed)
}
