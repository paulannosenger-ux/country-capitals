// Typed access to the generated data/countries.json.
import raw from '../../data/countries.json'
import { CONTINENTS, type Continent } from '../../data/config'
import type { Lang } from '../i18n'

export { CONTINENTS }
export type { Continent }

export interface Country {
  id: string // ISO 3166-1 alpha-2, e.g. "AT"
  ccn3: string | null // numeric code, used to match the map polygons
  name: { en: string; de: string | null }
  status: string
  continent: Continent
  capitals: string[]
  capitalAliases: string[]
  nameAliases: string[] // other accepted country names (map quiz)
  flag: string
  population: { value: number; year: number; source: string } | null
  areaKm2: number | null
  languages: string[]
  currencies: { code: string; name: string; symbol: string | null }[]
  government: string | null
  summary: { text: string; url: string } | null
  latlng: [number, number] | null // [lat, lng]
  /** German texts (capitals in the same order as `capitals`) */
  de: { capitals: string[]; government: string | null; summary: { text: string; url: string } | null; languages: string[]; currencies: string[] }
}

export const countries = raw.countries as unknown as Country[]
export const lastUpdated: string = raw.lastUpdated

export const countryById = new Map(countries.map((c) => [c.id, c]))

/** The country's name in the interface language. */
export const countryName = (c: Country, lang: Lang) => (lang === 'de' ? c.name.de ?? c.name.en : c.name.en)
/** The name in the other language, if it is different ("Österreich" under "Austria"). */
export function otherName(c: Country, lang: Lang): string | null {
  const other = lang === 'de' ? c.name.en : c.name.de
  return other && other !== countryName(c, lang) ? other : null
}
/** Capitals in the interface language. */
export const capitalsOf = (c: Country, lang: Lang) => (lang === 'de' ? c.de.capitals : c.capitals)

/** "Austria / Österreich" (just one name if both are identical); the interface language comes first. */
export function displayName(c: Country, lang: Lang = 'en'): string {
  const other = otherName(c, lang)
  return other ? `${countryName(c, lang)} / ${other}` : countryName(c, lang)
}

export function flagUrl(c: Country): string {
  return import.meta.env.BASE_URL + c.flag
}

export const countriesIn = (continent: Continent) => countries.filter((c) => c.continent === continent)
