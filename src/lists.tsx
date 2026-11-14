import { items, text } from './data'
import { DASH, Empty } from './empty'
import { StateIcon, stateText } from './stat'
import {
  formatClock,
  formatClockIn,
  minutesOfDay,
  useMinute,
  useTimeOptions,
  type TimeOptions,
} from './time'
import type { Clocks, Data, Queue, Schedule, Status, Value } from './types'

type Row = Record<string, Value | undefined>

export function StatusView({ c, data }: { c: Status; data: Data }) {
  const rows = items(c.items, data).filter(
    (raw) => raw && text((raw as Row).label, data),
  )
  if (!rows.length) return <Empty />
  return (
    <ul class="c-status" data-fit="wrap" data-kind="status">
      {rows.map((raw, i) => {
        const r = (raw ?? {}) as Row
        const state = stateText(r.state, data)
        return (
          <li key={i}>
            {state === 'neutral' ? (
              <span class="c-status-dot" />
            ) : (
              <StateIcon state={state} />
            )}
            <span class="c-status-label">{text(r.label, data)}</span>
            <span class="c-status-note">{text(r.note, data)}</span>
          </li>
        )
      })}
    </ul>
  )
}

const HHMM = /^(\d{1,2}):(\d{2})$/

/**
 * A comparable time: minutes of the day for "HH:MM", or epoch milliseconds
 * for a full date and time. Null when the text is neither.
 */
function when(s: string): { kind: 'day' | 'abs'; at: number } | null {
  const m = HHMM.exec(s.trim())
  if (m) return { kind: 'day', at: Number(m[1]) * 60 + Number(m[2]) }
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : { kind: 'abs', at: t }
}

export interface Entry {
  start: string
  title: string
  detail: string
  tag: 'now' | 'next' | ''
}

/**
 * Entries from the current one onward. An entry ends at its `end`, else when
 * the next later entry of the same kind starts, else an hour after it starts.
 */
export function upcoming(
  raw: unknown[],
  data: Data,
  now: Date,
  limit: number,
  time: TimeOptions = {},
): Entry[] {
  const nowFor = { day: minutesOfDay(now, time), abs: now.getTime() }
  const hour = { day: 60, abs: 3_600_000 }
  const list = raw
    .map((x) => (x ?? {}) as Row)
    .map((r) => ({ r, start: when(text(r.start, data)) }))
    .filter((e) => e.start !== null)
    .sort((a, b) => a.start!.at - b.start!.at)
  const live = list.filter((e) => {
    const s = e.start!
    // Entries that share a start run side by side, and minutes of the day
    // never compare with a full date, so only a later start of the same kind
    // ends this one.
    const end =
      when(text(e.r.end, data))?.at ??
      list.find((x) => x.start!.kind === s.kind && x.start!.at > s.at)?.start!
        .at ??
      s.at + hour[s.kind]
    return end > nowFor[s.kind]
  })
  // Everything that has started is on now; the first entry after that is next.
  let nextGiven = false
  return live.slice(0, limit).map((e) => {
    const started = e.start!.at <= nowFor[e.start!.kind]
    const tag = started ? 'now' : nextGiven ? '' : 'next'
    if (!started) nextGiven = true
    return {
      start: text(e.r.start, data),
      title: text(e.r.title, data),
      detail: text(e.r.detail, data),
      tag,
    }
  })
}

/** Shows "HH:MM" as written and a full date and time as a clock time. */
function shortTime(s: string, time: TimeOptions): string {
  if (HHMM.test(s.trim())) return s.trim()
  const t = Date.parse(s)
  return Number.isNaN(t) ? s : formatClock(new Date(t), undefined, time)
}

export function ScheduleView({ c, data }: { c: Schedule; data: Data }) {
  const now = useMinute()
  const time = useTimeOptions()
  const rows = upcoming(items(c.items, data), data, now, c.rows ?? 5, time)
  return (
    <ol class="c-schedule" data-fit="wrap" data-kind="schedule">
      {rows.length === 0 && (
        <li class="c-schedule-empty">Nothing more today</li>
      )}
      {rows.map((r, i) => {
        const tag = r.tag
        return (
          <li key={i} class={tag ? `is-${tag}` : ''}>
            <span class="c-schedule-time">{shortTime(r.start, time)}</span>
            <span class="c-schedule-what">
              <span class="c-schedule-title">{r.title}</span>
              {r.detail && <span class="c-schedule-detail">{r.detail}</span>}
            </span>
            {tag && (
              <span class="c-schedule-tag">
                {tag === 'now' ? 'Now' : 'Next'}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function QueueView({ c, data }: { c: Queue; data: Data }) {
  const recent = c.recent ? items(c.recent, data) : []
  return (
    <div class="c-queue" data-fit="wrap" data-kind="queue">
      <div class="c-stat-label">{text(c.label, data) || 'Now serving'}</div>
      <div class="c-queue-current">
        {/* A ticket is a code: "042" keeps its zero and gets no separators. */}
        {text(c.current, data) || DASH}
      </div>
      {recent.length > 0 && (
        <div class="c-queue-recent">
          {recent.slice(0, 6).map((v, i) => (
            <span key={i}>{text(v as Value, data)}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export function ClocksView({ c, data }: { c: Clocks; data: Data }) {
  const now = useMinute()
  const time = useTimeOptions()
  return (
    <ul class="c-clocks" data-fit="wrap" data-kind="clocks">
      {c.zones.map((z, i) => (
        <li key={i}>
          <span class="c-clocks-label">{text(z.label, data)}</span>
          <span class="c-clocks-time">
            {formatClockIn(now, z.timezone ?? z.zone ?? 'UTC', c.hour12, time)}
          </span>
        </li>
      ))}
    </ul>
  )
}
