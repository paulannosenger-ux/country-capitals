// "Practice all": one run through every country of a continent, independent of the review schedule.
// A missed country goes back into the queue a few cards later, so it is asked again in the same round.

export function shuffle<T>(list: T[], random: () => number = Math.random): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** The first card was answered correctly: drop it. */
export const passed = (queue: string[]) => queue.slice(1)

/** The first card was missed: ask it again after `gap` other cards (or at the end, if fewer are left). */
export function missed(queue: string[], gap = 4): string[] {
  const [head, ...rest] = queue
  if (head === undefined) return []
  const at = Math.min(gap, rest.length)
  return [...rest.slice(0, at), head, ...rest.slice(at)]
}
