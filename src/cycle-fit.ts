import { contentBox, PROBE } from './measure'
import { RANGES } from './type-scale'

function wrappedSize(
  probe: HTMLElement,
  text: string,
  w: number,
  h: number,
  [min, max]: [number, number],
): number {
  probe.textContent = text
  let lo = min
  let hi = max + 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    probe.style.fontSize = mid + 'px'
    if (probe.scrollHeight <= h && probe.scrollWidth <= w) lo = mid
    else hi = mid
  }
  return lo
}

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
  const wrapped = Math.min(
    ...messages.map((m) => wrappedSize(probe, m, w, h, range)),
  )
  box.removeChild(probe)
  const wrap = wrapped > line
  el.toggleAttribute('data-wrap', wrap)
  el.style.fontSize = (wrap ? wrapped : line) + 'px'
}
