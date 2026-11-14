// What components show when their data is missing or empty, so a zone never
// renders as a blank box or a title with nothing under it.

/** Stands in for a missing single value: a stat, a meter, a table cell. */
export const DASH = '—'

/** Shown instead of an empty list, table, chart or image. */
export function Empty({ text = 'Nothing to show' }: { text?: string }) {
  return <p class="c-empty">{text}</p>
}
