// Async work the first render waits for (charts loading their library)
// before mount() resolves.

const pending = new Set<Promise<unknown>>()

export function track(p: Promise<unknown>): void {
  pending.add(p)
  void p.finally(() => pending.delete(p))
}

/** Resolves when tracked work is done, or after `timeout` ms at the latest. */
export async function settled(timeout = 5000): Promise<void> {
  await Promise.race([
    Promise.allSettled([...pending]),
    new Promise((r) => setTimeout(r, timeout)),
  ])
}
