import { createContext } from 'preact'
import { useContext, useEffect, useState } from 'preact/hooks'

// One shared timer for every clock and countdown, aligned to the minute, so
// the page does no work between minute boundaries.

type Listener = (now: Date) => void
const listeners = new Set<Listener>()
let timer: ReturnType<typeof setTimeout> | undefined

function schedule(): void {
  const wait = 60_000 - (Date.now() % 60_000) + 20
  timer = setTimeout(() => {
    const now = new Date()
    listeners.forEach((fn) => fn(now))
    schedule()
  }, wait)
}

export function onMinute(fn: Listener): () => void {
  listeners.add(fn)
  if (timer === undefined) schedule()
  return () => {
    listeners.delete(fn)
    if (listeners.size === 0 && timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }
}

/**
 * Time zone, locale and an optional frozen clock for one mounted screen.
 * Each mount() provides its own, so screens on one page don't share them.
 */
export interface TimeOptions {
  timeZone?: string
  locale?: string
  /**
   * A fixed time stops the clock, so screenshots of clocks, schedules and
   * countdowns come out the same on every run.
   */
  now?: Date
}

export const TimeContext = createContext<TimeOptions>({})

export const useTimeOptions = (): TimeOptions => useContext(TimeContext)

const fixedTime = (t: TimeOptions): Date | undefined =>
  t.now && !Number.isNaN(t.now.getTime()) ? t.now : undefined

/** The current time, updated each minute, or the screen's fixed time. */
export function useMinute(): Date {
  const fixed = fixedTime(useTimeOptions())
  const [now, setNow] = useState(() => new Date())
  useEffect(() => (fixed ? undefined : onMinute(setNow)), [fixed])
  return fixed ?? now
}

// Creating an Intl formatter is far more expensive than using one, so each
// is built once per option set.
const formatters = new Map<string, Intl.DateTimeFormat>()
function formatter(
  options: Intl.DateTimeFormatOptions,
  t: TimeOptions,
  zone = t.timeZone || undefined,
): Intl.DateTimeFormat {
  const locale = t.locale || undefined
  const key = JSON.stringify([locale, zone, options])
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { ...options, timeZone: zone })
    formatters.set(key, f)
  }
  return f
}

/** The time in another zone, for world clocks. */
export function formatClockIn(
  now: Date,
  zone: string,
  hour12: boolean | undefined,
  t: TimeOptions = {},
): string {
  return formatter(
    { hour: '2-digit', minute: '2-digit', hour12 },
    t,
    zone,
  ).format(now)
}

/** Minutes since midnight on the screen's clock, for "HH:MM" schedules. */
export function minutesOfDay(now: Date, t: TimeOptions = {}): number {
  const parts = formatter(
    { hour: '2-digit', minute: '2-digit', hour12: false },
    t,
  ).formatToParts(now)
  const get = (p: string) => Number(parts.find((x) => x.type === p)?.value ?? 0)
  return (get('hour') % 24) * 60 + get('minute')
}

export function formatClock(
  now: Date,
  hour12: boolean | undefined,
  t: TimeOptions = {},
): string {
  return formatter({ hour: '2-digit', minute: '2-digit', hour12 }, t).format(
    now,
  )
}

export function formatDate(now: Date, t: TimeOptions = {}): string {
  return formatter(
    { weekday: 'long', day: 'numeric', month: 'long' },
    t,
  ).format(now)
}

/** "3 d 4 h", "4 h 12 min", "12 min", or "" once the time has passed. */
export function formatCountdown(to: Date, now: Date): string {
  const mins = Math.ceil((to.getTime() - now.getTime()) / 60_000)
  if (!(mins > 0)) return ''
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (d > 0) return `${d} d ${h} h`
  if (h > 0) return `${h} h ${m} min`
  return `${m} min`
}
