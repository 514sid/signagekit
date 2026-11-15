// Screens the bench mounts: every examples/<name>/ plus a generated stress
// screen that puts the fit pass at its worst.

import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

export interface Fixture {
  name: string
  layout: string
  data?: string
}

function examples(root: string): Fixture[] {
  const dir = join(root, 'examples')
  return readdirSync(dir).flatMap((name) => {
    const files = readdirSync(join(dir, name))
    const layout = files.find((f) => f.startsWith('layout.'))
    const data = files.find((f) => f.startsWith('data.'))
    if (!layout) return []
    return [
      {
        name,
        layout: readFileSync(join(dir, name, layout), 'utf8'),
        data: data ? readFileSync(join(dir, name, data), 'utf8') : undefined,
      },
    ]
  })
}

/** The fit pass at its worst: fixed-width table, long lists, a row of stats. */
function stress(): Fixture {
  const places = ['Amsterdam Centraal', 'Rotterdam', 'Utrecht', 'Den Haag HS']
  const rows = Array.from({ length: 40 }, (_, i) => [
    `14:${String(i).padStart(2, '0')}`,
    `${places[i % 4]} via Schiphol Airport and Leiden Centraal`,
    String((i % 9) + 1),
    i % 5 ? 'On time' : `+${i} min delayed`,
  ])
  const list = Array.from(
    { length: 60 },
    (_, i) => `Item ${i + 1}, a line of text`,
  )
  const stat = (i: number) => ({
    type: 'stat',
    title: `Metric ${i}`,
    value: `${(i * 12345.6).toFixed(1)}`,
    trend: 'up',
    delta: '+4.2%',
    label: 'since yesterday',
  })
  const layout = {
    version: 1,
    layout: {
      design: 'landscape',
      flow: [
        { zone: 's1', span: 3, height: 2 },
        { zone: 's2', span: 3, height: 2 },
        { zone: 's3', span: 3, height: 2 },
        { zone: 's4', span: 3, height: 2 },
        { zone: 'board', span: 8, height: 5 },
        { zone: 'list', span: 4, height: 5 },
        { zone: 'foot', height: '110px' },
      ],
    },
    zones: {
      s1: stat(1),
      s2: stat(2),
      s3: stat(3),
      s4: stat(4),
      board: {
        type: 'table',
        columns: ['Time', 'To', 'Plat.', 'Status'],
        widths: [1.2, 4, 1, 2.2],
        rows: { bind: '/rows' },
      },
      list: { type: 'list', items: { bind: '/list' } },
      foot: {
        type: 'cycle',
        items: Array.from(
          { length: 10 },
          (_, i) => `Service message ${i + 1}: platform changes this weekend`,
        ),
      },
    },
  }
  return {
    name: 'stress',
    layout: JSON.stringify(layout),
    data: JSON.stringify({ rows, list }),
  }
}

/**
 * A table with fixed widths in a tall, narrow zone: its height allows large
 * text, its cells don't, so the fit shrinks it a long way.
 */
function narrowTable(): Fixture {
  const rows = Array.from({ length: 4 }, (_, i) => [
    `Departure ${i + 1}`,
    'Amsterdam Centraal',
    'Platform 12b',
    'Delayed 15 min',
  ])
  return {
    name: 'narrow-table',
    layout: JSON.stringify({
      version: 1,
      layout: {
        design: 'landscape',
        flow: [
          { zone: 'board', span: 3, height: 1 },
          { zone: 'side', span: 9, height: 1 },
        ],
      },
      zones: {
        board: {
          type: 'table',
          columns: ['Train', 'To', 'Plat.', 'Status'],
          widths: [1, 1, 1, 1],
          rows,
        },
        side: { type: 'heading', text: 'Departures' },
      },
    }),
  }
}

export const fixtures = (root: string): Fixture[] => [
  ...examples(root),
  stress(),
  narrowTable(),
]
