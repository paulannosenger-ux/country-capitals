// Duels: one player plays a round, then friends play exactly the same questions and the scores are compared.
// Stored in Firestore as matches/{id}; this file only has the types and the pure helpers.
import type { Area } from '../data/countries'
import type { GameMode, RoundResult } from './modes'

export interface Match {
  id: string
  mode: GameMode
  area: Area | null // null = the whole world
  questions: string[] // country ids, the same for everybody
  createdBy: string
  createdAt: number
  participants: string[] // uids: invited friends + everyone who opened the link and played
  names: Record<string, string> // uid -> name
  results: Record<string, RoundResult> // uid -> round; missing = not played yet
}

export type MatchState = 'yourTurn' | 'waiting' | 'done'

/** From my point of view: do I still have to play, am I waiting for the others, or is it over? */
export function matchState(m: Match, me: string): MatchState {
  if (!m.results[me]) return 'yourTurn'
  // a link nobody has opened yet: still waiting
  return m.participants.length > 1 && m.participants.every((uid) => m.results[uid]) ? 'done' : 'waiting'
}

/** Ranking: higher score first; on a tie the faster player. */
export function ranking(m: Match): { uid: string; name: string; result: RoundResult }[] {
  return Object.entries(m.results)
    .map(([uid, result]) => ({ uid, name: m.names[uid] ?? '?', result }))
    .sort((a, b) => b.result.score - a.result.score || a.result.ms - b.result.ms)
}

/** 'win' | 'loss' | 'draw' for me in a finished match (best of all players). */
export function outcome(m: Match, me: string): 'win' | 'loss' | 'draw' | null {
  const r = ranking(m)
  if (r.length < 2 || !m.results[me]) return null
  const top = r[0].result
  const tied = r.filter((p) => p.result.score === top.score && p.result.ms === top.ms)
  if (!tied.some((p) => p.uid === me)) return 'loss'
  return tied.length > 1 ? 'draw' : 'win'
}

/** The other players' names, e.g. "Anna, Ben". */
export const opponents = (m: Match, me: string) =>
  m.participants.filter((uid) => uid !== me).map((uid) => m.names[uid] ?? '?').join(', ')
