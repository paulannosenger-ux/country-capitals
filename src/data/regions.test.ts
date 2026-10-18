import { describe, expect, it } from 'vitest'
import { REGIONS, countries, countriesIn, countriesInArea, regionOf } from './countries'

describe('Africa regions', () => {
  it('puts every African country in exactly one region', () => {
    const africa = countriesIn('Africa').map((c) => c.id).sort()
    expect([...regionOf.keys()].sort()).toEqual(africa)
    expect(REGIONS.reduce((n, r) => n + countriesInArea(r).length, 0)).toBe(54)
  })
  it('only uses real country codes', () => {
    for (const id of regionOf.keys()) expect(countries.some((c) => c.id === id)).toBe(true)
  })
})
