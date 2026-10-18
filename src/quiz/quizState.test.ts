import { describe, expect, it } from 'vitest'
import { pickNextOpen, summarize, type Round } from './quizState'

describe('map quiz round', () => {
  const ids = ['AT', 'DE', 'FR', 'IT']
  const round: Round = { AT: 'solved', DE: 'helped', FR: 'missed' }

  it('counts solved, helped, missed and open countries', () => {
    expect(summarize(round, ids)).toEqual({ total: 4, solved: 1, helped: 1, missed: 1, open: 1, done: 2 })
  })
  it('suggests untried countries first, then missed ones', () => {
    expect(pickNextOpen(round, ids, null)).toBe('IT')
    expect(pickNextOpen(round, ids, 'IT')).toBe('FR')
    expect(pickNextOpen({ ...round, IT: 'solved', FR: 'solved' }, ids, null)).toBeNull()
  })
})
