// A flow layout is designed once, for landscape or portrait. Each zone's span
// (out of 12 columns) fixes its designed width in pixels. On a screen with a
// different shape, every zone keeps roughly that width: on a narrower screen
// it takes more columns and the zones after it move to new rows; on a wider
// screen it takes fewer columns and more zones share a row. Rows are always
// filled edge to edge, so nothing is left empty or stretched past its row.

import type { FlowItem, FlowLayout, GridLayout, Layout } from './types'

export const COLUMNS = 12
/** A zone may shrink to this share of its designed width to stay on a row. */
const SHRINK = 0.75

/** Reference canvas: 1080 px on the short side, the long side follows the screen. */
export function canvasSize(viewW: number, viewH: number): [number, number] {
  return viewW >= viewH
    ? [Math.round((1080 * viewW) / viewH), 1080]
    : [1080, Math.round((1080 * viewH) / viewW)]
}

export const isFlow = (l: Layout): l is FlowLayout => 'flow' in l

const item = (
  i: string | FlowItem,
): Required<Pick<FlowItem, 'zone'>> & FlowItem =>
  typeof i === 'string' ? { zone: i } : i

interface Row {
  zones: string[]
  /** Spans as written, out of 12 at the design width. */
  designed: number[]
  wants: number[]
  mins: number[]
  heights: (number | string | undefined)[]
  fixed: boolean
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** Splits `total` in proportion to `weights`, in whole columns. */
function share(total: number, weights: number[]): number[] {
  const all = sum(weights)
  if (total <= 0 || all <= 0) return weights.map(() => 0)
  const exact = weights.map((w) => (total * w) / all)
  const out = exact.map(Math.floor)
  const left = total - sum(out)
  const order = exact
    .map((e, i) => [e - Math.floor(e), i] as const)
    .sort((x, y) => y[0] - x[0])
  for (let k = 0; k < left; k++) out[order[k][1]]++
  return out
}

/**
 * Column spans for a row that fills all 12 columns. Zones get what they want
 * when it fits, else shrink toward their minimum; spare columns go to the
 * zones in proportion to the width they wanted.
 */
function spans(row: Row): number[] {
  if (sum(row.wants) <= COLUMNS) {
    const extra = share(COLUMNS - sum(row.wants), row.wants)
    return row.wants.map((w, i) => w + extra[i])
  }
  const room = row.wants.map((w, i) => w - row.mins[i])
  const give = share(COLUMNS - sum(row.mins), sum(room) > 0 ? room : row.wants)
  return row.mins.map((m, i) => m + give[i])
}

/** Row height: the tallest share, or the tallest fixed height for strips. */
function rowSize(row: Row): string {
  if (row.fixed)
    return `${Math.max(...row.heights.map((h) => parseFloat(String(h))))}px`
  const fr = row.heights.map((h) => (typeof h === 'number' ? h : 1))
  return `${Math.max(...fr)}fr`
}

export function flowGrid(l: FlowLayout, width: number): GridLayout {
  const designWidth = l.design === 'portrait' ? 1080 : 1920
  // Is the screen the same orientation as the design? (1080 wide = portrait)
  const sameShape = (l.design === 'portrait') === width <= 1080
  const column = width / COLUMNS
  const rows: Row[] = []
  let row: Row | undefined

  for (const raw of l.flow) {
    const { zone, span = COLUMNS, height } = item(raw)
    const want = Math.min(
      COLUMNS,
      Math.max(1, Math.round(((span / COLUMNS) * designWidth) / column)),
    )
    const min = Math.max(1, Math.ceil(want * SHRINK))
    // Fixed-height strips (headers, footers) never share a row with zones
    // that grow, or the strip would stretch with them.
    const fixed = typeof height === 'string'
    // A zone joins the row when it fits at its designed width, or when every
    // zone can shrink a little to make space. In the design's own
    // orientation, a row whose spans as written fill all 12 columns stays as
    // written; on a screen of the other orientation, zones regroup freely.
    const written = sameShape && sum(row?.designed ?? []) >= COLUMNS
    const fits =
      row !== undefined &&
      (sum(row.wants) + want <= COLUMNS ||
        (!written && sum(row.mins) + min <= COLUMNS))
    if (!row || row.fixed !== fixed || !fits) {
      row = { zones: [], designed: [], wants: [], mins: [], heights: [], fixed }
      rows.push(row)
    }
    row.zones.push(zone)
    row.designed.push(span)
    row.wants.push(want)
    row.mins.push(min)
    row.heights.push(height)
  }

  return {
    areas: rows.map((r) => {
      const s = spans(r)
      return r.zones.flatMap((z, i) => Array<string>(s[i]).fill(z)).join(' ')
    }),
    columns: `repeat(${COLUMNS}, 1fr)`,
    rows: rows.map(rowSize).join(' '),
    gap: l.gap,
  }
}

export function toGrid(l: Layout, width: number): GridLayout {
  return isFlow(l) ? flowGrid(l, width) : l
}
