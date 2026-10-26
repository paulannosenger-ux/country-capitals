// Rivers, waters and mountains: the list (data/nature.ts), answer checking and the saved quiz progress.
// Progress lives in its own localStorage key, separate from the flashcards and the map quiz.
import { NATURE, type NatureItem, type NatureKind } from '../../data/nature'
import type { Continent } from '../data/countries'
import type { Lang } from '../i18n'
import { editDistance, normalize, tolerance, type AnswerResult } from '../study/matcher'

export { NATURE, type NatureItem, type NatureKind }
export const KINDS: NatureKind[] = ['river', 'water', 'mountains']
export type KindFilter = NatureKind | 'all'

export const itemsFor = (continent: Continent, kind: KindFilter) =>
  NATURE.filter((n) => n.areas.includes(continent) && (kind === 'all' || n.kind === kind))

export const natureName = (n: NatureItem, lang: Lang) => (lang === 'de' ? n.de : n.en)
/** The name in the other language, if it is different ("Danube" next to "Donau"). */
export const otherNatureName = (n: NatureItem, lang: Lang) => {
  const o = lang === 'de' ? n.en : n.de
  return normalize(o) === normalize(natureName(n, lang)) ? null : o
}

const answersOf = (n: NatureItem) => [n.en, n.de, ...(n.aliases ?? [])]
// "the Alps", "der Rhein", "die Donau", "das Mittelmeer": the article is optional
const stripArticle = (s: string) => s.trim().replace(/^(the|der|die|das)\s+/i, '')

let index: Map<string, Set<string>> | null = null
/** normalized name -> ids that have it (so another item's exact name is never accepted as a typo) */
function nameIndex() {
  if (!index) {
    index = new Map()
    for (const n of NATURE) {
      for (const a of answersOf(n)) {
        const k = normalize(stripArticle(a))
        if (!index.has(k)) index.set(k, new Set())
        index.get(k)!.add(n.id)
      }
    }
  }
  return index
}

/** Same rules as for capitals: case, accents and small typos are forgiven; English and German both count. */
export function checkNature(input: string, item: NatureItem): AnswerResult {
  const typed = normalize(stripArticle(input))
  if (!typed) return { kind: 'wrong' }
  const accepted = answersOf(item).map((a) => normalize(stripArticle(a)))
  if (accepted.includes(typed)) return { kind: 'correct' }
  const owners = nameIndex().get(typed)
  if (owners && !owners.has(item.id)) return { kind: 'wrong' } // "Huron" for Lake Erie
  for (const a of accepted) if (editDistance(typed, a) <= tolerance(a.length)) return { kind: 'typo' }
  return { kind: 'wrong' }
}

// ---- saved progress: per item, whether it was known the last time it was asked ----
export type NatureStatus = 'known' | 'missed'
const KEY = 'country-capitals:nature:v1'

export function loadNature(): Record<string, NatureStatus> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}
export function saveNature(s: Record<string, NatureStatus>) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private window etc.: just not remembered */ }
}
