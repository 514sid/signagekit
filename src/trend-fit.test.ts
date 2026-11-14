import { describe, expect, test } from 'bun:test'
import { alignTrends, fitTrend } from './trend-fit'

const stat = (parts: string, density = '') => {
  document.body.innerHTML = `<div class="cell" data-density="${density}"><div class="c-stat">${parts}</div></div>`
  return document.querySelector<HTMLElement>('.c-stat')!
}
const TREND = '<span class="c-stat-trend"></span>'
const LABEL = '<div class="c-stat-label"></div>'
const SPARK = '<svg class="c-spark"></svg>'

/** A fake fit: a size for each arrangement, keyed trend-under + label-beside. */
const sizes = (el: HTMLElement, by: Record<string, number>) => () =>
  by[
    `${+el.classList.contains('trend-below')}${+el.classList.contains('label-beside')}`
  ]

describe('fitTrend', () => {
  test('keeps the arrangement that fits largest', () => {
    const el = stat(TREND + LABEL)
    fitTrend(el, sizes(el, { '00': 60, '10': 70, '01': 90, '11': 80 }), 22)
    expect(el.classList.contains('label-beside')).toBe(true)
    expect(el.classList.contains('trend-below')).toBe(false)
    expect(el.style.fontSize).toBe('90px')
  })

  test('only tries what the stat has', () => {
    const el = stat(TREND + LABEL + SPARK)
    const tried: string[] = []
    fitTrend(
      el,
      () => {
        tried.push(
          `${+el.classList.contains('trend-below')}${+el.classList.contains('label-beside')}`,
        )
        return 50
      },
      22,
    )
    expect(tried).toEqual(['00', '10'])
  })

  test('ranks arrangements that miss the floor by how close they come', () => {
    const el = stat(TREND + LABEL)
    fitTrend(el, sizes(el, { '00': 12, '10': 14, '01': 19, '11': 16 }), 22)
    expect(el.classList.contains('label-beside')).toBe(true)
    expect(el.style.fontSize).toBe('22px')
  })

  test('leaves strips and plain stats alone', () => {
    for (const el of [stat(TREND + LABEL, 'strip'), stat('')]) {
      expect(fitTrend(el, () => 50, 22)).toBe(false)
      expect(el.className).toBe('c-stat')
    }
  })

  test('in compact zones only the trend moves', () => {
    const el = stat(TREND + LABEL, 'compact')
    const tried: string[] = []
    fitTrend(
      el,
      () => {
        tried.push(
          `${+el.classList.contains('trend-below')}${+el.classList.contains('label-beside')}`,
        )
        return 50
      },
      22,
    )
    expect(tried).toEqual(['00', '10'])
  })
})

describe('alignTrends', () => {
  const fake = (own: number, arrangements?: Record<string, number>) => {
    const el = document.createElement('div')
    el.style.fontSize = own + 'px'
    if (arrangements) el.dataset.arrangements = JSON.stringify(arrangements)
    return el
  }
  const sizeOf = (el: HTMLElement) => parseFloat(el.style.fontSize)

  test('picks the arrangement whose smallest size is largest, for the whole row', () => {
    const a = fake(80, { '00': 80, '10': 110 })
    const b = fake(90, { '00': 90, '10': 100 })
    const plain = fake(105)
    expect(alignTrends([a, b, plain], sizeOf)).toBe(100)
    expect(a.classList.contains('trend-below')).toBe(true)
    expect(b.classList.contains('trend-below')).toBe(true)
  })

  test('at the floor, prefers the arrangement that comes closest to fitting', () => {
    const a = fake(22, { '00': 17.7, '01': 24 })
    const b = fake(22, { '00': 17.7, '01': 16.4, '10': 10.8, '11': 13.6 })
    alignTrends([a, b], sizeOf, 22)
    expect(a.classList.contains('label-beside')).toBe(true)
  })

  test('each stat takes the parts of the row arrangement it has', () => {
    // Label beside suits a, trend under suits b: the row takes both.
    const a = fake(60, { '00': 60, '01': 120 })
    const b = fake(70, { '00': 70, '10': 75 })
    expect(alignTrends([a, b], sizeOf)).toBe(75)
    expect(a.classList.contains('label-beside')).toBe(true)
    expect(b.classList.contains('trend-below')).toBe(true)
  })
})
