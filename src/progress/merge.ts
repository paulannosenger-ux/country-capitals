// Combines two copies of the progress (e.g. this browser + the cloud account), so nothing learned is lost.
import type { Card } from './scheduler'
import type { AppData, LogEntry } from './storage'

/** The copy of a card that has seen more practice wins; on a tie the one due later (= answered later). */
function newerCard(a: Card | undefined, b: Card | undefined): Card | undefined {
  if (!a) return b
  if (!b) return a
  if (a.reps !== b.reps) return a.reps > b.reps ? a : b
  const due = (c: Card) => (c.state === 'review' ? c.dueDay * 86_400_000 : c.dueAt)
  return due(a) >= due(b) ? a : b
}

/** Both review logs, without duplicates, oldest first. */
function mergeLogs(a: LogEntry[], b: LogEntry[]): LogEntry[] {
  const seen = new Set<string>()
  const out: LogEntry[] = []
  for (const e of [...a, ...b]) {
    const key = `${e.t}:${e.id}`
    if (!seen.has(key)) { seen.add(key); out.push(e) }
  }
  return out.sort((x, y) => x.t - y.t)
}

/** `local` = this browser, `remote` = the account. Settings come from the account. */
export function mergeAppData(local: AppData, remote: AppData): AppData {
  const cards: Record<string, Card> = {}
  for (const id of new Set([...Object.keys(local.cards), ...Object.keys(remote.cards)])) {
    cards[id] = newerCard(local.cards[id], remote.cards[id])!
  }
  const daily = local.daily.day !== remote.daily.day
    ? (local.daily.day > remote.daily.day ? local.daily : remote.daily)
    : {
        day: local.daily.day,
        newCount: Math.max(local.daily.newCount, remote.daily.newCount),
        reviewCount: Math.max(local.daily.reviewCount, remote.daily.reviewCount),
      }
  return { version: 1, settings: remote.settings, cards, daily, log: mergeLogs(local.log, remote.log) }
}
