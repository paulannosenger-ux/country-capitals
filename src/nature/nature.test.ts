import { describe, expect, it } from 'vitest'
import geo from '../../data/nature-geo.json'
import { CONTINENTS } from '../data/countries'
import { KINDS, NATURE, checkNature, itemsFor } from './nature'

const item = (id: string) => NATURE.find((n) => n.id === id)!
const check = (input: string, id: string) => checkNature(input, item(id)).kind

describe('nature data', () => {
  it('has unique ids and a shape for every item', () => {
    expect(new Set(NATURE.map((n) => n.id)).size).toBe(NATURE.length)
    for (const n of NATURE) expect((geo as Record<string, unknown>)[n.id], n.id).toBeDefined()
  })
  it('has rivers, waters and mountains for every continent', () => {
    for (const c of CONTINENTS) for (const k of KINDS) expect(itemsFor(c, k).length, `${c} ${k}`).toBeGreaterThanOrEqual(3)
  })
})

describe('checkNature', () => {
  it('accepts English, German and other names', () => {
    expect(check('Danube', 'danube')).toBe('correct')
    expect(check('donau', 'danube')).toBe('correct')
    expect(check('Huang He', 'yellow')).toBe('correct')
    expect(check('Bodensee', 'constance')).toBe('correct')
  })
  it('ignores a leading article', () => {
    expect(check('die Alpen', 'alps')).toBe('correct')
    expect(check('the Rhine', 'rhine')).toBe('correct')
  })
  it('forgives small typos', () => {
    expect(check('Mitelmeer', 'mediterranean')).toBe('typo')
    expect(check('Himalya', 'himalaya')).toBe('typo')
  })
  it('never accepts the name of another item', () => {
    expect(check('Lake Huron', 'erie')).toBe('wrong')
    expect(check('Ob', 'po')).toBe('wrong')
    expect(check('Niger', 'nile')).toBe('wrong')
  })
})

describe('nature facts', () => {
  it('has key figures for every item, with real country codes', async () => {
    const { NATURE_FACTS } = await import('./nature')
    const { countryById } = await import('../data/countries')
    for (const n of NATURE) {
      const f = NATURE_FACTS[n.id]
      expect(f, n.id).toBeDefined()
      expect(f.countries.length, n.id).toBeGreaterThan(0)
      for (const c of f.countries) expect(countryById.has(c), `${n.id}: ${c}`).toBe(true)
      if (n.kind === 'river') expect(f.lengthKm && f.source && f.mouth, n.id).toBeTruthy()
    }
  })
})

describe('pickNext', () => {
  it('asks only open items and not the same one twice in a row', async () => {
    const { pickNext } = await import('./nature')
    const round = { solved: ['a'], missed: [] }
    for (let i = 0; i < 20; i++) expect(pickNext(['a', 'b', 'c'], round, 'b')).toBe('c')
    expect(pickNext(['a', 'b'], round, 'b')).toBe('b') // the only one left
    expect(pickNext(['a'], round)).toBeNull()
  })
})
