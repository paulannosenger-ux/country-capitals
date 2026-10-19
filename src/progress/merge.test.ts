import { describe, expect, it } from 'vitest'
import { mergeAppData } from './merge'
import { newCard } from './scheduler'
import { emptyData } from './storage'

describe('mergeAppData', () => {
  it('keeps cards from both sides and the more practised copy', () => {
    const local = emptyData()
    const remote = emptyData()
    local.cards.FR = { ...newCard(), state: 'review', reps: 3, dueDay: 10 }
    remote.cards.FR = { ...newCard(), state: 'learning', reps: 1 }
    remote.cards.DE = { ...newCard(), state: 'learning', reps: 1 }
    const m = mergeAppData(local, remote)
    expect(m.cards.FR.reps).toBe(3)
    expect(m.cards.DE.reps).toBe(1)
  })

  it('joins the review logs without duplicates, oldest first', () => {
    const local = emptyData()
    const remote = emptyData()
    local.log = [{ t: 2, id: 'FR', r: 'good', s: 'new' }, { t: 5, id: 'DE', r: 'good', s: 'new' }]
    remote.log = [{ t: 2, id: 'FR', r: 'good', s: 'new' }, { t: 3, id: 'IT', r: 'again', s: 'new' }]
    expect(mergeAppData(local, remote).log.map((e) => e.t)).toEqual([2, 3, 5])
  })

  it('takes the settings from the account and the newest daily counter', () => {
    const local = emptyData()
    const remote = emptyData()
    remote.settings.newPerDay = 10
    local.daily = { day: 5, newCount: 3, reviewCount: 1 }
    remote.daily = { day: 5, newCount: 7, reviewCount: 0 }
    const m = mergeAppData(local, remote)
    expect(m.settings.newPerDay).toBe(10)
    expect(m.daily).toEqual({ day: 5, newCount: 7, reviewCount: 1 })
  })
})
