import { describe, expect, it } from 'vitest'
import { countriesInArea } from '../data/countries'
import { matchState, outcome, type Match } from './duels'
import { checkTyped, pickQuestions, scorePin, speedPoints, summarizeRound } from './modes'
import { countryById } from '../data/countries'

describe('game modes', () => {
  it('picks different countries of the area', () => {
    const q = pickQuestions('Europe')
    expect(q).toHaveLength(10)
    expect(new Set(q).size).toBe(10)
    const europe = new Set(countriesInArea('Europe').map((c) => c.id))
    expect(q.every((id) => europe.has(id))).toBe(true)
  })

  it('gives more points for faster answers', () => {
    expect(speedPoints(0)).toBe(200)
    expect(speedPoints(15_000)).toBe(100)
    expect(speedPoints(60_000)).toBe(100)
    expect(speedPoints(7_500)).toBe(150)
  })

  it('checks typed answers per mode', () => {
    const at = countryById.get('AT')!
    expect(checkTyped('capital', 'Wien', at)).toBe(2)
    expect(checkTyped('reverse', 'Österreich', at)).toBe(2)
    expect(checkTyped('flag', 'Germany', at)).toBe(0)
    // Chad and Romania have the same flag: both names count
    expect(checkTyped('flag', 'Romania', countryById.get('TD')!)).toBe(2)
  })

  it('pin mode: right country full points, a neighbour some, far away none', () => {
    expect(scorePin('FR', 'FR', 0).pts).toBe(200)
    const near = scorePin('FR', 'BE', 3000)
    expect(near.ok).toBe(1)
    expect(near.pts).toBeGreaterThan(50)
    expect(scorePin('FR', 'AU', 1000).pts).toBe(0)
  })

  it('adds up a round', () => {
    const r = summarizeRound([{ id: 'FR', ok: 2, pts: 180, ms: 3000 }, { id: 'DE', ok: 0, pts: 0, ms: 15000 }])
    expect(r).toMatchObject({ score: 180, correct: 1, ms: 18000 })
  })
})

describe('duels', () => {
  const base: Match = {
    id: 'm', mode: 'capital', area: null, questions: [], createdBy: 'a', createdAt: 0,
    participants: ['a', 'b'], names: { a: 'Anna', b: 'Ben' }, results: {},
  }
  const res = (score: number, ms = 1000) => ({ score, correct: 0, ms, answers: [] })

  it('knows whose turn it is', () => {
    const m = { ...base, results: { a: res(100) } }
    expect(matchState(m, 'a')).toBe('waiting')
    expect(matchState(m, 'b')).toBe('yourTurn')
    expect(matchState({ ...m, results: { a: res(100), b: res(50) } }, 'a')).toBe('done')
    expect(matchState({ ...m, participants: ['a'] }, 'a')).toBe('waiting') // shared link, nobody played yet
  })

  it('decides win, loss and draw (time breaks a tie)', () => {
    expect(outcome({ ...base, results: { a: res(100), b: res(50) } }, 'a')).toBe('win')
    expect(outcome({ ...base, results: { a: res(100), b: res(50) } }, 'b')).toBe('loss')
    expect(outcome({ ...base, results: { a: res(100, 900), b: res(100, 1000) } }, 'a')).toBe('win')
    expect(outcome({ ...base, results: { a: res(100), b: res(100) } }, 'b')).toBe('draw')
  })
})
