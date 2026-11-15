import { describe, expect, test } from 'bun:test'
import { shrinkToFit, tableOverflow } from './table-fit'

// jsdom has no layout, so cells count as cut short above a set size.
function table(size: number) {
  const t = document.createElement('table')
  t.style.fontSize = size + 'px'
  return t
}
const size = (t: HTMLTableElement) => parseFloat(t.style.fontSize)

describe('shrinkToFit', () => {
  test('finds the largest size where no cell is cut, in few checks', () => {
    const t = table(64)
    let checks = 0
    let passed = 0
    shrinkToFit(t, (x) => {
      checks++
      const cut = size(x) > 37
      if (!cut) passed++
      return cut
    })
    expect(size(t)).toBe(37)
    // Stepping down 1 px at a time took 28 checks here. A check that passes
    // measures every cell, so those are kept to a few.
    expect(checks).toBeLessThanOrEqual(11)
    expect(passed).toBeLessThanOrEqual(3)
  })

  test('a table that fits 1 px down costs no more than stepping', () => {
    const t = table(40)
    let checks = 0
    shrinkToFit(t, (x) => (checks++, size(x) > 39))
    expect(size(t)).toBe(39)
    expect(checks).toBe(2)
  })

  test('keeps the size when nothing is cut', () => {
    const t = table(50)
    shrinkToFit(t, () => false)
    expect(size(t)).toBe(50)
  })

  test('stops at the floor when every size is cut', () => {
    const t = table(64)
    shrinkToFit(t, () => true)
    expect(size(t)).toBe(22)
  })

  test('keeps a size between whole pixels when it fits there', () => {
    const t = table(40.5)
    shrinkToFit(t, (x) => size(x) > 38)
    expect(size(t)).toBe(37.5)
  })
})

describe('tableOverflow', () => {
  // A fixed-width table whose text is cut short above 30 px, in a zone that
  // holds every row.
  function zone() {
    document.body.innerHTML = `<div style="padding: 0"><table class="c-table has-widths" style="font-size: 40px">
      <tbody><tr style="visibility: visible"><td style="padding: 0">Platform 12b</td></tr></tbody>
    </table></div>`
    const box = document.querySelector<HTMLElement>('div')!
    Object.defineProperty(box, 'clientWidth', { value: 300 })
    Object.defineProperty(box, 'clientHeight', { value: 500 })
    const t = document.querySelector('table')!
    const cell = t.querySelector('td')!
    Object.defineProperty(cell, 'clientWidth', { value: 100 })
    let measures = 0
    const createRange = document.createRange.bind(document)
    document.createRange = () => {
      const r = createRange()
      r.getBoundingClientRect = () => {
        measures++
        return {
          width: parseFloat(t.style.fontSize) > 30 ? 200 : 50,
        } as DOMRect
      }
      return r
    }
    return {
      t,
      measures: () => measures,
      restore: () => (document.createRange = createRange),
    }
  }

  test('measures a table again only when its rows or size change', () => {
    const { t, measures, restore } = zone()
    try {
      tableOverflow(t)
      expect(size(t)).toBe(30)
      const first = measures()
      expect(first).toBeGreaterThan(0)

      t.style.fontSize = '40px'
      tableOverflow(t)
      expect(size(t)).toBe(30)
      expect(measures()).toBe(first)

      t.style.fontSize = '40px'
      t.querySelector('td')!.textContent = 'Platform 3'
      tableOverflow(t)
      expect(measures()).toBeGreaterThan(first)
    } finally {
      restore()
    }
  })
})
