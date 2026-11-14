import { afterEach, describe, expect, test } from 'bun:test'
import { render } from 'preact'
import { Screen } from './components'
import { upcoming } from './lists'
import { qrPath } from './media'
import { validate } from './validate'
import { preloadViews } from './views'

const one = (zone: Record<string, unknown>) =>
  validate({ layout: { areas: ['a'] }, zones: { a: zone } })

describe('schedule', () => {
  const now = new Date(2026, 10, 14, 10, 30)
  const items = [
    { start: '09:00', end: '10:00', title: 'Done' },
    { start: '10:00', end: '11:00', title: 'Planning' },
    { start: '11:30', title: 'Call' },
    { start: '13:00', title: 'Sync' },
  ]

  test('marks the current entry now and the following one next', () => {
    const rows = upcoming(items, {}, now, 5)
    expect(rows.map((r) => [r.title, r.tag])).toEqual([
      ['Planning', 'now'],
      ['Call', 'next'],
      ['Sync', ''],
    ])
  })

  test('marks only one next when nothing is on', () => {
    const rows = upcoming(items, {}, new Date(2026, 10, 14, 11, 10), 5)
    expect(rows.map((r) => r.tag)).toEqual(['next', ''])
  })

  test('skips entries without a readable start', () => {
    expect(upcoming([{ start: 'soon', title: 'X' }], {}, now, 5)).toEqual([])
  })

  test('shows entries that share a start as on now together', () => {
    const shared = [
      { start: '09:00', title: 'Room A' },
      { start: '09:00', title: 'Room B' },
      { start: '10:00', title: 'Room C' },
    ]
    const rows = upcoming(shared, {}, new Date(2026, 10, 14, 9, 15), 5)
    expect(rows.map((r) => [r.title, r.tag])).toEqual([
      ['Room A', 'now'],
      ['Room B', 'now'],
      ['Room C', 'next'],
    ])
  })

  test('never ends a time of day at an entry with a full date', () => {
    const mixed = [
      { start: '09:00', title: 'Standup' },
      { start: '2030-01-01T09:00', title: 'Launch' },
    ]
    const rows = upcoming(mixed, {}, new Date(2026, 10, 14, 12, 0), 5)
    expect(rows.map((r) => r.title)).toEqual(['Launch'])
  })
})

describe('qr', () => {
  test('draws one unit square per dark module', () => {
    expect(
      qrPath([
        [true, false],
        [false, true],
      ]),
    ).toBe('M0 0h1v1h-1zM1 1h1v1h-1z')
  })
})

describe('new component checks', () => {
  test('split takes at most six parts', () => {
    const items = Array.from({ length: 7 }, (_, i) => ({
      label: `P${i}`,
      value: 1,
    }))
    expect(one({ type: 'split', items }).errors).toEqual([
      'zones.a.items: at most 6 items',
    ])
  })

  test('parts need a label and a value', () => {
    expect(one({ type: 'bars', items: [{ label: 'A' }] }).errors).toEqual([
      'zones.a.items[0].value: required',
    ])
  })

  test('clocks need a real time zone', () => {
    expect(
      one({ type: 'clocks', zones: [{ label: 'X', zone: 'Mars/Base' }] })
        .errors,
    ).toEqual([
      'zones.a.zones[0].zone: expected a time zone like "Europe/London"',
    ])
  })

  test('paged tables take a row count', () => {
    expect(
      one({ type: 'table', columns: ['a'], rows: [], page_rows: 0 }).errors,
    ).toEqual(['zones.a.page_rows: expected a whole number from 1 to 100'])
  })

  test('an alert without a title or message is dropped', () => {
    const r = validate({
      alert: { level: 'danger' },
      layout: { areas: ['a'] },
      zones: {},
    })
    expect(r.errors).toEqual(['alert: needs a title or a message'])
    expect(r.doc!.alert).toBeUndefined()
  })
})

describe('rendering', () => {
  afterEach(() => (document.body.innerHTML = ''))

  const mount = async (doc: Record<string, unknown>, data = {}) => {
    const { doc: d } = validate(doc)
    await preloadViews(d)
    document.body.innerHTML = '<div id="root"></div>'
    const root = document.getElementById('root')!
    render(
      <Screen
        zones={d!.zones}
        layout={d!.layout as never}
        data={data}
        alert={d!.alert}
      />,
      root,
    )
    return root
  }

  test('a bound alert replaces the layout and clears with its text', async () => {
    const doc = {
      alert: { text: { bind: '/alert' } },
      layout: { areas: ['a'] },
      zones: { a: { type: 'heading', text: 'Lunch' } },
    }
    expect(
      (await mount(doc, { alert: 'Evacuate' })).querySelector('.alert')!
        .textContent,
    ).toContain('Evacuate')
    expect(
      (await mount(doc, { alert: '' })).querySelector('.c-heading')!
        .textContent,
    ).toBe('Lunch')
  })

  test('a paged table collapses the rows of other pages', async () => {
    const root = await mount({
      layout: { areas: ['a'] },
      zones: {
        a: {
          type: 'table',
          columns: ['n'],
          rows: [['1'], ['2'], ['3']],
          page_rows: 2,
        },
      },
    })
    const rows = [...root.querySelectorAll('tbody tr')].map((r) => r.className)
    expect(rows).toEqual(['', '', 'off-page'])
    expect(root.querySelector('caption')!.textContent).toBe('1 / 2')
  })

  test('ranked bars sort largest first', async () => {
    const root = await mount({
      layout: { areas: ['a'] },
      zones: {
        a: {
          type: 'bars',
          items: [
            { label: 'A', value: 1 },
            { label: 'B', value: 9 },
          ],
        },
      },
    })
    expect(
      [...root.querySelectorAll('.c-bars-label')].map((e) => e.textContent),
    ).toEqual(['B', 'A'])
  })
})

describe('data-only features', () => {
  test('binds fall back when the path is missing or empty', async () => {
    const { text } = await import('./data')
    expect(text({ bind: '/nope', fallback: 'Ask at the desk' }, {})).toBe(
      'Ask at the desk',
    )
    expect(text({ bind: '/e', fallback: 0 }, { e: '' })).toBe('0')
    expect(text({ bind: '/v', fallback: 'x' }, { v: 'set' })).toBe('set')
  })

  test('thresholds set the state, in either direction', async () => {
    const { thresholdState } = await import('./stat')
    expect(thresholdState(95, { warning: 80, danger: 90 })).toBe('danger')
    expect(thresholdState(85, { warning: 80, danger: 90 })).toBe('warning')
    expect(thresholdState(10, { warning: 80, danger: 90 })).toBe('neutral')
    expect(thresholdState(15, { warning: 40, danger: 20 })).toBe('danger')
    expect(thresholdState(30, { warning: 40, danger: 20 })).toBe('warning')
  })

  test('missing binds are reported with their path', async () => {
    const { missingBinds } = await import('./binds')
    const doc = {
      zones: {
        a: { type: 'stat', value: { bind: '/kpi/x' } },
        b: { type: 'stat', value: { bind: '/kpi/y', fallback: '-' } },
      },
    }
    expect(missingBinds(doc, { kpi: {} })).toEqual([
      'zones.a.value: /kpi/x is not in the data, shown as empty',
    ])
  })

  test('the old clock key still works and errors use it', () => {
    const ok = one({
      type: 'clocks',
      zones: [{ label: 'A', zone: 'Europe/London' }],
    })
    expect(ok.errors).toEqual([])
    const bad = one({
      type: 'clocks',
      zones: [{ label: 'A', timezone: 'Nowhere/X' }],
    })
    expect(bad.errors).toEqual([
      'zones.a.zones[0].timezone: expected a time zone like "Europe/London"',
    ])
  })

  test('shared overrides are checked', () => {
    expect(one({ type: 'stat', value: 1, size: 2, weight: 0 }).errors).toEqual([
      'zones.a.size: expected a number from 8 to 400',
      'zones.a.weight: expected a number from 0.1 to 20',
    ])
  })
})
