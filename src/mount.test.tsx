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
})
