// Checks a screen document before it is rendered. Messages name the exact
// path so an agent can fix its JSON without seeing the screen.
//
// Errors drop the zone they belong to; the rest of the screen still renders.
// Warnings never block rendering (typos in optional properties, unused zones).

import { FORMAT, versionOf } from './version'
import { COLOR_KEYS, HEX, type Colors } from './colors'
import { layout } from './validate-layout'
import { ICON_NAMES, isIcon } from './icons'
import type { Component, ComponentType, ScreenDoc } from './types'
import {
  has,
  isBind,
  isObj,
  list,
  number,
  oneOf,
  shape,
  SURFACE,
  value,
  type Check,
  type Obj,
} from './checks'
import { SPECS, type Spec } from './specs'

export interface Result {
  doc: ScreenDoc | null
  errors: string[]
  warnings: string[]
}

const MAX_DEPTH = 4

// Properties every component may have, next to its own required and optional ones.
const SHARED: Record<string, Check> = {
  surface: (v, at, e) => SURFACE(v, at, e),
  title: (v, at, e) => value(v, at, e),
  size: number(8, 400),
  weight: number(0.1, 20),
  icon: (v, at, e) =>
    isIcon(v)
      ? undefined
      : e.push(`${at}: unknown icon, expected one of ${ICON_NAMES.join(', ')}`),
}

function properties(
  c: Obj,
  spec: Spec,
  at: string,
  errs: string[],
  warns: string[],
): void {
  for (const [k, check] of Object.entries(spec.required)) {
    if (!has(c, k)) errs.push(`${at}.${k}: required for ${c.type}`)
    else check(c[k], `${at}.${k}`, errs, warns)
  }
  for (const [k, v] of Object.entries(c)) {
    if (k === 'type' || has(spec.required, k)) continue
    const check = has(spec.optional, k)
      ? spec.optional[k]
      : has(SHARED, k)
        ? SHARED[k]
        : undefined
    if (check) check(v, `${at}.${k}`, errs, warns)
    else warns.push(`${at}.${k}: unknown property for ${c.type}, ignored`)
  }
}

function rowWidths(c: Obj, at: string, warns: string[]): void {
  if (!Array.isArray(c.rows) || !Array.isArray(c.columns)) return
  const width = c.columns.length
  c.rows.forEach((r, i) => {
    if (Array.isArray(r) && r.length !== width)
      warns.push(
        `${at}.rows[${i}]: has ${r.length} cells, columns has ${width}`,
      )
  })
}

function component(
  c: unknown,
  at: string,
  errs: string[],
  warns: string[],
  depth = 0,
): void {
  if (!isObj(c))
    return void errs.push(`${at}: expected an object with a "type"`)
  const spec =
    typeof c.type === 'string' && has(SPECS, c.type)
      ? SPECS[c.type as ComponentType]
      : undefined
  if (!spec) {
    errs.push(
      `${at}.type: unknown component ${JSON.stringify(c.type)}, expected one of ${Object.keys(SPECS).join(', ')}`,
    )
    return
  }
  properties(c, spec, at, errs, warns)
  if (c.type === 'table') rowWidths(c, at, warns)
  if (
    c.type === 'chart' &&
    c.kind === 'column' &&
    Array.isArray(c.series) &&
    c.series.length > 1
  )
    errs.push(
      `${at}.series: column charts take one series, use a line chart to compare several`,
    )
  if (c.type === 'stack') {
    if (depth >= MAX_DEPTH)
      return void errs.push(`${at}: stacks nest at most ${MAX_DEPTH} deep`)
    if (!Array.isArray(c.items))
      return void errs.push(`${at}.items: expected an array of components`)
    c.items.forEach((x, i) =>
      component(x, `${at}.items[${i}]`, errs, warns, depth + 1),
    )
  }
}

// $schema is what editors read for autocomplete; it is accepted and ignored.
const TOP_LEVEL = ['$schema', 'version', 'colors', 'alert', 'layout', 'zones']

const LEVEL = (v: unknown, at: string, e: string[]) =>
  isBind(v) ? undefined : oneOf('info', 'good', 'warning', 'danger')(v, at, e)
const ALERT_ICON = (v: unknown, at: string, e: string[]) =>
  isBind(v) || isIcon(v)
    ? undefined
    : e.push(`${at}: unknown icon, expected one of ${ICON_NAMES.join(', ')}`)

const alertFields = shape(
  {},
  {
    level: LEVEL,
    icon: ALERT_ICON,
    title: value,
    message: value,
    text: value,
    steps: list(value),
    footer: value,
    mode: oneOf('takeover', 'banner'),
    until: value,
    state: oneOf('warning', 'danger'),
  },
)

/** A bind to an object in the data, or the fields themselves. */
function alertBlock(
  v: unknown,
  at: string,
  errs: string[],
  warns: string[],
): void {
  if (isBind(v)) return value(v, at, errs)
  alertFields(v, at, errs, warns)
  if (isObj(v) && !('title' in v) && !('message' in v) && !('text' in v))
    errs.push(`${at}: needs a title or a message`)
}

/** Bad colors are dropped one by one; the scheme defaults fill the gap. */
function colorBlock(
  v: unknown,
  errs: string[],
  warns: string[],
): Colors | undefined {
  if (v === undefined) return undefined
  if (!isObj(v))
    return (void errs.push('colors: expected an object'), undefined)
  const out: Colors = {}
  for (const [k, c] of Object.entries(v)) {
    if (k === 'scheme') {
      if (c === 'dark' || c === 'light') out.scheme = c
      else errs.push('colors.scheme: expected "dark" or "light"')
    } else if ((COLOR_KEYS as readonly string[]).includes(k)) {
      if (typeof c === 'string' && HEX.test(c))
        out[k as (typeof COLOR_KEYS)[number]] = c
      else errs.push(`colors.${k}: expected a hex color like "#1e293b"`)
    } else {
      warns.push(
        `colors.${k}: unknown color, expected one of scheme, ${COLOR_KEYS.join(', ')}`,
      )
    }
  }
  return out
}

export function validate(input: unknown): Result {
  const errors: string[] = []
  const warnings: string[] = []
  if (!isObj(input))
    return {
      doc: null,
      errors: ['expected a JSON object with "layout" and "zones"'],
      warnings,
    }

  // A newer document is shown as far as this version can read it: what it
  // can't read is skipped with a warning, not an error.
  const v = versionOf(input)
  const newer = v !== null && v > FORMAT
  if (v === null) errors.push('version: expected a whole number from 1')
  else if (newer)
    warnings.push(
      `version: written for format ${v}; this signagekit reads format ${FORMAT}, so anything newer is skipped`,
    )
  else if (v < FORMAT)
    errors.push(`version: format ${v} needs upgrading; use check() or mount()`)
  const colors = colorBlock(input.colors, errors, warnings)
  // A broken alert is dropped, so the screen still renders without it.
  const alertErrors: string[] = []
  if (input.alert !== undefined)
    alertBlock(input.alert, 'alert', alertErrors, warnings)
  errors.push(...alertErrors)
  const alert =
    input.alert !== undefined && alertErrors.length === 0
      ? (input.alert as ScreenDoc['alert'])
      : undefined
  for (const k of Object.keys(input)) {
    if (!TOP_LEVEL.includes(k))
      warnings.push(`${k}: unknown top-level property, ignored`)
  }

  // A broken layout means there is no grid to put zones in.
  const layoutErrors: string[] = []
  const areas = layout(input.layout, layoutErrors)
  if (layoutErrors.length)
    return { doc: null, errors: [...errors, ...layoutErrors], warnings }

  if (!isObj(input.zones))
    return {
      doc: null,
      errors: [...errors, 'zones: expected an object of named components'],
      warnings,
    }

  const zones: Record<string, Component> = {}
  for (const [name, c] of Object.entries(input.zones)) {
    if (!areas.includes(name)) {
      warnings.push(`zones.${name}: not placed in the layout, not shown`)
      continue
    }
    const zoneErrors: string[] = []
    component(c, `zones.${name}`, zoneErrors, warnings)
    if (zoneErrors.length) (newer ? warnings : errors).push(...zoneErrors)
    else zones[name] = c as Component
  }
  for (const name of areas) {
    if (!has(input.zones, name))
      warnings.push(`layout: "${name}" has no zone, left empty`)
  }

  const doc: ScreenDoc = {
    version: FORMAT,
    colors,
    alert,
    layout: input.layout as ScreenDoc['layout'],
    zones,
  }
  return { doc, errors, warnings }
}
