import { describe, expect, test } from 'bun:test'
import { resolveChart } from './chart'
import type { Chart } from './types'
import { validate } from './validate'

const chart = (c: Record<string, unknown>) =>
  validate({ layout: { areas: ['a'] }, zones: { a: { type: 'chart', ...c } } })

describe('chart', () => {
  test('reads bound labels and numeric text, leaving gaps for the rest', () => {
    const c: Chart = {
      type: 'chart',
      kind: 'line',
      labels: { bind: '/days' },
      series: [{ name: 'Visitors', values: { bind: '/visitors' } }],
    }
    const r = resolveChart(c, {
      days: ['Mon', 'Tue', 'Wed'],
      visitors: ['1,204', 'n/a'],
    })
    expect(r.labels).toEqual(['Mon', 'Tue', 'Wed'])
    expect(r.series[0].values).toEqual([1204, null, null])
  })

  test('validates kind and series', () => {
    expect(chart({ kind: 'pie', labels: [], series: [] }).errors).toEqual([
      'zones.a.kind: expected one of "line", "area", "column"',
      'zones.a.series: expected 1 to 8 series',
    ])
    expect(
      chart({ kind: 'line', labels: ['a'], series: [{ values: [1] }] }).errors,
    ).toEqual(['zones.a.series[0]: expected {"name": ..., "values": [...]}'])
  })

  test('keeps column charts to one series', () => {
    const two = [
      { name: 'A', values: [1] },
      { name: 'B', values: [2] },
    ]
    expect(
      chart({ kind: 'column', labels: ['x'], series: two }).errors,
    ).toEqual([
      'zones.a.series: column charts take one series, use a line chart to compare several',
    ])
    expect(chart({ kind: 'line', labels: ['x'], series: two }).errors).toEqual(
      [],
    )
  })
})
