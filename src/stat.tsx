import { has } from './checks'
import { items, text } from './data'
import { DASH } from './empty'
import type {
  Component,
  Data,
  Stat as StatSpec,
  Thresholds,
  Value,
} from './types'

type Props = { c: StatSpec; data: Data }

export const STATE_WORDS: Record<string, string> = {
  good: 'Good',
  warning: 'Warning',
  danger: 'Danger',
}

/** good, warning or danger; anything else, unknown included, is neutral. */
export function stateText(v: Value | undefined, data: Data): string {
  const s = v === undefined ? '' : text(v, data)
  return has(STATE_WORDS, s) ? s : 'neutral'
}

/**
 * A state from thresholds: past danger is danger, past warning is warning,
 * anything else neutral. With danger below warning, lower values are worse.
 */
export function thresholdState(n: number, t: Thresholds | undefined): string {
  if (!t || !Number.isFinite(n)) return 'neutral'
  const lowerWorse =
    t.warning !== undefined && t.danger !== undefined && t.danger < t.warning
  const past = (limit?: number) =>
    limit !== undefined && (lowerWorse ? n <= limit : n >= limit)
  if (past(t.danger)) return 'danger'
  if (past(t.warning)) return 'warning'
  return 'neutral'
}

const toNumber = (s: string) => parseFloat(s.replace(/,/g, ''))

/**
 * The state that marks a whole zone. Only stats and meters set one: an
 * explicit `state` wins, else `thresholds` decide from the value.
 */
export function stateOf(c: Component, data: Data): string {
  if (c.type !== 'stat' && c.type !== 'meter') return 'neutral'
  if (c.state !== undefined) return stateText(c.state, data)
  return thresholdState(toNumber(text(c.value, data)), c.thresholds)
}

// State icons: shapes from Lucide (ISC license), filled with the state color,
// with the mark drawn in white or near-black on top. Each state has its own
// shape and mark, so a state never relies on color alone.
const ICONS: Record<string, { shape: string; mark: string[] }> = {
  good: {
    shape: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z',
    mark: ['m8.5 12 2.5 2.5 4.5-5'],
  },
  warning: {
    shape:
      'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z',
    mark: ['M12 9v4', 'M12 17h.01'],
  },
  danger: {
    shape: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z',
    mark: ['m15 9-6 6', 'm9 9 6 6'],
  },
}

export function StateIcon({ state }: { state: string }) {
  const icon = ICONS[state]
  return (
    <svg
      class={`c-state-icon is-${state}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path class="c-state-shape" d={icon.shape} />
      {icon.mark.map((d) => (
        <path key={d} class="c-state-mark" d={d} />
      ))}
    </svg>
  )
}

// Trend arrows from Lucide (trending-up, trending-down, arrow-right).
const ARROWS: Record<string, string[]> = {
  up: ['M16 7h6v6', 'm22 7-8.5 8.5-5-5L2 17'],
  down: ['M16 17h6v-6', 'm22 17-8.5-8.5-5 5L2 7'],
  flat: ['M5 12h14', 'm12 5 7 7-7 7'],
}

/**
 * up, down or flat, or none. With good_when set, a move that way is good
 * (green) and the opposite is bad (red); without it the arrow stays neutral,
 * since a rising number is not always good news.
 */
export function trendOf(
  c: StatSpec,
  data: Data,
): { dir: string; tone: string } | null {
  const dir = c.trend === undefined ? '' : text(c.trend, data)
  if (!has(ARROWS, dir)) return null
  const tone =
    !c.good_when || dir === 'flat'
      ? 'neutral'
      : dir === c.good_when
        ? 'good'
        : 'danger'
  return { dir, tone }
}

function Trend({ c, data }: Props) {
  const t = trendOf(c, data)
  if (!t) return null
  const delta = text(c.delta, data)
  return (
    <span class={`c-stat-trend tone-${t.tone}`}>
      <svg class="c-trend-icon" viewBox="0 0 24 24" aria-hidden="true">
        {ARROWS[t.dir].map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
      {delta}
    </span>
  )
}

const compact = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/**
 * Numbers of 10,000 and up are shortened (1M, 12.9K) unless format is full,
 * so a big value doesn't shrink every stat in its row. Smaller numbers get
 * thousands separators; text that isn't a number is shown as written.
 */
export function formatValue(raw: string, format?: 'compact' | 'full'): string {
  const plain = raw.replace(/,/g, '').trim()
  if (plain === '' || !/^-?\d+(\.\d+)?$/.test(plain)) return raw
  // A leading zero means a code, like a ticket "042", not an amount.
  if (/^-?0\d/.test(plain)) return raw
  const n = Number(plain)
  if (format !== 'full' && Math.abs(n) >= 10_000) return compact.format(n)
  return raw.includes(',')
    ? raw
    : n.toLocaleString(undefined, { maximumFractionDigits: 20 })
}

export function Stat({ c, data }: Props) {
  const unit = text(c.unit, data)
  const state = stateOf(c, data)
  const label = text(c.label, data) || STATE_WORDS[state] || ''
  return (
    <div
      class="c-stat"
      data-fit="line"
      data-kind="stat"
      data-own-size={c.match_row === false ? '' : undefined}
    >
      <div class="c-stat-value">
        {formatValue(text(c.value, data), c.format) || DASH}
        {unit && <span class="c-stat-unit">{unit}</span>}
        <Trend c={c} data={data} />
      </div>
      {c.spark && <Spark values={items(c.spark, data)} data={data} />}
      {label && (
        <div class="c-stat-label">
          {state !== 'neutral' && <StateIcon state={state} />}
          {label}
        </div>
      )}
    </div>
  )
}

/** Sparkline: the recent values in a quiet line, the latest one marked. */
function Spark({ values, data }: { values: unknown[]; data: Data }) {
  const nums = values
    .map((v) => parseFloat(text(v as Value, data).replace(/,/g, '')))
    .filter(Number.isFinite)
  if (nums.length < 2) return null
  const lo = Math.min(...nums)
  const hi = Math.max(...nums)
  const y = (n: number) => 28 - ((n - lo) / (hi - lo || 1)) * 24
  const x = (i: number) => (i / (nums.length - 1)) * 100
  const points = nums.map((n, i) => `${x(i)},${y(n)}`).join(' ')
  const last = nums.length - 1
  return (
    <svg
      class="c-spark"
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={points} />
      <path d={`M${x(last)} ${y(nums[last])}h0`} />
    </svg>
  )
}
