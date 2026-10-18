// Typed access to the generated data/countries.json.
import raw from '../../data/countries.json'
import { CONTINENTS, type Continent } from '../../data/config'

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
}

export const countries = raw.countries as unknown as Country[]
export const lastUpdated: string = raw.lastUpdated

export const countryById = new Map(countries.map((c) => [c.id, c]))

/** "Austria / Österreich" (just the English name if both are identical). */
export function displayName(c: Country): string {
  return c.name.de && c.name.de !== c.name.en ? `${c.name.en} / ${c.name.de}` : c.name.en
}

export function flagUrl(c: Country): string {
  return import.meta.env.BASE_URL + c.flag
}

export const countriesIn = (continent: Continent) => countries.filter((c) => c.continent === continent)
