import { describe, expect, it } from 'vitest'
import { PLANETS, checkPlanet, pickNextPlanet } from './planets'

const byId = (id: string) => PLANETS.find((p) => p.id === id)!

describe('planets data', () => {
  it('has the 8 planets in order from the Sun', () => {
    expect(PLANETS.map((p) => p.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(new Set(PLANETS.map((p) => p.id)).size).toBe(8)
  })
})

describe('checkPlanet', () => {
  it('accepts English and German names, any case', () => {
    expect(checkPlanet('Neptune', byId('neptune')).kind).toBe('correct')
    expect(checkPlanet('neptun', byId('neptune')).kind).toBe('correct')
    expect(checkPlanet('Erde', byId('earth')).kind).toBe('correct')
    expect(checkPlanet('MERKUR', byId('mercury')).kind).toBe('correct')
  })
  it('forgives small typos', () => {
    expect(checkPlanet('Jupitr', byId('jupiter')).kind).toBe('typo')
  })
  it('never accepts another planet', () => {
    expect(checkPlanet('Uranus', byId('neptune')).kind).toBe('wrong')
    expect(checkPlanet('Mars', byId('earth')).kind).toBe('wrong')
    expect(checkPlanet('', byId('earth')).kind).toBe('wrong')
  })
})

describe('pickNextPlanet', () => {
  it('skips named planets and the one just shown', () => {
    const solved = PLANETS.filter((p) => p.id !== 'mars' && p.id !== 'venus').map((p) => p.id)
    for (let i = 0; i < 20; i++) expect(pickNextPlanet({ solved, missed: [] }, 'mars')?.id).toBe('venus')
  })
  it('returns null when all are named', () => {
    expect(pickNextPlanet({ solved: PLANETS.map((p) => p.id), missed: [] }, null)).toBeNull()
  })
})
