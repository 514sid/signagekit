import { fontLoads } from './measure'
import { ARRANGEMENT_CLASSES } from './trend-fit'

/** What fitting an element last gave, and everything it depended on. */
interface Fitted {
  key: string
  size: string
  className: string
  arrangements?: string
}
const lastFit = new WeakMap<HTMLElement, Fitted>()

/**
 * Everything an element's fitted size depends on. A stat's arrangement is
 * left out, since the fit chooses it.
 */
function fitKey(el: HTMLElement, w: number, h: number): string {
  const density = el.closest<HTMLElement>('.cell')?.dataset.density ?? ''
  const classes = Array.from(el.classList).filter(
    (c) => !ARRANGEMENT_CLASSES.includes(c),
  )
  return [w, h, fontLoads(), density, classes, el.innerHTML].join('|')
}

/**
 * Runs `fit` on an element in a `w` by `h` box, or, when neither its text nor
 * its box changed since the last time, puts back what that fit gave. On a
 * data update most text stays the same.
 */
export function remembered(
  el: HTMLElement,
  w: number,
  h: number,
  fit: () => void,
): void {
  const key = fitKey(el, w, h)
  const known = lastFit.get(el)
  if (known?.key === key) {
    el.className = known.className
    if (known.arrangements) el.dataset.arrangements = known.arrangements
    else delete el.dataset.arrangements
    el.style.fontSize = known.size
    return
  }
  fit()
  lastFit.set(el, {
    key,
    size: el.style.fontSize,
    className: el.className,
    arrangements: el.dataset.arrangements,
  })
}
