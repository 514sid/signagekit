// Format versions. A document says which format it's written in with
// `version` (default 1). There is one renderer, for the current format;
// older documents are upgraded to it one step at a time, and each step is a
// separate chunk, so a current document loads no upgrade code at all.
//
// A document newer than this library is rendered as far as it can be: known
// properties work, unknown ones are reported and skipped.
//
// To change the format: bump FORMAT, write src/migrations/vN.ts exporting a
// Migration from N to N+1, and register it below as
//   N: () => import('./migrations/vN'),
// A migration must never fail on a valid document of its version. When a
// property has no equivalent, it drops it and says so in `notes`.

export const FORMAT = 1

type Obj = Record<string, unknown>

/** Upgrades a document from version N to N+1. */
export type Migration = (doc: Obj) => { doc: Obj; notes: string[] }

export type Migrations = Record<number, () => Promise<{ default: Migration }>>

const MIGRATIONS: Migrations = {}

export interface Upgraded {
  /** The document in the current format, or as written when newer. */
  doc: unknown
  /** What changed or was lost on the way, as warnings. */
  notes: string[]
}

const isObj = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** The version a document declares, or null when it isn't a whole number. */
export function versionOf(doc: Obj): number | null {
  const v = doc.version ?? 1
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 ? v : null
}

/**
 * Brings a parsed document to the current format. Documents already current,
 * newer, or not even objects pass through untouched for validate() to judge.
 */
export async function upgrade(
  input: unknown,
  migrations: Migrations = MIGRATIONS,
  current: number = FORMAT,
): Promise<Upgraded> {
  if (!isObj(input)) return { doc: input, notes: [] }
  const from = versionOf(input)
  if (from === null || from >= current) return { doc: input, notes: [] }

  let doc: Obj = input
  const notes: string[] = []
  for (let v = from; v < current; v++) {
    const load = migrations[v]
    if (!load) {
      notes.push(`version: no upgrade from ${v} to ${v + 1}, shown as is`)
      return { doc, notes }
    }
    const step = (await load()).default(doc)
    doc = { ...step.doc, version: v + 1 }
    notes.push(...step.notes.map((n) => `version ${v} to ${v + 1}: ${n}`))
  }
  return { doc, notes }
}
