import { describe, expect, it } from 'vitest'
import { countries, countryById } from '../data/countries'
import { checkAnswer, checkCountryName, editDistance, normalize } from './matcher'

const kind = (input: string, id: string) => checkAnswer(input, countryById.get(id)!, countries).kind

describe('normalize', () => {
  it('ignores case, accents and punctuation', () => {
    expect(normalize('  BRASÍLIA ')).toBe('brasilia')
    expect(normalize("N'Djamena")).toBe('ndjamena')
    expect(normalize('Port-au-Prince')).toBe('port au prince')
    expect(normalize('Saint John’s')).toBe('st johns')
    expect(normalize("St. John's")).toBe('st johns')
    expect(normalize('Reykjavík')).toBe('reykjavik')
    expect(normalize('Tórshavn Łódź Århus')).toBe('torshavn lodz arhus')
  })
})

describe('editDistance', () => {
  it('counts a swap of neighbours as one mistake', () => {
    expect(editDistance('paris', 'pairs')).toBe(1)
    expect(editDistance('rome', 'roma')).toBe(1)
    expect(editDistance('abc', 'xyz')).toBe(3)
  })
})

describe('checkAnswer', () => {
  it('accepts exact answers in any case, with or without accents', () => {
    expect(kind('vienna', 'AT')).toBe('correct')
    expect(kind('BRASILIA', 'BR')).toBe('correct')
    expect(kind('Bogota', 'CO')).toBe('correct')
    expect(kind('sao tome', 'ST')).toBe('correct')
    expect(kind('Port au Prince', 'HT')).toBe('correct')
    expect(kind("saint john's", 'AG')).toBe('correct')
  })
  it('accepts alternative spellings', () => {
    expect(kind('Kiev', 'UA')).toBe('correct')
    expect(kind('Berne', 'CH')).toBe('correct')
    expect(kind('Ulaanbaatar', 'MN')).toBe('correct')
    expect(kind('Washington', 'US')).toBe('correct')
    expect(kind('Sanaa', 'YE')).toBe('correct')
  })
  it('accepts any of several capitals', () => {
    for (const answer of ['Pretoria', 'Cape Town', 'Bloemfontein']) expect(kind(answer, 'ZA')).toBe('correct')
    for (const answer of ['Sucre', 'La Paz']) expect(kind(answer, 'BO')).toBe('correct')
    for (const answer of ['Mbabane', 'Lobamba']) expect(kind(answer, 'SZ')).toBe('correct')
    for (const answer of ['Ramallah', 'East Jerusalem', 'Jerusalem']) expect(kind(answer, 'PS')).toBe('correct')
  })
  it('tolerates typos, more for longer words', () => {
    expect(kind('Pairs', 'FR')).toBe('typo') // swapped letters
    expect(kind('Viena', 'AT')).toBe('typo')
    expect(kind('Canbera', 'AU')).toBe('typo')
    expect(kind('Ouagadogou', 'BF')).toBe('typo')
    expect(kind('Buharest', 'RO')).toBe('typo')
  })
  it('rejects wrong answers and empty input', () => {
    expect(kind('Berlin', 'AT')).toBe('wrong')
    expect(kind('', 'AT')).toBe('wrong')
    expect(kind('   ', 'AT')).toBe('wrong')
    expect(kind('Ro', 'IT')).toBe('wrong') // too short to be a typo of "Rome"
  })
  it("does not accept another country's capital as a typo", () => {
    expect(kind('Kingston', 'VC')).toBe('wrong') // Kingston is Jamaica; Kingstown is St. Vincent
    expect(kind('Kingstown', 'VC')).toBe('correct')
  })
  it('every country accepts its own capitals exactly (data sanity)', () => {
    for (const c of countries) for (const cap of c.capitals) expect(kind(cap, c.id), `${c.id} ${cap}`).toBe('correct')
  })
  it("a country's capital is never accepted (even as a typo) for another country", () => {
    const bad: string[] = []
    for (const c of countries) for (const cap of c.capitals) for (const o of countries) {
      if (o.id === c.id || o.capitals.includes(cap) || o.capitalAliases.includes(cap)) continue
      if (checkAnswer(cap, o, countries).kind !== 'wrong') bad.push(`${cap} accepted for ${o.name.en}`)
    }
    expect(bad).toEqual([])
  })
})

describe('checkCountryName', () => {
  const name = (input: string, id: string) => checkCountryName(input, countryById.get(id)!, countries).kind
  it('accepts English, German and common alternative names', () => {
    expect(name('Austria', 'AT')).toBe('correct')
    expect(name('österreich', 'AT')).toBe('correct')
    expect(name('USA', 'US')).toBe('correct')
    expect(name('Czech Republic', 'CZ')).toBe('correct')
    expect(name('the gambia', 'GM')).toBe('correct')
    expect(name('Gambia', 'GM')).toBe('correct')
  })
  it('allows small typos but never another country', () => {
    expect(name('Austira', 'AT')).toBe('typo')
    expect(name('Niger', 'NG')).toBe('wrong')
    expect(name('Nigeria', 'NE')).toBe('wrong')
    expect(name('Australia', 'AT')).toBe('wrong')
  })
})

describe('German capital names', () => {
  it('accepts the German name too', () => {
    expect(kind('Wien', 'AT')).toBe('correct')
    expect(kind('Vienna', 'AT')).toBe('correct')
    expect(kind('Moskau', 'RU')).toBe('correct')
    expect(kind('Kopenhagen', 'DK')).toBe('correct')
  })
})
