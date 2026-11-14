import { describe, expect, test } from 'bun:test'
import { resolveAlert } from './alert'
import { validate } from './validate'

const now = new Date('2026-11-14T10:00:00Z')

describe('alerts', () => {
  test('a literal alert takes its level, icon and structure', () => {
    const a = resolveAlert(
      {
        level: 'danger',
        icon: 'fire',
        title: 'Fire alarm',
        message: 'Leave the building now.',
        steps: ['Use the nearest exit', 'Do not use the lifts'],
        footer: 'Assembly point B',
      },
      {},
      now,
    )
    expect(a).toEqual({
      level: 'danger',
      icon: 'fire',
      title: 'Fire alarm',
      message: 'Leave the building now.',
      steps: ['Use the nearest exit', 'Do not use the lifts'],
      footer: 'Assembly point B',
      mode: 'takeover',
    })
  })

  test('a bound alert comes whole from the data and clears with it', () => {
    const doc = { bind: '/alert' }
    const data = {
      alert: {
        level: 'warning',
        icon: 'storm',
        title: 'Storm',
        mode: 'banner',
      },
    }
    expect(resolveAlert(doc, data, now)).toMatchObject({
      icon: 'storm',
      mode: 'banner',
    })
    expect(resolveAlert(doc, { alert: null }, now)).toBeNull()
    expect(resolveAlert(doc, { alert: { level: 'danger' } }, now)).toBeNull()
  })
})

describe('alert fallbacks', () => {
  test('unknown levels and icons fall back to safe defaults', () => {
    const a = resolveAlert(
      { bind: '/a' },
      { a: { level: 'purple', icon: 'unicorn', title: 'X' } },
      now,
    )
    expect(a).toMatchObject({ level: 'danger', icon: 'danger' })
    const info = resolveAlert(
      { level: 'info', title: 'Lifts serviced today' },
      {},
      now,
    )
    expect(info!.icon).toBe('info')
  })

  test('an alert past its until time no longer shows', () => {
    const a = { title: 'Closed', until: '2026-11-14T09:59:00Z' }
    expect(resolveAlert(a, {}, now)).toBeNull()
    expect(
      resolveAlert({ ...a, until: '2026-11-14T11:00:00Z' }, {}, now),
    ).not.toBeNull()
  })

  test('the older text and state names still work', () => {
    const a = resolveAlert(
      { text: { bind: '/msg' }, state: 'warning' },
      { msg: 'Lift out of order' },
      now,
    )
    expect(a).toMatchObject({ level: 'warning', message: 'Lift out of order' })
  })

  test('validation names bad levels and icons', () => {
    const r = validate({
      alert: { level: 'red', icon: 'unicorn', title: 'X' },
      layout: { areas: ['a'] },
      zones: {},
    })
    expect(r.errors[0]).toBe(
      'alert.level: expected one of "info", "good", "warning", "danger"',
    )
    expect(r.errors[1]).toStartWith(
      'alert.icon: unknown icon, expected one of info, check, warning',
    )
  })

  test('an older alert with a fixed title hides while its text is empty', () => {
    const a = {
      title: 'Major incident',
      text: { bind: '/alert' },
      state: 'danger',
    }
    expect(resolveAlert(a as never, { alert: '' }, new Date())).toBeNull()
    expect(
      resolveAlert(a as never, { alert: 'Checkout is down' }, new Date()),
    ).toMatchObject({ title: 'Major incident', message: 'Checkout is down' })
  })
})
