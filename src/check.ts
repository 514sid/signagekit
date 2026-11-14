import { missingBinds } from './binds'
import {
  contrastWarnings,
  resolveColors,
  type Colors,
  type Scheme,
} from './colors'
import { parseText } from './parse'
import type { Data, ScreenDoc } from './types'
import { validate } from './validate'
import { upgrade } from './version'

export const DEFAULT_ACCENT = '#2563eb'

export interface CheckOptions {
  /** Scheme used when the document doesn't set `colors.scheme`. Default dark. */
  scheme?: Scheme
  /** Accent used when the document doesn't set `colors.accent`. */
  accent?: string
  /**
   * Colors that win over the document's own, like `{ scheme: 'light' }` to
   * see a screen in the other scheme.
   */
  colors?: Colors
  /**
   * Report binds that find nothing in the data. Default true; turn it off
   * when the data arrives later.
   */
  checkBinds?: boolean
}

export interface CheckResult {
  /** The validated document, or null when it can't be rendered at all. */
  doc: ScreenDoc | null
  data: Data
  /** Problems that stop the screen, or part of it, from rendering. */
  errors: string[]
  /** Problems the screen renders through: unknown keys, low contrast, binds. */
  warnings: string[]
}

export type Source = string | object

const isPlainObject = (v: unknown): v is Data =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Accepts JSON or YAML text, or an object that was already parsed. */
async function read(
  src: Source,
  mode: 'layout' | 'data',
): Promise<{ value: unknown; error?: string }> {
  if (typeof src !== 'string') return { value: src }
  if (!src.trim()) return { value: null, error: 'empty' }
  return parseText(src, mode)
}

async function readData(
  src: Source | undefined,
  errors: string[],
): Promise<Data> {
  if (src === undefined || (typeof src === 'string' && !src.trim())) return {}
  const d = await read(src, 'data')
  if (d.error) errors.push(`data: ${d.error}`)
  else if (!isPlainObject(d.value))
    errors.push('data: expected an object (a JSON object or a YAML mapping)')
  else return d.value
  return {}
}

/** Parses, validates and checks a document and its data. Never throws. */
export async function check(
  layout: Source,
  data?: Source,
  options: CheckOptions = {},
): Promise<CheckResult> {
  const dataErrors: string[] = []
  const d = await readData(data, dataErrors)
  const l = await read(layout, 'layout')
  if (l.error)
    return {
      doc: null,
      data: d,
      errors: [`layout: ${l.error}`, ...dataErrors],
      warnings: [],
    }
  // Older formats are upgraded first; only the steps needed are loaded.
  const up = await upgrade(l.value)
  const v = validate(up.doc)
  const warnings = [...up.notes, ...v.warnings]
  if (v.doc) {
    if (options.checkBinds !== false) warnings.push(...missingBinds(v.doc, d))
    const palette = resolveColors(
      { ...v.doc.colors, ...options.colors },
      options.scheme ?? 'dark',
      options.accent ?? DEFAULT_ACCENT,
    )
    warnings.push(...contrastWarnings(palette))
  }
  return { doc: v.doc, data: d, errors: [...v.errors, ...dataErrors], warnings }
}
