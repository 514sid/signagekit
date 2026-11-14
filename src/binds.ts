// Finds binds whose path is not in the data, so an author (or an AI) learns
// about a typo or a missing value without having to see the screen.

import { getPath, isBind } from './data'
import type { Data } from './types'

function walk(v: unknown, at: string, data: Data, out: string[]): void {
  if (isBind(v)) {
    if (getPath(data, v.bind) === undefined && v.fallback === undefined)
      out.push(`${at}: ${v.bind} is not in the data, shown as empty`)
    return
  }
  if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}[${i}]`, data, out))
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v))
      walk(x, at ? `${at}.${k}` : k, data, out)
}

/** Warnings for every bind in the zones and the alert that finds nothing. */
export function missingBinds(
  doc: { zones: Record<string, unknown>; alert?: unknown },
  data: Data,
): string[] {
  const out: string[] = []
  walk(doc.zones, 'zones', data, out)
  if (doc.alert) walk(doc.alert, 'alert', data, out)
  return out
}
