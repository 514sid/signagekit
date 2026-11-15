import { afterEach, describe, expect, test } from 'bun:test'
import { fitAll, fitMessages } from './fit'

// jsdom has no layout: boxes get a fixed size, and text overflows its box
// above a set font size.
function sized(el: HTMLElement, w: number, h: number) {
  Object.defineProperty(el, 'clientWidth', { value: w, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: h, configurable: true })
}

/** Counts layout reads; the text fits at `limit` px and below. */
function measured(el: HTMLElement, limit: () => number) {
  const reads = { n: 0 }
  const over = () => parseFloat(el.style.fontSize) > limit()
  Object.defineProperty(el, 'scrollHeight', {
    get: () => (reads.n++, over() ? 1e6 : 100),
  })
  Object.defineProperty(el, 'scrollWidth', {
    get: () => (over() ? 1e6 : 100),
  })
  return reads
}

function wrappedZone() {
  document.body.innerHTML = `<div class="zone"><div class="cell"><div class="body" style="padding: 0">
    <div data-fit="wrap" data-kind="text"><p>Doors open at nine</p></div>
  </div></div></div>`
  const body = document.querySelector<HTMLElement>('.body')!
  sized(body, 800, 400)
  return document.querySelector<HTMLElement>('[data-fit]')!
}

describe('fitAll', () => {
  afterEach(() => (document.body.innerHTML = ''))

  test('fits wrapped text again only when it changes', () => {
    const el = wrappedZone()
    const reads = measured(el, () => 70)
    fitAll(document.body)
    const first = el.style.fontSize
    const searched = reads.n
    expect(searched).toBeGreaterThan(0)

    fitAll(document.body)
    expect(el.style.fontSize).toBe(first)
    expect(reads.n).toBe(searched)

    el.querySelector('p')!.textContent = 'Doors open at nine, café at ten'
    fitAll(document.body)
    expect(reads.n).toBeGreaterThan(searched)
  })

  test('fits wrapped text again when its box changes size', () => {
    const el = wrappedZone()
    const reads = measured(el, () => 70)
    fitAll(document.body)
    const searched = reads.n
    sized(document.querySelector<HTMLElement>('.body')!, 600, 400)
    fitAll(document.body)
    expect(reads.n).toBeGreaterThan(searched)
  })

  test('gives stacked cells the same density on every pass', () => {
    document.body.innerHTML = `<div class="zone"><div class="c-stack d-column">
      <div class="cell" id="a"></div><div class="cell" id="b"></div>
    </div></div>`
    const a = document.getElementById('a')!
    const b = document.getElementById('b')!
    sized(a, 800, 400)
    // Stacked cells share the zone after padding: once its neighbour has a
    // density, b comes out shorter.
    Object.defineProperty(b, 'clientWidth', { value: 800 })
    Object.defineProperty(b, 'clientHeight', {
      get: () => (a.dataset.density === undefined ? 200 : 160),
    })
    fitAll(document.body)
    const first = b.dataset.density
    fitAll(document.body)
    expect(b.dataset.density).toBe(first)
  })
})

describe('fitMessages', () => {
  afterEach(() => (document.body.innerHTML = ''))

  test('measures a message that fits the size so far only once', () => {
    document.body.innerHTML = `<div class="cell"><div class="body" style="padding: 0">
      <div class="c-cycle"></div></div></div>`
    const body = document.querySelector<HTMLElement>('.body')!
    sized(body, 900, 500)
    const el = document.querySelector<HTMLElement>('.c-cycle')!
    // The probe is a clone appended to the box; its wrapped text fits at
    // 40 px for the long message and 80 px for the short ones.
    const checks: string[] = []
    const append = body.appendChild.bind(body)
    body.appendChild = <T extends Node>(node: T): T => {
      const probe = node as unknown as HTMLElement
      const limit = () => (probe.textContent!.length > 20 ? 40 : 80)
      const wrapped = () => probe.style.whiteSpace === 'normal'
      Object.defineProperty(probe, 'scrollHeight', {
        get: () => {
          if (wrapped()) checks.push(probe.textContent!)
          // Unwrapped, one line is far too wide to compete.
          if (!wrapped()) return 1e6
          return parseFloat(probe.style.fontSize) > limit() ? 1e6 : 10
        },
      })
      Object.defineProperty(probe, 'scrollWidth', { get: () => 10 })
      return append(node)
    }
    fitMessages(el, ['A long message that wraps', 'Short', 'Brief'])
    expect(el.style.fontSize).toBe('40px')
    expect(checks.filter((m) => m === 'Short')).toHaveLength(1)
    expect(checks.filter((m) => m === 'Brief')).toHaveLength(1)

    // The same messages in the same box aren't measured again.
    checks.length = 0
    el.style.fontSize = ''
    fitMessages(el, ['A long message that wraps', 'Short', 'Brief'])
    expect(el.style.fontSize).toBe('40px')
    expect(el.hasAttribute('data-wrap')).toBe(true)
    expect(checks).toEqual([])
  })
})
