export type Obj = Record<string, unknown>
export type Check = (v: unknown, at: string, errs: string[]) => void

export const isObj = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
export const isBind = (v: unknown): boolean =>
  isObj(v) && typeof v.bind === 'string' && v.bind.startsWith('/')

export const value: Check = (v, at, errs) => {
  if (typeof v === 'string' || typeof v === 'number') return
  if (!isBind(v))
    return void errs.push(
      `${at}: expected a string, a number or {"bind": "/path"}`,
    )
  const { fallback } = v as Obj
  if (
    fallback !== undefined &&
    typeof fallback !== 'string' &&
    typeof fallback !== 'number'
  )
    errs.push(`${at}.fallback: expected a string or a number`)
  for (const k of Object.keys(v as Obj))
    if (k !== 'bind' && k !== 'fallback')
      errs.push(`${at}.${k}: unknown property, a bind takes bind and fallback`)
}
export const oneOf =
  (...allowed: unknown[]): Check =>
  (v, at, errs) => {
    if (!allowed.includes(v))
      errs.push(
        `${at}: expected one of ${allowed.map((a) => JSON.stringify(a)).join(', ')}`,
      )
  }
export const bool: Check = (v, at, errs) => {
  if (typeof v !== 'boolean') errs.push(`${at}: expected true or false`)
}
export const str: Check = (v, at, errs) => {
  if (typeof v !== 'string') errs.push(`${at}: expected a string`)
}
export const seconds: Check = (v, at, errs) => {
  if (typeof v !== 'number' || !(v >= 3 && v <= 3600))
    errs.push(`${at}: expected a number of seconds from 3 to 3600`)
}
export const list =
  (item: Check): Check =>
  (v, at, errs) => {
    if (isBind(v)) return
    if (!Array.isArray(v))
      return void errs.push(`${at}: expected an array or {"bind": "/path"}`)
    v.forEach((x, i) => item(x, `${at}[${i}]`, errs))
  }
export const strings: Check = (v, at, errs) => {
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string'))
    errs.push(`${at}: expected an array of strings`)
}

export const chartSeries: Check = (v, at, errs) => {
  if (!Array.isArray(v) || v.length < 1 || v.length > 8)
    return void errs.push(`${at}: expected 1 to 8 series`)
  v.forEach((s, i) => {
    if (!isObj(s) || !('name' in s) || !('values' in s))
      return void errs.push(
        `${at}[${i}]: expected {"name": ..., "values": [...]}`,
      )
    value(s.name, `${at}[${i}].name`, errs)
    list(value)(s.values, `${at}[${i}].values`, errs)
  })
}

// A literal state must be one of the four; a bound one is checked at render
// time, where anything unknown falls back to neutral.
export const stateValue: Check = (v, at, errs) =>
  isBind(v)
    ? undefined
    : oneOf('neutral', 'good', 'warning', 'danger')(v, at, errs)

export const ALIGN = oneOf('start', 'center', 'end')
export const SURFACE = oneOf('base', 'raised', 'accent')

export const int =
  (min: number, max: number): Check =>
  (v, at, errs) => {
    if (!(Number.isInteger(v) && (v as number) >= min && (v as number) <= max))
      errs.push(`${at}: expected a whole number from ${min} to ${max}`)
  }

/** An object with required and optional fields, each with its own check. */
export const shape =
  (
    required: Record<string, Check>,
    optional: Record<string, Check> = {},
  ): Check =>
  (v, at, errs) => {
    if (!isObj(v)) {
      const keys = Object.keys(required).join(', ')
      return void errs.push(`${at}: expected an object with ${keys}`)
    }
    for (const [k, check] of Object.entries(required)) {
      if (!(k in v)) errs.push(`${at}.${k}: required`)
      else check(v[k], `${at}.${k}`, errs)
    }
    for (const [k, x] of Object.entries(v)) {
      if (k in required) continue
      if (optional[k]) optional[k](x, `${at}.${k}`, errs)
      else errs.push(`${at}.${k}: unknown property`)
    }
  }

/** Labelled amounts for meters, bars and split. */
export const part = shape(
  { label: value, value },
  { max: value, state: stateValue },
)

/** A list of at most `max` items, or a binding. */
export const capped =
  (item: Check, max: number): Check =>
  (v, at, errs) => {
    if (Array.isArray(v) && v.length > max)
      return void errs.push(`${at}: at most ${max} items`)
    list(item)(v, at, errs)
  }

/** An IANA time zone the screen's browser knows, like "Europe/London". */
const timezone: Check = (v, at, errs) => timeZone(v, at, errs)

export const timeZone: Check = (v, at, errs) => {
  try {
    if (typeof v !== 'string') throw new Error()
    new Intl.DateTimeFormat(undefined, { timeZone: v })
  } catch {
    errs.push(`${at}: expected a time zone like "Europe/London"`)
  }
}

export const number =
  (min: number, max: number): Check =>
  (v, at, errs) => {
    if (typeof v !== 'number' || !(v >= min && v <= max))
      errs.push(`${at}: expected a number from ${min} to ${max}`)
  }

const anyNumber: Check = (v, at, errs) => {
  if (typeof v !== 'number' || !Number.isFinite(v))
    errs.push(`${at}: expected a number`)
}

export const thresholds = shape({}, { warning: anyNumber, danger: anyNumber })

export const finite = anyNumber

/** A clock entry: label and timezone (`zone` is the older name). */
export const clockZone: Check = (v, at, errs) => {
  if (isObj(v) && 'zone' in v && !('timezone' in v)) {
    // Report problems under the key the author wrote.
    const { zone, ...rest } = v
    const own: string[] = []
    shape({ label: value, timezone })({ ...rest, timezone: zone }, at, own)
    errs.push(...own.map((e) => e.replace(`${at}.timezone`, `${at}.zone`)))
    return
  }
  shape({ label: value, timezone })(v, at, errs)
}

/** Relative widths, one positive number per column. */
export const widths: Check = (v, at, errs) => {
  if (!Array.isArray(v) || v.some((w) => typeof w !== 'number' || !(w > 0)))
    errs.push(`${at}: expected positive numbers, like [3, 1, 1]`)
}
