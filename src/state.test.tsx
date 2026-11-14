import { afterEach, describe, expect, test } from 'bun:test'
import { render } from 'preact'
import { Screen } from './components'
import { toGrid } from './flow'
import { stateOf, trendOf } from './stat'
import { validate } from './validate'

const stat = (extra: Record<string, unknown>) => ({
  type: 'stat',
  value: 3,
  ...extra,
})

describe('stat states', () => {
  afterEach(() => (document.body.innerHTML = ''))

  test('resolves bound states and treats unknown ones as neutral', () => {
    const c = stat({ state: { bind: '/s' } }) as never
    expect(stateOf(c, { s: 'danger' })).toBe('danger')
    expect(stateOf(c, { s: 'purple' })).toBe('neutral')
    expect(stateOf(stat({}) as never, {})).toBe('neutral')
  })

  test('rejects an unknown literal state', () => {
    const r = validate({
      layout: { areas: ['a'] },
      zones: { a: stat({ state: 'bad' }) },
    })
    expect(r.errors).toEqual([
      'zones.a.state: expected one of "neutral", "good", "warning", "danger"',
    ])
  })

  test('marks the zone and pairs the icon with a label', () => {
    const { doc } = validate({
      layout: { areas: ['a b'] },
      zones: {
        a: stat({ state: 'warning' }),
        b: stat({ state: 'good', label: 'On target' }),
      },
    })
    document.body.innerHTML = '<div id="root"></div>'
    const root = document.getElementById('root')!
    render(
      <Screen
        zones={doc!.zones}
        layout={toGrid(doc!.layout, 1920)}
        data={{}}
      />,
      root,
    )
    const [a, b] = root.querySelectorAll('.cell')
    expect(a.className).toContain('state-warning')
    expect(a.querySelector('.c-state-icon')).not.toBeNull()
    expect(a.querySelector('.c-stat-label')!.textContent).toBe('Warning')
    expect(b.querySelector('.c-stat-label')!.textContent).toBe('On target')
  })
})

describe('stat trends', () => {
  const t = (extra: Record<string, unknown>, data = {}) =>
    trendOf(stat(extra) as never, data)

  test('colors the arrow only when good_when is set', () => {
    expect(t({ trend: 'up' })).toEqual({ dir: 'up', tone: 'neutral' })
    expect(t({ trend: 'up', good_when: 'up' })!.tone).toBe('good')
    expect(t({ trend: 'up', good_when: 'down' })!.tone).toBe('danger')
    expect(t({ trend: 'flat', good_when: 'up' })!.tone).toBe('neutral')
  })

  test('reads bound trends and ignores unknown ones', () => {
    expect(t({ trend: { bind: '/t' } }, { t: 'down' })!.dir).toBe('down')
    expect(t({ trend: { bind: '/t' } }, { t: 'sideways' })).toBeNull()
    expect(t({})).toBeNull()
  })

  test('rejects unknown literal trends', () => {
    const r = validate({
      layout: { areas: ['a'] },
      zones: { a: stat({ trend: 'sideways', good_when: 'left' }) },
    })
    expect(r.errors).toEqual([
      'zones.a.trend: expected one of "up", "down", "flat"',
      'zones.a.good_when: expected one of "up", "down"',
    ])
  })
})

describe('states named like Object keys', () => {
  afterEach(() => (document.body.innerHTML = ''))

  test('a bound state or trend like "constructor" is neutral', () => {
    const c = stat({ state: { bind: '/s' }, trend: { bind: '/t' } }) as never
    expect(stateOf(c, { s: 'constructor' })).toBe('neutral')
    expect(trendOf(c, { t: 'toString' })).toBeNull()
  })

  test('renders a stat with such data instead of throwing', () => {
    const { doc } = validate({
      layout: { areas: ['a'] },
      zones: { a: stat({ state: { bind: '/s' }, trend: { bind: '/t' } }) },
    })
    const root = document.createElement('div')
    document.body.appendChild(root)
    render(
      <Screen
        zones={doc!.zones}
        layout={toGrid(doc!.layout, 1920)}
        data={{ s: 'constructor', t: 'toString' }}
      />,
      root,
    )
    expect(root.querySelector('.c-stat')).not.toBeNull()
  })
})
