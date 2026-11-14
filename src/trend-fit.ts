// How a stat arranges its parts. The trend can sit beside the value or under
// it, and the label under the value or beside it. Beside costs width, under
// costs height, so the fit pass measures every arrangement the stat can take
// and keeps the one that lets the value be largest. Stats in one row agree
// on one arrangement, so their values and labels still line up.

const TREND_BELOW = 'trend-below'
const LABEL_BESIDE = 'label-beside'

/** An arrangement: [trend under the value, label beside the value]. */
type Arrangement = readonly [boolean, boolean]

const ALL: Arrangement[] = [
  [false, false],
  [true, false],
  [false, true],
  [true, true],
]
const key = ([t, l]: Arrangement) => `${+t}${+l}`

const densityOf = (el: HTMLElement) =>
  el.closest<HTMLElement>('.cell')?.dataset.density ?? ''

function arrange(el: HTMLElement, [trend, label]: Arrangement): void {
  el.classList.toggle(TREND_BELOW, trend)
  el.classList.toggle(LABEL_BESIDE, label)
}

/**
 * The arrangements this stat can take, given its parts and its zone. Strips
 * have one line, so nothing moves; compact zones always put the label beside
 * the value, so only the trend moves.
 */
function options(el: HTMLElement): Arrangement[] {
  const density = densityOf(el)
  if (density === 'strip') return []
  const trend = el.querySelector('.c-stat-trend') !== null
  // A sparkline sits between value and label, so the label stays under it.
  const label =
    density !== 'compact' &&
    el.querySelector('.c-stat-label') !== null &&
    el.querySelector('.c-spark') === null
  return ALL.filter(([t, l]) => (trend || !t) && (label || !l))
}

/**
 * Fits a stat in each arrangement it can take, using `fitLine`, which returns
 * the size the element fits at as it stands, or less than `floor` by how far
 * it is from fitting at all. Leaves the best one in place
 * and remembers every size for the row pass. Returns false when there is
 * nothing to choose, so the caller fits the stat normally.
 */
export function fitTrend(
  el: HTMLElement,
  fitLine: () => number,
  floor: number,
): boolean {
  const opts = options(el)
  if (opts.length < 2) {
    arrange(el, [false, false])
    delete el.dataset.arrangements
    return false
  }
  const sizes: Record<string, number> = {}
  for (const a of opts) {
    arrange(el, a)
    sizes[key(a)] = fitLine()
  }
  el.dataset.arrangements = JSON.stringify(sizes)
  const best = opts.reduce((a, b) => (sizes[key(b)] > sizes[key(a)] ? b : a))
  arrange(el, best)
  el.style.fontSize = Math.max(floor, sizes[key(best)]) + 'px'
  return true
}

/**
 * Picks one arrangement for a row of figures: the one whose smallest size is
 * largest. A stat that can't take an arrangement keeps its own nearest one.
 * Returns the size the row shares.
 */
export function alignTrends(
  group: HTMLElement[],
  sizeOf: (el: HTMLElement) => number,
  floor = 0,
): number {
  const choosers = group.filter((el) => el.dataset.arrangements)
  if (!choosers.length) return Math.min(...group.map(sizeOf))
  const table = new Map(
    choosers.map((el) => [
      el,
      JSON.parse(el.dataset.arrangements!) as Record<string, number>,
    ]),
  )
  // A stat without this arrangement uses the closest one it has.
  const sizeIn = (el: HTMLElement, a: Arrangement) => {
    const t = table.get(el)
    if (!t) return sizeOf(el)
    return (
      t[key(a)] ?? t[key([a[0], false])] ?? t[key([false, a[1]])] ?? t['00']
    )
  }
  const rowSize = (a: Arrangement) =>
    Math.min(...group.map((el) => sizeIn(el, a)))
  // Below the floor every arrangement ends up at the floor, so compare what
  // the row can show there: the smallest size, then how close all come.
  const total = (a: Arrangement) =>
    group.reduce((sum, el) => sum + sizeIn(el, a), 0)
  const score = (a: Arrangement): [number, number] => [
    Math.max(floor, rowSize(a)),
    total(a),
  ]
  const better = (a: Arrangement, b: Arrangement) => {
    const [sa, ta] = score(a)
    const [sb, tb] = score(b)
    return sb > sa || (sb === sa && tb > ta) ? b : a
  }
  const best = ALL.reduce(better)
  for (const el of choosers) {
    const t = table.get(el)!
    const can = (k: string[]) => k.some((x) => x in t)
    arrange(el, [best[0] && can(['10', '11']), best[1] && can(['01', '11'])])
  }
  return rowSize(best)
}
