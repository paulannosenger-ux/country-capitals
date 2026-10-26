import { describe, expect, it } from 'vitest'
import { countryById } from '../data/countries'
import { NATURE } from '../../data/nature'
import { QD_ROUNDS, makeQuestions, myTasks, qdOutcome, scoresOf, turnOf, type QdRound, type QuizDuel } from './quizduel'

const A = 'anna', B = 'ben'
const players = [A, B]
const round = (ansBy: string[], right = true): QdRound => {
  const qs = makeQuestions('capital')
  const picks = qs.map((q) => (right ? q.id : q.opts.find((o) => o !== q.id)!))
  return { cat: 'capital', qs, ans: Object.fromEntries(ansBy.map((p) => [p, { picks, ms: 3000 }])) }
}

describe('quiz duel turns', () => {
  it('alternates like Quizduell: answer the other one\'s round, then choose the next', () => {
    let rounds = [round([A])]
    expect(turnOf(rounds, players)).toBe(B)
    expect(myTasks({ rounds, players }, B)).toEqual({ answer: 0, choose: true })
    expect(myTasks({ rounds, players }, A)).toEqual({ answer: null, choose: false })
    rounds = [round([A, B]), round([B])]
    expect(turnOf(rounds, players)).toBe(A)
    expect(myTasks({ rounds, players }, A)).toEqual({ answer: 1, choose: true })
  })
  it('the last round is only answered, nobody chooses a 7th', () => {
    const rounds = Array.from({ length: QD_ROUNDS }, (_, i) => round(i === QD_ROUNDS - 1 ? [B] : [A, B]))
    expect(turnOf(rounds, players)).toBe(A)
    expect(myTasks({ rounds, players }, A)).toEqual({ answer: QD_ROUNDS - 1, choose: false })
    rounds[QD_ROUNDS - 1] = round([A, B])
    expect(turnOf(rounds, players)).toBeNull()
  })
})

describe('questions', () => {
  it('has 3 questions with 4 different options including the answer', () => {
    for (const cat of ['capital', 'country', 'river', 'mountains', 'water'] as const) {
      for (const q of makeQuestions(cat)) {
        expect(q.opts).toHaveLength(4)
        expect(new Set(q.opts).size).toBe(4)
        expect(q.opts).toContain(q.id)
      }
    }
  })
  it('prefers wrong choices from the same continent', () => {
    for (const q of makeQuestions('capital')) {
      const c = countryById.get(q.id)!
      expect(q.opts.every((o) => countryById.get(o)!.continent === c.continent)).toBe(true)
    }
    for (const q of makeQuestions('river')) expect(q.opts.every((o) => NATURE.find((n) => n.id === o)!.kind === 'river')).toBe(true)
  })
  it('does not repeat questions within a duel', () => {
    const used = makeQuestions('mountains').map((q) => q.id)
    for (const q of makeQuestions('mountains', used)) expect(used).not.toContain(q.id)
  })
})

describe('score', () => {
  it('counts only rounds both have played; most right answers wins', () => {
    const d: QuizDuel = { id: 'x', players, names: {}, createdAt: 0, updatedAt: 0, rounds: [round([A, B]), round([B])], turn: A }
    expect(scoresOf(d)[A].pts).toBe(3)
    expect(scoresOf(d)[B].pts).toBe(3) // round 2 not yet played by Anna
    // last round: Anna all wrong, Ben all right
    const last = round([A], false)
    last.ans[B] = { picks: last.qs.map((q) => q.id), ms: 1 }
    const done: QuizDuel = { ...d, rounds: [round([A, B]), last], turn: null }
    expect(qdOutcome(done, B)).toBe('win')
    expect(qdOutcome(done, A)).toBe('loss')
  })
})
