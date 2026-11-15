import { contentBox, fontLoads, PROBE } from './measure'
import { RANGES } from './type-scale'

/**
 * The largest size from min to max at which the text fits wrapped, or min.
 * Given the size the other messages settled on as max, a message that fits
 * there costs one check instead of a whole search.
 */
function wrappedSize(
  probe: HTMLElement,
  text: string,
  w: number,
  h: number,
  [min, max]: [number, number],
  knownMax = false,
): number {
  probe.textContent = text
  const fits = (size: number) => {
    probe.style.fontSize = size + 'px'
    return probe.scrollHeight <= h && probe.scrollWidth <= w
  }
  if (knownMax && fits(max)) return max
  let lo = min
  let hi = knownMax ? max : max + 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (fits(mid)) lo = mid
    else hi = mid
  }
  return lo
}

const lastFit = new WeakMap<
  HTMLElement,
  { key: string; wrap: boolean; size: string }
>()

/**
 * Sizes a cycle to its longest message, so the size never jumps between
 * messages. One line suits a banner; a tall, narrow zone wraps instead,
 * whichever lets the text be larger.
 */
export function fitMessages(el: HTMLElement, messages: string[]): void {
  const box = el.parentElement
  if (!box || messages.length === 0) return
  const pin = el.closest<HTMLElement>('.cell')?.dataset.size
  if (pin) {
    el.style.fontSize = pin + 'px'
    return
  }
  const range = RANGES.cycle as [number, number]
  const [min, max] = range
  const [w, h] = contentBox(box)
  // The same messages in the same box get the same size as last time.
  const density = el.closest<HTMLElement>('.cell')?.dataset.density ?? ''
  const key = [w, h, fontLoads(), density, el.className, ...messages].join('\n')
  const known = lastFit.get(el)
  if (known?.key === key) {
    el.toggleAttribute('data-wrap', known.wrap)
    el.style.fontSize = known.size
    return
  }
  const probe = el.cloneNode() as HTMLElement
  probe.removeAttribute('data-wrap')
  probe.style.cssText = `position:absolute;visibility:hidden;font-size:${PROBE}px`
  box.appendChild(probe)
  let ratio = Infinity
  for (const m of messages) {
    probe.textContent = m
    ratio = Math.min(ratio, w / probe.scrollWidth, h / probe.scrollHeight)
  }
  const line = Math.max(min, Math.min(max, Math.floor(PROBE * ratio * 0.98)))
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:normal;width:${w}px`
  // Only the message that wraps worst sets the size, so each search stops at
  // the smallest size so far.
  let wrapped = max
  messages.forEach((m, i) => {
    wrapped = wrappedSize(probe, m, w, h, [min, wrapped], i > 0)
  })
  box.removeChild(probe)
  const wrap = wrapped > line
  el.toggleAttribute('data-wrap', wrap)
  el.style.fontSize = (wrap ? wrapped : line) + 'px'
  lastFit.set(el, { key, wrap, size: el.style.fontSize })
}
