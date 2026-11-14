/** Font size, in px, that components are measured at before scaling. */
export const PROBE = 100

/** The box a component fills: its parent, without padding. */
export function contentBox(box: HTMLElement): [number, number] {
  const cs = getComputedStyle(box)
  return [
    box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
  ]
}
