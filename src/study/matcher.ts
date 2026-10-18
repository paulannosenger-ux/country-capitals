// Checks a typed capital against a country's capitals and accepted aliases.
// Forgiving about: upper/lower case, accents, punctuation, "St."/"Saint", and small typos.
import type { Country } from '../data/countries'

/** Lowercase, strip accents/punctuation, unify "saint"/"st." etc. */
export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents: é -> e
    .toLowerCase()
    // letters that do not decompose into base letter + accent
    .replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/œ/g, 'oe')
    .replace(/[øð]/g, 'o').replace(/[łľ]/g, 'l').replace(/đ/g, 'd').replace(/ı/g, 'i').replace(/þ/g, 'th')
    .replace(/&/g, ' and ')
    .replace(/['’`´.]/g, '') // apostrophes and dots vanish: "Sana'a" -> "sanaa", "St." -> "st"
    .replace(/[^a-z0-9]+/g, ' ') // hyphens etc. become spaces: "Port-au-Prince" -> "port au prince"
    .replace(/\bsaint\b/g, 'st')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Edit distance where swapping two neighbouring letters counts as ONE mistake ("Pairs" -> "Paris"). */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }
  return d[a.length][b.length]
}

/** How many typos we allow, depending on the length of the correct answer. */
export function tolerance(length: number): number {
  if (length <= 3) return 0
  if (length <= 7) return 1
  if (length <= 11) return 2
  return 3
}

export type AnswerResult =
  | { kind: 'correct' } // exact (after normalizing)
  | { kind: 'typo' } // accepted, but with a small spelling mistake
  | { kind: 'wrong' }

/** normalized answer -> ids of countries that have it (so another country's answer is never accepted as a "typo") */
function buildIndex(all: Country[], answers: (c: Country) => string[]): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>()
  for (const c of all) {
    for (const name of answers(c)) {
      const key = normalize(name)
      if (!index.has(key)) index.set(key, new Set())
      index.get(key)!.add(c.id)
    }
  }
  return index
}

type Answers = (c: Country) => string[]
const indexCache = new WeakMap<Answers, { for: Country[]; index: Map<string, Set<string>> }>()

function check(input: string, country: Country, all: Country[], answers: Answers): AnswerResult {
  const typed = normalize(input)
  if (!typed) return { kind: 'wrong' }

  const accepted = answers(country).map(normalize)
  if (accepted.includes(typed)) return { kind: 'correct' }

  // "Kingston" for St. Vincent is one typo away from "Kingstown" but is another country's capital -> wrong.
  let cached = indexCache.get(answers)
  if (!cached || cached.for !== all) {
    cached = { for: all, index: buildIndex(all, answers) }
    indexCache.set(answers, cached)
  }
  const owners = cached.index.get(typed)
  if (owners && !owners.has(country.id)) return { kind: 'wrong' }

  for (const candidate of accepted) {
    if (editDistance(typed, candidate) <= tolerance(candidate.length)) return { kind: 'typo' }
  }
  return { kind: 'wrong' }
}

const capitalAnswers: Answers = (c) => [...c.capitals, ...c.capitalAliases]
// "The Gambia" / "the Netherlands": a leading "the" is optional
const stripThe = (n: string) => n.replace(/^the\s+/i, '')
const nameAnswers: Answers = (c) =>
  [c.name.en, ...(c.name.de ? [c.name.de] : []), ...(c.nameAliases ?? [])].flatMap((n) => [n, stripThe(n)])

export function checkAnswer(input: string, country: Country, all: Country[]): AnswerResult {
  return check(input, country, all, capitalAnswers)
}

/** Same rules for the country's name (English, German or a common alternative like "USA"). */
export function checkCountryName(input: string, country: Country, all: Country[]): AnswerResult {
  return check(stripThe(input.trim()), country, all, nameAnswers)
}
