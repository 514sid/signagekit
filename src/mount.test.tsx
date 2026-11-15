import { afterEach, describe, expect, test } from 'bun:test'
import { mount } from './mount'
import lunch from './fixtures/lunch.layout.json'
import lunchData from './fixtures/lunch.data.json'

const box = () => {
  document.body.innerHTML = '<div id="root"></div>'
  return document.getElementById('root')!
}

describe('mount', () => {
  afterEach(() => (document.body.innerHTML = ''))

  test('renders zones with bound data and updates them', async () => {
    const root = box()
    const screen = await mount(root, { layout: lunch, data: lunchData })
    expect(screen.errors).toEqual([])
    expect(root.querySelectorAll('.zone')).toHaveLength(5)
    expect(root.querySelectorAll('.c-table tbody tr')).toHaveLength(5)
    expect(root.querySelector('.c-table tbody td')!.textContent).toBe(
      'Tomato soup',
    )
    expect(root.querySelector('.c-stat-value')!.textContent).toBe('6min')
    expect(root.querySelector('.k-table .title')!.textContent).toBe('Menu')

    await screen.update({ data: { ...lunchData, wait: 12 } })
    expect(root.querySelector('.c-stat-value')!.textContent).toBe('12min')
  })

  test('checks the layout again only when it changes', async () => {
    // Counts reads of the document, which parsing and validating it make.
    let reads = 0
    const layout = new Proxy(lunch, {
      get: (t, k, r) => (reads++, Reflect.get(t, k, r)),
    })
    const screen = await mount(box(), { layout, data: lunchData })
    const once = reads
    expect(once).toBeGreaterThan(0)
    await screen.update({ data: { ...lunchData, wait: 12 } })
    expect(reads).toBe(once)
    await screen.update({ layout, data: lunchData })
    expect(reads).toBeGreaterThan(once)
  })

  test('parses the same data text only once', async () => {
    const text = JSON.stringify(lunchData)
    const parse = JSON.parse
    let parses = 0
    JSON.parse = (t: string, ...rest) => {
      if (t.trim() === text) parses++
      return parse(t, ...rest)
    }
    try {
      const root = box()
      const screen = await mount(root, { layout: lunch, data: text })
      await screen.update({ data: text })
      expect(parses).toBe(1)
      await screen.update({ data: JSON.stringify({ ...lunchData, wait: 12 }) })
      expect(root.querySelector('.c-stat-value')!.textContent).toBe('12min')
      await screen.update({ data: text })
      expect(parses).toBe(2)
      expect(root.querySelector('.c-stat-value')!.textContent).toBe('6min')
    } finally {
      JSON.parse = parse
    }
  })

  test('reports bad data text every time it is sent', async () => {
    const screen = await mount(box(), { layout: lunch, data: '{"wait": ' })
    expect(screen.errors[0]).toStartWith('data: not valid JSON')
    await screen.update({ data: '{"wait": ' })
    expect(screen.errors[0]).toStartWith('data: not valid JSON')
  })

  test('applies colors to its own canvas, not the page', async () => {
    const root = box()
    await mount(root, {
      layout: {
        colors: { background: '#ffffff' },
        layout: { areas: ['a'] },
        zones: { a: { type: 'heading', text: 'Hi' } },
      },
    })
    const canvas = root.querySelector<HTMLElement>('.signagekit')!
    expect(canvas.style.getPropertyValue('--background')).toBe('#ffffff')
    expect(
      document.documentElement.style.getPropertyValue('--background'),
    ).toBe('')
  })

  test('colors win over the document, so a screen can be seen in the other scheme', async () => {
    const root = box()
    await mount(root, {
      layout: {
        colors: { scheme: 'dark' },
        layout: { areas: ['a'] },
        zones: { a: { type: 'heading', text: 'Hi' } },
      },
      colors: { scheme: 'light' },
    })
    const canvas = root.querySelector<HTMLElement>('.signagekit')!
    expect(canvas.style.getPropertyValue('--background')).toBe('#eef0f3')
  })

  test('shows problems only when asked, including reported ones', async () => {
    const layout = {
      layout: { areas: ['a b'] },
      zones: { a: { type: 'heading', text: 'Hi' }, b: { type: 'nope' } },
    }
    const quiet = await mount(box(), { layout })
    expect(document.querySelector('.problems')).toBeNull()
    expect(quiet.errors.join()).toContain('zones.b.type: unknown component')

    const root = box()
    const loud = await mount(root, { layout, showProblems: true })
    loud.report('runtime: boom')
    const text = root.querySelector('.problems')!.textContent
    expect(text).toContain('zones.b.type: unknown component')
    expect(text).toContain('runtime: boom')
  })

  test('destroy removes the screen', async () => {
    const root = box()
    const screen = await mount(root, { layout: lunch, data: lunchData })
    screen.destroy()
    expect(root.querySelector('.signagekit')).toBeNull()
  })
})

describe('mount with a fixed time', () => {
  afterEach(() => (document.body.innerHTML = ''))

  test('shows the given time instead of the clock', async () => {
    const root = box()
    await mount(root, {
      layout: {
        layout: { areas: ['a'] },
        zones: { a: { type: 'clock', hour12: false } },
      },
      now: new Date('2026-11-14T09:30:00Z'),
      timeZone: 'UTC',
    })
    expect(root.textContent).toContain('09:30')
  })

  test('each screen keeps its own time zone', async () => {
    const clock = {
      layout: { areas: ['a'] },
      zones: { a: { type: 'clock', hour12: false } },
    }
    const now = new Date('2026-11-14T09:30:00Z')
    const [a, b] = [0, 1].map(() =>
      document.body.appendChild(document.createElement('div')),
    )
    const first = await mount(a, { layout: clock, now, timeZone: 'UTC' })
    await mount(b, { layout: clock, now, timeZone: 'Asia/Tokyo' })
    // Drawing the first screen again must not pick up the second's zone.
    await first.update({ data: {} })
    expect(a.textContent).toContain('09:30')
    expect(b.textContent).toContain('18:30')
  })

  test('fits again only when the container changes size', async () => {
    const g = globalThis as { ResizeObserver?: unknown }
    let report = () => {}
    g.ResizeObserver = class {
      constructor(fn: () => void) {
        report = fn
      }
      observe() {}
      disconnect() {}
    }
    // Every fit pass starts by finding the elements to fit.
    const proto = window.Element.prototype
    const find = proto.querySelectorAll
    let passes = 0
    proto.querySelectorAll = function (this: Element, sel: string) {
      if (sel === '[data-fit]') passes++
      return find.call(this, sel)
    } as typeof find
    try {
      const root = box()
      await mount(root, { layout: lunch, data: lunchData })
      expect(passes).toBe(1)
      // An observer reports once when it starts watching, at the same size.
      report()
      expect(passes).toBe(1)
      Object.defineProperty(root, 'clientWidth', { value: 1080 })
      report()
      expect(passes).toBe(2)
    } finally {
      proto.querySelectorAll = find
      delete g.ResizeObserver
    }
  })
})
