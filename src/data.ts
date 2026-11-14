import type { Data, Value } from './types'

/** Reads "/menu/0/price" from the data. Missing paths give undefined. */
export function getPath(data: unknown, path: string): unknown {
  let cur = data
  for (const key of path.split('/')) {
    if (key === '') continue
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

export function isBind(
  v: unknown,
): v is { bind: string; fallback?: string | number } {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as { bind?: unknown }).bind === 'string'
  )
}

/**
 * Resolves a value to display text. A bind that is missing or empty in the
 * data shows its `fallback`; without one it resolves to "" and the component
 * shows its own empty state.
 */
export function text(v: Value | undefined, data: Data): string {
  const raw = isBind(v) ? getPath(data, v.bind) : v
  const shown =
    raw === undefined || raw === null || typeof raw === 'object'
      ? ''
      : String(raw)
  if (shown === '' && isBind(v) && v.fallback !== undefined)
    return String(v.fallback)
  return shown
}

/** Resolves a value that should be a list, literal or bound. */
export function items<T>(v: T[] | { bind: string }, data: Data): unknown[] {
  const raw = isBind(v) ? getPath(data, v.bind) : v
  return Array.isArray(raw) ? raw : []
}

/** Deep merge: objects merge key by key, arrays and values are replaced. */
export function merge(base: unknown, over: unknown): unknown {
  const plain = (x: unknown): x is Record<string, unknown> =>
    typeof x === 'object' && x !== null && !Array.isArray(x)
  if (!plain(base) || !plain(over)) return over === undefined ? base : over
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(over)) out[k] = merge(base[k], v)
  return out
}
