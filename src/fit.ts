import { sizeQr } from './qr-size'
import { alignTrends, fitTrend } from './trend-fit'
import { fitMessages } from './cycle-fit'
import { contentBox, PROBE } from './measure'
import { showAllRows, tableOverflow } from './table-fit'

export { fitMessages }
import {
  BODY,
  BODY_SPREAD,
  DISPLAY,
  DISPLAY_RATIO,
  RANGES,
  STEPS,
} from './type-scale'

// The layout pass that makes any document look consistent. It runs after
// every render, in five phases, and touches only sizes, classes and hidden
// rows, never content:
//
// 1. density   zones get tighter padding when small, and strips put their
//              title beside the content; narrow rows of stats wrap to 2x2
// 2. fit       each component's text grows to fill its zone
// 3. harmonize sizes snap to a type scale; list-like components share one
//              body size per screen; figures share a size per row; headings
//              and cycles stay within a few times the body size
// 4. overflow  nothing goes below a readable floor: lists drop whole rows and
//              say "+N more", tables page, wide tables truncate one column
// 5. pinned    a component with `size` keeps exactly that size
//
// Sizes are px on the reference canvas (1080 px on the short side).
// data-fit="line": content never wraps, size scales linearly (one probe).
// data-fit="wrap": wrapping text, probe for a guess then a short search.

/** Row selectors for components that drop whole rows when they overflow. */
const ROWS: Record<string, string> = {
  list: ':scope > li',
  status: ':scope > li',
  schedule: ':scope > li',
  clocks: ':scope > li',
  meters: ':scope > .c-meters-row',
  bars: ':scope > .c-bars-row',
}

const snap = (n: number, min: number) => {
  let s = min
  for (const step of STEPS) if (step <= n && step >= min) s = step
  return s
}

const sizeOf = (el: HTMLElement) => parseFloat(el.style.fontSize) || 0
const kindOf = (el: HTMLElement) => el.dataset.kind ?? ''

function overflows(el: HTMLElement): boolean {
  const [w, h] = contentBox(el.parentElement!)
  return el.scrollHeight > h + 1 || el.scrollWidth > w + 1
}

function fits(el: HTMLElement, size: number, w: number, h: number): boolean {
  el.style.fontSize = size + 'px'
  return el.scrollHeight <= h && el.scrollWidth <= w
}

function reset(root: ParentNode): void {
  root
    .querySelectorAll<HTMLElement>(FIGURES)
    .forEach((el) => (el.style.minHeight = ''))
  root
    .querySelectorAll<HTMLElement>('.c-stat-value')
    .forEach((el) => (el.style.fontSize = ''))
  root
    .querySelectorAll<HTMLElement>('.c-stat.label-under')
    .forEach((el) => el.classList.remove('label-under'))
  root.querySelectorAll<HTMLElement>('[data-trimmed]').forEach((r) => {
    r.style.display = ''
    delete r.dataset.trimmed
  })
  root
    .querySelectorAll<HTMLElement>('.body[data-more]')
    .forEach((b) => delete b.dataset.more)
  root
    .querySelectorAll<HTMLElement>('.c-table[data-flex]')
    .forEach((t) => delete t.dataset.flex)
}

function density(root: ParentNode): void {
  // A row of three or more parts too narrow to read wraps into two columns,
  // but only when the stack is tall enough for two rows. Wrap first, so the
  // zones below are measured at their final size.
  root.querySelectorAll<HTMLElement>('.c-stack.d-row').forEach((s) => {
    const n = s.children.length
    const narrow = n >= 3 && s.clientWidth / n < 300
    s.classList.toggle('wrapped', narrow && s.clientHeight >= 300)
  })
  const cells = Array.from(root.querySelectorAll<HTMLElement>('.cell'))
  const sizes = cells.map((c) => [c.clientWidth, c.clientHeight])
  cells.forEach((c, i) => {
    const [w, h] = sizes[i]
    // Short zones, and wide zones only a little taller, are compact: a small
    // title on top and lists running side by side. Only zones too short for
    // a title above (under 100 px) put it beside the content.
    const short = h < 170 || (h < 230 && w / h > 4)
    c.dataset.density =
      h < 100 ? 'strip' : short ? 'compact' : h < 300 || w < 360 ? 'tight' : ''
  })
}

function fitOne(el: HTMLElement): void {
  const box = el.parentElement
  if (!box) return
  const [min, max] = RANGES[kindOf(el)] ?? [22, 160]
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.floor(n)))
  const [w, h] = contentBox(box)

  el.style.fontSize = PROBE + 'px'
  const rw = w / el.scrollWidth
  const rh = h / el.scrollHeight

  if (kindOf(el) === 'table') {
    // A table sizes from its height, up to 1.3x what its width allows; the
    // overflow phase then truncates the widest column, so one long name
    // doesn't shrink every row.
    const size = clamp(PROBE * Math.min(rh, rw * 1.3))
    el.style.fontSize = size + 'px'
    return
  }
  if (el.dataset.fit === 'line') {
    // Measured again from the probe, since a stat's trend may have moved.
    // Returns the size that fits. When even the floor doesn't, it returns
    // less than the floor, by how far off it is, so arrangements of a stat
    // can still be ranked; callers never set a size below the floor.
    const fitLine = () => {
      el.style.fontSize = PROBE + 'px'
      const r = Math.min(w / el.scrollWidth, h / el.scrollHeight)
      let size = clamp(PROBE * r)
      while (size > min && !fits(el, size, w, h)) size--
      if (fits(el, size, w, h)) return size
      return size * Math.min(w / el.scrollWidth, h / el.scrollHeight)
    }
    if (!fitTrend(el, fitLine, min))
      el.style.fontSize = Math.max(min, fitLine()) + 'px'
    return
  }
  // Wrapped text grows in both directions, so its area scales with the
  // square of the size: a close first guess, then a short search.
  const guess = PROBE * Math.sqrt(rw * rh)
  let lo = clamp(guess * 0.6)
  let hi = clamp(guess * 1.6)
  if (!fits(el, lo, w, h)) [lo, hi] = [min, lo]
  else if (fits(el, hi, w, h)) [lo, hi] = [hi, max + 1]
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (fits(el, mid, w, h)) lo = mid
    else hi = mid
  }
  el.style.fontSize = lo + 'px'
}

// Figures side by side share one size, so values and labels line up. A stat
// with match_row: false keeps its own size.
const FIGURES =
  '[data-kind="stat"]:not([data-own-size]), [data-kind="countdown"]'

/** Figures grouped by the row of zones they sit in. */
function figureRows(root: ParentNode, skip: Set<HTMLElement>): HTMLElement[][] {
  const rows = new Map<string, HTMLElement[]>()
  root.querySelectorAll<HTMLElement>(FIGURES).forEach((el) => {
    if (skip.has(el)) return
    const cell = el.closest('.cell')
    if (!cell) return
    const box = cell.getBoundingClientRect()
    const key = `${Math.round(box.top)}:${Math.round(box.height)}`
    rows.set(key, [...(rows.get(key) ?? []), el])
  })
  return [...rows.values()]
}

function alignRows(root: ParentNode, skip: Set<HTMLElement>): void {
  for (const group of figureRows(root, skip)) {
    const [floor] = RANGES[kindOf(group[0])] ?? [22]
    const size = Math.max(floor, alignTrends(group, sizeOf, floor))
    for (const el of group) el.style.fontSize = size + 'px'
  }
}

/**
 * Last of all, figures in a row get equal heights, so centred figures start
 * at the same line: one with a label or a trend underneath no longer sits
 * higher than its neighbours. Never taller than a figure's own zone.
 */
function equalHeights(root: ParentNode, skip: Set<HTMLElement>): void {
  for (const group of figureRows(root, skip)) {
    const tallest = Math.max(...group.map((el) => el.offsetHeight))
    for (const el of group) {
      const [, room] = contentBox(el.parentElement!)
      el.style.minHeight = Math.min(tallest, room) + 'px'
    }
  }
}

/** Returns the shared body size, or 0 when the screen has no list-like parts. */
function harmonize(
  fitted: HTMLElement[],
  root: ParentNode,
  skip: Set<HTMLElement>,
): number {
  const bodies = fitted.filter((el) => BODY.includes(kindOf(el)))
  // Strips are limited by their height, not their content, so they don't
  // set the shared size; they just stay within it.
  const free = bodies.filter(
    (el) =>
      el
        .closest<HTMLElement>('.cell')
        ?.dataset.density?.match(/strip|compact/) == null,
  )
  const floor = RANGES.table[0]
  const basis = free.length ? free : bodies
  const body = basis.length ? snap(Math.min(...basis.map(sizeOf)), floor) : 0
  for (const el of bodies) {
    const own = Math.min(sizeOf(el), body * BODY_SPREAD)
    el.style.fontSize = snap(own, body) + 'px'
  }
  alignRows(root, skip)
  const cap = body ? body * DISPLAY_RATIO : Infinity
  for (const el of fitted) {
    const kind = kindOf(el)
    if (BODY.includes(kind)) continue
    const [min] = RANGES[kind] ?? [22, 0]
    const capped = DISPLAY.includes(kind)
      ? Math.min(sizeOf(el), cap)
      : sizeOf(el)
    el.style.fontSize = snap(capped, min) + 'px'
  }
  return body
}

/** Hides rows from the end until the rest fits, then says how many are left. */
function trimRows(el: HTMLElement, selector: string): void {
  const rows = Array.from(el.querySelectorAll<HTMLElement>(selector))
  const body = el.closest<HTMLElement>('.body')
  const [w, h] = contentBox(el.parentElement!)
  // In a strip, rows run side by side and are dropped for width; elsewhere
  // they stack and are dropped for height. Either way, leave room for the
  // "+N more" note once anything is hidden.
  const strip =
    el.closest<HTMLElement>('.cell')?.dataset.density?.match(/strip|compact/) !=
    null
  const size = sizeOf(el)
  const tooBig = (hidden: number) =>
    strip
      ? el.scrollWidth > (hidden ? w - size * 5 : w) + 1
      : el.scrollHeight > (hidden ? h - size * 1.5 : h) + 1
  let hidden = 0
  while (rows.length - hidden > 1 && tooBig(hidden)) {
    const row = rows[rows.length - 1 - hidden]
    row.style.display = 'none'
    row.dataset.trimmed = ''
    hidden++
  }
  if (hidden && body) {
    body.dataset.more = `+${hidden} more`
    body.style.setProperty('--more-size', `${Math.max(20, size * 0.75)}px`)
  }
}

/**
 * A stat that doesn't fit at a readable size drops its sparkline first,
 * then shrinks its value relative to the label, down to 1.2 times the label
 * size, so a long full number gets smaller instead of cut off.
 */
function statOverflow(el: HTMLElement): void {
  const spark = el.querySelector<HTMLElement>('.c-spark')
  if (spark && overflows(el)) {
    spark.style.display = 'none'
    spark.dataset.trimmed = ''
  }
  const value = el.querySelector<HTMLElement>('.c-stat-value')
  if (!value) return
  for (let em = 2.4; em >= 1.2 && overflows(el); em -= 0.2)
    value.style.fontSize = em.toFixed(1) + 'em'
  // Compact zones put the label beside the value; when even that is too
  // wide, the label goes under it, if that fits.
  if (
    overflows(el) &&
    el.closest<HTMLElement>('.cell')?.dataset.density === 'compact'
  ) {
    el.classList.add('label-under')
    if (overflows(el)) el.classList.remove('label-under')
  }
}

function overflow(fitted: HTMLElement[]): void {
  for (const el of fitted) {
    const kind = kindOf(el)
    // A countdown is built like a stat, value and label.
    if (kind === 'stat' || kind === 'countdown') statOverflow(el)
    else if (kind === 'table') tableOverflow(el)
    else if (ROWS[kind] && overflows(el)) trimRows(el, ROWS[kind])
  }
}

function pinned(el: HTMLElement): boolean {
  const size = el.closest<HTMLElement>('.cell')?.dataset.size
  if (!size) return false
  el.style.fontSize = size + 'px'
  return true
}

export function fitAll(root: ParentNode): void {
  reset(root)
  density(root)
  const restoreRows = showAllRows(root)
  const fitted: HTMLElement[] = []
  const pins = new Set<HTMLElement>()
  for (const el of Array.from(
    root.querySelectorAll<HTMLElement>('[data-fit]'),
  )) {
    if (pinned(el)) {
      pins.add(el)
      continue
    }
    fitOne(el)
    fitted.push(el)
  }
  // Cycles size to their longest message; refit them now that density has
  // settled their padding, and let harmonize cap them like other display text.
  root.querySelectorAll<HTMLElement>('.c-cycle').forEach((el) => {
    const messages = (el as HTMLElement & { __messages?: string[] }).__messages
    if (!messages) return
    fitMessages(el, messages)
    if (el.closest<HTMLElement>('.cell')?.dataset.size) pins.add(el)
    else fitted.push(el)
  })
  harmonize(fitted, root, pins)
  overflow(fitted)
  restoreRows()
  equalHeights(root, pins)
  sizeQr(root)
}
