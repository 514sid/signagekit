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

/** What checking a document finds before any data is involved. */
export interface LayoutCheck {
  doc: ScreenDoc | null
  errors: string[]
  /** Upgrade notes and validation warnings. */
  warnings: string[]
  /** Kept apart so bind warnings can go between, where they always were. */
  contrast: string[]
}

/**
 * Parses, upgrades and validates a document and checks its colors. None of
 * this depends on the data, so a screen that only gets new data keeps the
 * result. Never throws.
 */
export async function checkLayout(
  layout: Source,
  options: CheckOptions = {},
): Promise<LayoutCheck> {
  const l = await read(layout, 'layout')
  if (l.error)
    return {
      doc: null,
      errors: [`layout: ${l.error}`],
      warnings: [],
      contrast: [],
    }
  // Older formats are upgraded first; only the steps needed are loaded.
  const up = await upgrade(l.value)
  const v = validate(up.doc)
  const contrast = v.doc
    ? contrastWarnings(
        resolveColors(
          { ...v.doc.colors, ...options.colors },
          options.scheme ?? 'dark',
          options.accent ?? DEFAULT_ACCENT,
        ),
      )
    : []
  return {
    doc: v.doc,
    errors: v.errors,
    warnings: [...up.notes, ...v.warnings],
    contrast,
  }
}

/** Reads the data and checks it against a document already checked. */
export async function checkData(
  layout: LayoutCheck,
  data?: Source,
  options: CheckOptions = {},
): Promise<CheckResult> {
  const dataErrors: string[] = []
  const d = await readData(data, dataErrors)
  const binds =
    layout.doc && options.checkBinds !== false
      ? missingBinds(layout.doc, d)
      : []
  return {
    doc: layout.doc,
    data: d,
    errors: [...layout.errors, ...dataErrors],
    warnings: [...layout.warnings, ...binds, ...layout.contrast],
  }
}

/** Parses, validates and checks a document and its data. Never throws. */
export async function check(
  layout: Source,
  data?: Source,
  options: CheckOptions = {},
): Promise<CheckResult> {
  return checkData(await checkLayout(layout, options), data, options)
}
