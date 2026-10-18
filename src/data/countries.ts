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

// ---- Regions: Africa (54 countries) split into four smaller groups, so it is easier to learn ----
// Rough split by compass direction; Central Africa is shared between West, East and South.
export const REGIONS = ['North Africa', 'West Africa', 'East Africa', 'Southern Africa'] as const
export type Region = (typeof REGIONS)[number]
const REGION_IDS: Record<Region, string[]> = {
  'North Africa': ['MA', 'DZ', 'TN', 'LY', 'EG', 'SD', 'MR', 'ML', 'NE', 'TD'],
  'West Africa': ['SN', 'GM', 'GW', 'GN', 'SL', 'LR', 'CI', 'BF', 'GH', 'TG', 'BJ', 'NG', 'CV', 'CM', 'GQ', 'ST', 'GA'],
  'East Africa': ['ER', 'DJ', 'SO', 'ET', 'SS', 'KE', 'UG', 'RW', 'BI', 'TZ', 'CF', 'CD', 'SC', 'KM'],
  'Southern Africa': ['AO', 'CG', 'ZM', 'MW', 'MZ', 'ZW', 'BW', 'NA', 'ZA', 'LS', 'SZ', 'MG', 'MU'],
}
export const regionOf = new Map<string, Region>(REGIONS.flatMap((r) => REGION_IDS[r].map((id) => [id, r] as [string, Region])))
/** Which continent a region belongs to. */
export const REGION_CONTINENT: Record<Region, Continent> = { 'North Africa': 'Africa', 'West Africa': 'Africa', 'East Africa': 'Africa', 'Southern Africa': 'Africa' }

/** What can be studied: a continent or a region of one. */
export type Area = Continent | Region
export const AREAS: Area[] = [...CONTINENTS, ...REGIONS]
export const isRegion = (a: Area | null): a is Region => !!a && (REGIONS as readonly string[]).includes(a)
export const inArea = (c: Country, area: Area | null) => !area || c.continent === area || regionOf.get(c.id) === area
export const countriesInArea = (area: Area) => countries.filter((c) => inArea(c, area))
/** The continent of an area (Africa for "West Africa"). */
export const continentOf = (area: Area): Continent => (isRegion(area) ? REGION_CONTINENT[area] : area)
