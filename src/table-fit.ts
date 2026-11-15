import { contentBox, fontLoads } from './measure'
import { RANGES } from './type-scale'

const sizeOf = (el: HTMLElement) => parseFloat(el.style.fontSize) || 0

type AutoPaged = HTMLTableElement & { __autoPage?: (n: number | null) => void }

/**
 * Cells cut short by fixed column widths. Table cells report no overflow in
 * scrollWidth, so the text is measured with a range instead.
 */
function clipped(table: HTMLTableElement): boolean {
  // An ellipsis shortens the text itself, so it is off while measuring.
  table.classList.add('measuring')
  const range = document.createRange()
  const cut = Array.from(table.querySelectorAll<HTMLElement>('td, th')).some(
    (c) => {
      const cs = getComputedStyle(c)
      const room =
        c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      range.selectNodeContents(c)
      return range.getBoundingClientRect().width > room + 0.1
    },
  )
  table.classList.remove('measuring')
  return cut
}

/**
 * The largest size, at most the current one, where no cell is cut short, or
 * the floor when none is. A check that finds a cut cell stops there, but one
 * that passes measures every cell, so the search tries 1, 2, 4, 8 px down
 * until the text fits, then halves the gap. Most tables fit 1 or 2 px down,
 * which costs the same as stepping 1 px at a time; a long way down takes a
 * few checks instead of one per px. Sizes stay whole px below the current
 * one, as stepping gave.
 */
export function shrinkToFit(
  table: HTMLTableElement,
  cut: (t: HTMLTableElement) => boolean = clipped,
): void {
  const [floor] = RANGES.table
  const size = sizeOf(table)
  if (size <= floor || !cut(table)) return
  const at = (down: number) => {
    table.style.fontSize = Math.max(floor, size - down) + 'px'
  }
  // In px down from the current size: cutAt is known to be cut; fitsAt fits,
  // or reaches the floor, which is used even if cut.
  const most = Math.ceil(size - floor)
  let cutAt = 0
  let fitsAt = most
  for (let down = 1; down < most; down *= 2) {
    at(down)
    if (!cut(table)) {
      fitsAt = down
      break
    }
    cutAt = down
  }
  while (fitsAt - cutAt > 1) {
    const mid = (cutAt + fitsAt) >> 1
    at(mid)
    if (cut(table)) cutAt = mid
    else fitsAt = mid
  }
  at(fitsAt)
}

/** What the overflow phase last did to a table, and what it depended on. */
interface Overflowed {
  key: string
  size: string
  flex?: string
  rowRoom: string
  page?: number | null
}
const lastOverflow = new WeakMap<HTMLTableElement, Overflowed>()

/**
 * Shrinks, truncates and pages a table that overflows its zone. A table
 * whose rows, size and box are the same as last time gets the same result
 * without measuring again: measuring every cell is the costliest part of a
 * data update.
 */
export function tableOverflow(el: HTMLElement): void {
  const [w, h] = contentBox(el.parentElement!)
  const table = el as AutoPaged
  // Rows are all showing here (see showAllRows); the caption, which holds
  // the page number, is left out.
  const key = [
    w,
    h,
    fontLoads(),
    table.className,
    table.style.fontSize,
    table.dataset.pageRows,
    table.tHead?.innerHTML,
    table.tBodies[0]?.innerHTML,
  ].join('|')
  let done = lastOverflow.get(table)
  if (done?.key === key) {
    table.style.fontSize = done.size
    if (done.flex !== undefined) table.dataset.flex = done.flex
    if (done.rowRoom) table.style.setProperty('--row-room', done.rowRoom)
  } else {
    const page = overflow(table, w, h)
    done = {
      key,
      size: table.style.fontSize,
      flex: table.dataset.flex,
      rowRoom: table.style.getPropertyValue('--row-room'),
      page,
    }
    lastOverflow.set(table, done)
  }
  if (done.page !== undefined) table.__autoPage?.(done.page)
}

/**
 * Measures the table and leaves it at its final size. Returns the rows per
 * page it needs, null for all of them, or undefined when it doesn't page.
 */
function overflow(
  table: AutoPaged,
  w: number,
  h: number,
): number | null | undefined {
  // Fixed widths always fill the zone, so the fit can't see that cells are
  // cut short: shrink until they aren't, down to the floor, then page.
  if (table.classList.contains('has-widths')) shrinkToFit(table)
  if (table.scrollWidth > w + 1) widestColumn(table)
  if (!table.__autoPage) return undefined
  // Rows are all showing here (see showAllRows), so this is the same answer
  // whatever the last pass decided.
  const rows = Array.from(table.tBodies[0]?.rows ?? []).filter(
    (r) => r.style.visibility === 'visible',
  )
  if (!rows.length) return undefined
  const head = table.tHead?.offsetHeight ?? 0
  const heights = rows.map((r) => r.offsetHeight)
  const used = head + heights.reduce((a, b) => a + b, 0)
  // A table that pages by hand (page_rows) always shows its pager line.
  const pager = pagerHeight(table)
  const all = table.tBodies[0]?.rows.length ?? 0
  const room = all > rows.length ? h - pager : h
  if (used <= room + 1) {
    // A table held back by its width leaves height over: rows take some of
    // it as padding, up to half a row each, so the zone looks filled
    // without rows floating far apart.
    const extra = Math.min(
      (room - used - 4) / heights.length,
      sizeOf(table) * 0.9,
    )
    if (extra > 1) {
      table.style.setProperty('--row-room', `${extra / 2}px`)
      // Rounding can still tip it over; then the rows keep their own height.
      if (table.offsetHeight > room) table.style.removeProperty('--row-room')
    }
    return null
  }
  // Doesn't fit: page, leaving room for the "1 / 2" line under the rows.
  const rowH = Math.max(...heights, 1)
  return Math.max(1, Math.floor((h - head - pager) / rowH))
}

/**
 * Height of the "1 / 2" pager line: measured when the table has one (it is
 * hidden while fitting), else estimated from the text size.
 */
function pagerHeight(table: HTMLTableElement): number {
  const caption = table.caption
  if (!caption) return sizeOf(table) * 1.5
  caption.style.display = ''
  const h = caption.offsetHeight
  caption.style.display = 'none'
  return h || sizeOf(table) * 1.5
}

/**
 * Shows every row a table could show at once, all of them or the first
 * page_rows, and hides its pager, so fitting and paging measure the same
 * content on every pass. Returns a function that hands rows back to the
 * table's own paging.
 */
export function showAllRows(root: ParentNode): () => void {
  const tables = Array.from(root.querySelectorAll<HTMLTableElement>('.c-table'))
  for (const t of tables) {
    t.style.removeProperty('--row-room')
    const cap = Number(t.dataset.pageRows) || Infinity
    Array.from(t.tBodies[0]?.rows ?? []).forEach((r, i) => {
      r.style.visibility = i < cap ? 'visible' : 'collapse'
    })
    if (t.caption) t.caption.style.display = 'none'
  }
  return () => {
    for (const t of tables) {
      Array.from(t.tBodies[0]?.rows ?? []).forEach(
        (r) => (r.style.visibility = ''),
      )
      if (t.caption) t.caption.style.display = ''
    }
  }
}

function widestColumn(table: HTMLTableElement): void {
  const widths: number[] = []
  for (const row of Array.from(table.rows)) {
    Array.from(row.cells).forEach(
      (c, i) => (widths[i] = Math.max(widths[i] ?? 0, c.scrollWidth)),
    )
  }
  table.dataset.flex = String(widths.indexOf(Math.max(...widths)))
}
