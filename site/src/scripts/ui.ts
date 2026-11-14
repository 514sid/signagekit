import type { Size } from '@514sid/signagekit'

export interface Result {
  status: 'loading' | 'ready' | 'error'
  errors: string[]
  warnings: string[]
}

declare global {
  interface Window {
    signagekit: Result
  }
}

export function report(r: Result): void {
  document.documentElement.dataset.status = r.status
  window.signagekit = r
  for (const e of r.errors) console.error(e)
  for (const w of r.warnings) console.warn(w)
}

export const el = (tag: string, cls = '', text = ''): HTMLElement => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text) e.textContent = text
  return e
}

/**
 * A frame for a screen at its real resolution: `inner` is size.width by
 * size.height px, and fit() scales it so the whole thing fits in a box.
 * Text sizes therefore come out exactly as on that screen.
 */
export function scaledFrame(size: Size, cls: string) {
  const outer = el('div', `scaled ${cls}`)
  const inner = el('div', 'scaled-inner')
  inner.style.width = `${size.width}px`
  inner.style.height = `${size.height}px`
  outer.append(inner)
  const fit = (maxW: number, maxH: number, grow = false) => {
    let k = Math.min(maxW / size.width, maxH / size.height)
    if (!grow) k = Math.min(1, k)
    inner.style.transform = `scale(${k})`
    outer.style.width = `${Math.floor(size.width * k)}px`
    outer.style.height = `${Math.floor(size.height * k)}px`
  }
  return { outer, inner, fit }
}

/** "Full HD, 1920×1080", or just "1366×768" for an unnamed size. */
export const sizeLabel = (s: Size) =>
  s.label.includes('×') ? s.label : `${s.label}, ${s.width}×${s.height}`

export function problemList(errors: string[], warnings: string[]): HTMLElement {
  const box = el('div', 'problem-list')
  box.setAttribute('aria-live', 'polite')
  if (!errors.length && !warnings.length) {
    box.append(el('p', 'ok', 'No problems found.'))
    return box
  }
  const ul = el('ul')
  for (const e of errors) ul.append(el('li', 'error', e))
  for (const w of warnings) ul.append(el('li', 'warning', w))
  box.append(
    el('p', '', `${errors.length} error(s), ${warnings.length} warning(s)`),
    ul,
  )
  return box
}
