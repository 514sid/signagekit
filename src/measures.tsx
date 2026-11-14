import { items, text } from './data'
import { DASH, Empty } from './empty'
import {
  formatValue,
  StateIcon,
  STATE_WORDS,
  stateOf,
  stateText,
  thresholdState,
} from './stat'
import type {
  Bars,
  Data,
  Meter,
  Meters,
  Part,
  Parts,
  Split,
  Value,
} from './types'

const num = (s: string) => {
  const n = parseFloat(s.replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}
const share = (v: number, max: number) =>
  max > 0 ? Math.min(1, Math.max(0, v / max)) : 0
const pct = (v: number) => `${Math.round(v * 1000) / 10}%`

interface Amount {
  label: string
  value: number
  shown: string
  max: number | null
  state: string
}

function amounts(v: Parts, data: Data): Amount[] {
  return items(v, data).map((raw) => {
    const p = (raw ?? {}) as Part
    const shown = text(p.value, data)
    return {
      label: text(p.label, data),
      value: num(shown),
      shown: formatValue(shown),
      max: p.max === undefined ? null : num(text(p.max, data)),
      state: stateText(p.state as Value | undefined, data),
    }
  })
}

/** A track with a fill; the fill takes the state color, else the accent. */
function Bar({ value, state }: { value: number; state: string }) {
  return (
    <div class={`c-bar fill-${state}`}>
      <div class="c-bar-fill" style={{ width: pct(value) }} />
    </div>
  )
}

/** Icon and text, so a state never relies on the bar color alone. */
function StateLabel({ state, label }: { state: string; label: string }) {
  const words = label || STATE_WORDS[state] || ''
  if (!words) return null
  return (
    <div class="c-stat-label">
      {state !== 'neutral' && <StateIcon state={state} />}
      {words}
    </div>
  )
}

export function MeterView({ c, data }: { c: Meter; data: Data }) {
  const shown = text(c.value, data)
  const maxShown = text(c.max ?? 100, data)
  const unit = text(c.unit, data)
  const state = stateOf(c, data)
  return (
    <div class="c-meter" data-fit="wrap" data-kind="meter">
      <div class="c-meter-figure">
        {formatValue(shown) || DASH}
        <span class="c-meter-of">
          {' / '}
          {formatValue(maxShown)}
          {unit && ` ${unit}`}
        </span>
      </div>
      <Bar value={share(num(shown), num(maxShown))} state={state} />
      <StateLabel state={state} label={text(c.label, data)} />
    </div>
  )
}

export function MetersView({ c, data }: { c: Meters; data: Data }) {
  const unit = text(c.unit, data)
  const max = num(text(c.max ?? 100, data))
  const rows = amounts(c.items, data)
    .filter((a) => a.label || a.shown)
    .map((a) =>
      a.state === 'neutral' && a.shown
        ? { ...a, state: thresholdState(a.value, c.thresholds) }
        : a,
    )
  if (!rows.length) return <Empty />
  return (
    <div class="c-meters" data-fit="wrap" data-kind="meters">
      {rows.map((a, i) => (
        <div class="c-meters-row" key={i}>
          <div class="c-meters-head">
            <span class="c-meters-label">
              {a.state !== 'neutral' && <StateIcon state={a.state} />}
              {a.label}
            </span>
            <span class="c-meters-value">
              {a.shown || DASH}
              <span class="c-meter-of">
                {' / '}
                {formatValue(String(a.max ?? max))}
                {unit && ` ${unit}`}
              </span>
            </span>
          </div>
          <Bar value={share(a.value, a.max ?? max)} state={a.state} />
        </div>
      ))}
    </div>
  )
}

/** Ranked bars, largest first, all against the largest value. */
export function BarsView({ c, data }: { c: Bars; data: Data }) {
  const unit = text(c.unit, data)
  const rows = amounts(c.items, data)
    .filter((r) => r.label || r.shown)
    .sort((a, b) => b.value - a.value)
    .slice(0, c.limit ?? 12)
  if (!rows.length) return <Empty />
  const top = Math.max(0, ...rows.map((r) => r.value))
  return (
    <div class="c-bars" data-fit="wrap" data-kind="bars">
      {rows.map((r, i) => (
        <div class="c-bars-row" key={i}>
          <span class="c-bars-label">{r.label}</span>
          <div class="c-bars-track">
            <div
              class="c-bars-fill"
              style={{ width: pct(share(r.value, top)) }}
            />
          </div>
          <span class="c-bars-value">
            {r.shown}
            {unit && <span class="c-meter-of"> {unit}</span>}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * One whole split into parts. Each block prints its share when it is wide
 * enough; the legend repeats name and share, so no value is lost.
 */
export function SplitView({ c, data }: { c: Split; data: Data }) {
  const parts = amounts(c.items, data).slice(0, 6)
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0)
  if (total <= 0) return <Empty />
  return (
    <div class="c-split" data-fit="wrap" data-kind="split">
      <div class="c-split-bar">
        {parts.map((p, i) => {
          const s = share(p.value, total)
          if (s === 0) return null
          return (
            <div
              key={i}
              class="c-split-part"
              style={{
                flexGrow: s,
                background: `var(--series-${i + 1})`,
                color: `var(--on-series-${i + 1})`,
              }}
            >
              {s >= 0.08 ? pct(s) : ''}
            </div>
          )
        })}
      </div>
      <div class="c-split-legend">
        {parts.map((p, i) => (
          <span class="c-chart-key" key={i}>
            <span
              class="c-chart-swatch"
              style={{ background: `var(--series-${i + 1})` }}
            />
            {p.label}
            <strong>{pct(share(p.value, total))}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}
