import { describe, expect, test } from 'bun:test'
import { canvasSize, flowGrid } from './flow'
import type { FlowLayout } from './types'

const lunch: FlowLayout = {
  flow: [
    { zone: 'head', span: 9, height: '170px' },
    { zone: 'clock', span: 3, height: '170px' },
    { zone: 'menu', span: 6, height: 2 },
    { zone: 'info', span: 6, height: 2 },
    { zone: 'news', height: '110px' },
  ],
}

// Each area row as "zone:columns", to read layouts at a glance.
const shape = (areas: string[]) =>
  areas.map((r) => {
    const counts = new Map<string, number>()
    for (const n of r.split(' ')) counts.set(n, (counts.get(n) ?? 0) + 1)
    return [...counts].map(([n, c]) => `${n}:${c}`).join(' ')
  })

describe('canvasSize', () => {
  test('keeps 1080 px on the short side', () => {
    expect(canvasSize(3840, 2160)).toEqual([1920, 1080])
    expect(canvasSize(1024, 768)).toEqual([1440, 1080])
    expect(canvasSize(1080, 1920)).toEqual([1080, 1920])
  })
})

describe('flowGrid', () => {
  test('keeps the landscape design on a 16:9 screen', () => {
    const g = flowGrid(lunch, 1920)
    expect(shape(g.areas)).toEqual([
      'head:9 clock:3',
      'menu:6 info:6',
      'news:12',
    ])
    expect(g.rows).toBe('170px 2fr 110px')
  })

  test('stacks zones into rows on a portrait screen', () => {
    const g = flowGrid(lunch, 1080)
    expect(shape(g.areas)).toEqual([
      'head:12',
      'clock:12',
      'menu:12',
      'info:12',
      'news:12',
    ])
    expect(g.rows).toBe('170px 170px 2fr 2fr 110px')
  })

  test('shrinks zones to keep rows on a 4:3 screen', () => {
    expect(shape(flowGrid(lunch, 1440).areas)).toEqual([
      'head:9 clock:3',
      'menu:6 info:6',
      'news:12',
    ])
  })

  test('never puts a fixed strip and a growing zone on one row', () => {
    const g = flowGrid(lunch, 2520)
    expect(shape(g.areas)).toEqual([
      'head:9 clock:3',
      'menu:6 info:6',
      'news:12',
    ])
  })

  test('packs a portrait design side by side on a landscape screen', () => {
    const tall: FlowLayout = {
      design: 'portrait',
      flow: ['a', 'b', { zone: 'c', span: 6 }, { zone: 'd', span: 6 }],
    }
    expect(shape(flowGrid(tall, 1080).areas)).toEqual([
      'a:12',
      'b:12',
      'c:6 d:6',
    ])
    expect(shape(flowGrid(tall, 1920).areas)).toEqual(['a:6 b:6', 'c:6 d:6'])
  })

  test('fills every row to 12 columns', () => {
    for (const w of [1080, 1300, 1440, 1920, 2520, 3840]) {
      for (const r of flowGrid(lunch, w).areas)
        expect(r.split(' ')).toHaveLength(12)
    }
  })

  test('a row full at its designed widths stays as written', () => {
    const g = flowGrid(
      {
        flow: [
          { zone: 'a', span: 4 },
          { zone: 'b', span: 8 },
          { zone: 'c', span: 4 },
          { zone: 'd', span: 8 },
        ],
      },
      1920,
    )
    expect(g.areas).toEqual([
      'a a a a b b b b b b b b',
      'c c c c d d d d d d d d',
    ])
  })
})
