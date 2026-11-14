import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { items, text } from './data'
import { DASH, Empty } from './empty'
import type { Data, Table as TableSpec, Value } from './types'

type AutoPaged = HTMLTableElement & { __autoPage?: (n: number | null) => void }

/**
 * A table that sizes its text to fit. Rows that don't fit at a readable size
 * are shown a page at a time, flipping instantly; page_rows caps the page
 * size by hand. Rows off the page are collapsed, not removed, so column widths
 * stay the same on every page and nothing jumps.
 */
export function Table({ c, data }: { c: TableSpec; data: Data }) {
  const ref = useRef<AutoPaged>(null)
  const [auto, setAuto] = useState<number | null>(null)
  const align = (i: number) => `a-${c.align?.[i] ?? 'start'}`
  const rows = items(c.rows, data)
  // page_rows is a maximum: a page never holds more rows than fit readably.
  const per = Math.min(c.page_rows ?? Infinity, auto ?? Infinity, rows.length)
  const pages = Math.max(1, Math.ceil(rows.length / Math.max(1, per)))
  const [page, setPage] = useState(0)
  const current = page % pages

  // The layout pass reports how many rows fit; it calls this after fitting.
  useLayoutEffect(() => {
    if (ref.current)
      ref.current.__autoPage = (n) => setAuto((old) => (old === n ? old : n))
  }, [])

  useEffect(() => {
    if (pages < 2) return
    const id = setInterval(
      () => setPage((n) => n + 1),
      (c.seconds ?? 10) * 1000,
    )
    return () => clearInterval(id)
  }, [pages, c.seconds])

  if (!rows.length) return <Empty text="No rows" />
  const total = (c.widths ?? []).reduce((s, w) => s + w, 0)
  return (
    <table
      ref={ref}
      class={`c-table${c.widths ? ' has-widths' : ''}`}
      data-fit="line"
      data-kind="table"
      data-page-rows={c.page_rows}
      data-auto-paged={auto ? '' : undefined}
    >
      {c.widths && (
        <colgroup>
          {c.widths.map((w, i) => (
            <col key={i} style={{ width: `${(w / total) * 100}%` }} />
          ))}
        </colgroup>
      )}
      {pages > 1 && (
        <caption class="c-table-page">
          {current + 1} / {pages}
        </caption>
      )}
      <thead>
        <tr>
          {c.columns.map((h, i) => (
            <th key={i} class={align(i)}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r} class={Math.floor(r / per) === current ? '' : 'off-page'}>
            {(Array.isArray(row) ? row : []).map((v, i) => {
              const shown = text(v as Value, data)
              return (
                <td key={i} class={`${align(i)}${shown ? '' : ' is-missing'}`}>
                  {shown || DASH}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
