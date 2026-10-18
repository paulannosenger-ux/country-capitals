import { describe, expect, it } from 'vitest'
import { missed, passed, shuffle } from './practice'

describe('practice queue', () => {
  it('shuffles without losing cards', () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    expect(shuffle(ids).sort()).toEqual(ids)
  })
  it('drops a passed card', () => {
    expect(passed(['a', 'b', 'c'])).toEqual(['b', 'c'])
  })
  it('asks a missed card again a few cards later', () => {
    expect(missed(['a', 'b', 'c', 'd', 'e', 'f'])).toEqual(['b', 'c', 'd', 'e', 'a', 'f'])
    expect(missed(['a', 'b'])).toEqual(['b', 'a'])
    expect(missed(['a'])).toEqual(['a'])
    expect(missed([])).toEqual([])
  })
})
