// Which countries the app teaches.
// All UN member states are picked up automatically from the source dataset
// (Vatican City is excluded there because it is only an observer state).
// To add a territory later (e.g. Western Sahara, Hong Kong), add one line below.

export type Status = 'un-member' | 'observer' | 'disputed' | 'territory'

export const EXPECTED_UN_MEMBERS = 193

export const EXTRA_TERRITORIES: { cca2: string; status: Status }[] = [
  { cca2: 'VA', status: 'observer' }, // Vatican City
  { cca2: 'PS', status: 'observer' }, // Palestine
  { cca2: 'TW', status: 'disputed' }, // Taiwan
  { cca2: 'XK', status: 'disputed' }, // Kosovo
  { cca2: 'GL', status: 'territory' }, // Greenland
  // { cca2: 'EH', status: 'disputed' }, // Western Sahara
  // { cca2: 'HK', status: 'territory' }, // Hong Kong
]

export const CONTINENTS = [
  'Europe',
  'Asia',
  'Africa',
  'North America',
  'South America',
  'Oceania',
] as const
export type Continent = (typeof CONTINENTS)[number]
