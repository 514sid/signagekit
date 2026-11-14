import { afterEach, describe, expect, test } from 'bun:test'
import { render } from 'preact'
import { Screen } from './components'
import { toGrid } from './flow'
import { validate } from './validate'

const doc = (zone: Record<string, unknown>) =>
  validate({ layout: { areas: ['a'] }, zones: { a: zone } })

describe('cycle', () => {
  afterEach(() => (document.body.innerHTML = ''))

  test('shows the first non-empty message without animation', () => {
    const { doc: d } = doc({
      type: 'cycle',
      items: { bind: '/messages' },
      seconds: 5,
    })
    document.body.innerHTML = '<div id="root"></div>'
    const root = document.getElementById('root')!
    render(
      <Screen
        zones={d!.zones}
        layout={toGrid(d!.layout, 1920)}
        data={{ messages: ['', 'Open until 16:00', 'Cards only'] }}
      />,
      root,
    )
    const el = root.querySelector<HTMLElement>('.c-cycle')!
    expect(el.textContent).toBe('Open until 16:00')
    expect(el.getAnimations?.() ?? []).toEqual([])
  })

  test('checks the interval', () => {
    expect(doc({ type: 'cycle', items: ['a'], seconds: 1 }).errors).toEqual([
      'zones.a.seconds: expected a number of seconds from 3 to 3600',
    ])
  })

  test('has no ticker component', () => {
    expect(doc({ type: 'ticker', text: 'x' }).errors[0]).toStartWith(
      'zones.a.type: unknown component "ticker"',
    )
  })
})
