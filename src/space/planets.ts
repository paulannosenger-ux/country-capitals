// Space tab logic: names, answer check, saved progress. (No React, no three.js: tested in planets.test.ts.)
import { PLANETS, type Planet } from '../../data/planets'
import type { Lang } from '../i18n'
import { editDistance, normalize, tolerance, type AnswerResult } from '../study/matcher'

export { PLANETS, type Planet }

export const planetName = (p: Planet, lang: Lang) => (lang === 'de' ? p.de : p.en)
export const otherPlanetName = (p: Planet, lang: Lang) => {
  const other = lang === 'de' ? p.en : p.de
  return other !== planetName(p, lang) ? other : null
}
export const textureUrl = (p: Planet) => `${import.meta.env.BASE_URL}planets/${p.id}.jpg`
export const RING_URL = `${import.meta.env.BASE_URL}planets/saturn-ring.png`

const answersOf = (p: Planet) => [p.en, p.de, ...(p.aliases ?? [])].map(normalize)

/** English and German count, small typos are forgiven, another planet's name is always wrong. */
export function checkPlanet(input: string, planet: Planet): AnswerResult {
  const typed = normalize(input)
  if (!typed) return { kind: 'wrong' }
  const accepted = answersOf(planet)
  if (accepted.includes(typed)) return { kind: 'correct' }
  if (PLANETS.some((p) => p !== planet && answersOf(p).includes(typed))) return { kind: 'wrong' }
  for (const a of accepted) if (editDistance(typed, a) <= tolerance(a.length)) return { kind: 'typo' }
  return { kind: 'wrong' }
}

// ---- quiz round: which planets were named (solved) and which are still to retry (missed) ----
export interface SpaceRound { solved: string[]; missed: string[] }
export const EMPTY_SPACE_ROUND: SpaceRound = { solved: [], missed: [] }
const KEY = 'country-capitals:space:v1'

export function loadSpaceRound(): SpaceRound {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    const ids = new Set(PLANETS.map((p) => p.id))
    const list = (v: unknown) => (Array.isArray(v) ? v.filter((id) => ids.has(id)) : [])
    return raw ? { solved: list(raw.solved), missed: list(raw.missed) } : EMPTY_SPACE_ROUND
  } catch {
    return EMPTY_SPACE_ROUND
  }
}
export function saveSpaceRound(r: SpaceRound) {
  try { localStorage.setItem(KEY, JSON.stringify(r)) } catch { /* not remembered */ }
}

/** Next planet to ask: one not named yet (never the one just shown), first the never-tried ones. */
export function pickNextPlanet(round: SpaceRound, exclude: string | null, random: () => number = Math.random): Planet | null {
  const open = PLANETS.filter((p) => !round.solved.includes(p.id))
  const fresh = open.filter((p) => !round.missed.includes(p.id) && p.id !== exclude)
  const pool = fresh.length ? fresh : open.filter((p) => p.id !== exclude).length ? open.filter((p) => p.id !== exclude) : open
  return pool.length ? pool[Math.floor(random() * pool.length)] : null
}
