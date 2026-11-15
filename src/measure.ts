/** Font size, in px, that components are measured at before scaling. */
export const PROBE = 100

let loads = 0
if (typeof document !== 'undefined')
  document.fonts?.addEventListener?.('loadingdone', () => loads++)

/**
 * Counts web fonts that finished loading, which changes how wide all text
 * is, so a size fitted before one did is stale.
 */
export const fontLoads = () => loads

let held: Map<HTMLElement, [number, number]> | null = null

/** The box a component fills: its parent, without padding. */
export function contentBox(box: HTMLElement): [number, number] {
  const known = held?.get(box)
  if (known) return known
  const cs = getComputedStyle(box)
  return [
    box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
  ]
}

/**
 * Reads the boxes of `els` together, in one layout, and answers contentBox
 * for them from memory until the returned function is called. Measuring one
 * box at a time, between size changes, costs a layout for each. Only for
 * while nothing changes those boxes: during the fit every zone has a fixed
 * size, whatever size its text takes.
 */
export function holdBoxes(els: HTMLElement[]): () => void {
  held = null
  const boxes = new Map(els.map((el) => [el, contentBox(el)] as const))
  held = boxes
  return () => {
    if (held === boxes) held = null
  }
}
