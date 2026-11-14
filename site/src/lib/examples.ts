import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'
import { REPO } from './docs'

// The repository root. Bundled pages run from site/dist, so it comes from
// the working directory: the repository itself, or site/ inside it.
export const ROOT = existsSync(join(process.cwd(), 'schema.json'))
  ? process.cwd()
  : resolve(process.cwd(), '..')

export interface Example {
  /** Folder name in examples/. */
  id: string
  title: string
  group: string
  portrait: boolean
  types: string[]
  /** URLs of the files on the site. */
  layout: string
  data: string | null
  sourceUrl: string
  /** Paths in the repository. */
  source: { layout: string; data: string | null }
}

// The examples' data was written for this moment, so the gallery and its
// preview links show them at it: alerts still showing, schedules mid-day.
export const DEMO_NOW = '2026-11-14T10:30'

export const GROUPS: [string, [string, string][]][] = [
  [
    'Food and hospitality',
    [
      ['lunch', 'Canteen menu'],
      ['hotel-lobby', 'Hotel lobby'],
    ],
  ],
  [
    'Offices',
    [
      ['meeting-room', 'Meeting room door'],
      ['office-air', 'Office air quality'],
      ['sales-today', 'Sales today'],
    ],
  ],
  [
    'Operations',
    [
      ['noc-wall', 'Network operations wall'],
      ['oee-line', 'Production line OEE'],
      ['warehouse', 'Warehouse floor'],
      ['trading-floor', 'Trading desk'],
    ],
  ],
  [
    'Public spaces',
    [
      ['station-departures', 'Station departures'],
      ['clinic-queue', 'Clinic waiting room'],
      ['gym-classes', 'Gym classes'],
      ['store-promo', 'Store promotions'],
    ],
  ],
  [
    'Alerts',
    [
      ['fire-alarm', 'Fire alarm, full screen'],
      ['snow-closure', 'School closure, full screen'],
      ['storm-banner', 'Storm warning, banner'],
    ],
  ],
]

interface Doc {
  layout?: { design?: string }
  zones?: Record<string, { type?: string; text?: unknown } | null>
}

const fileIn = (dir: string, kind: 'layout' | 'data') =>
  readdirSync(join(ROOT, dir)).find((f) =>
    new RegExp(`^${kind}\\.(json|ya?ml)$`).test(f),
  )

function describe(path: string) {
  const doc = (parse(readFileSync(join(ROOT, path), 'utf8')) ?? {}) as Doc
  const zones = Object.values(doc.zones ?? {})
  const heading = zones.find(
    (z) => z?.type === 'heading' && typeof z.text === 'string',
  )
  const types = [
    ...new Set(zones.map((z) => z?.type).filter((t): t is string => !!t)),
  ]
  return {
    heading: heading?.text as string | undefined,
    portrait: doc.layout?.design === 'portrait',
    types: types.slice(0, 4),
  }
}

let cache: Example[] | undefined

export function examples(): Example[] {
  if (cache) return cache
  const groupOf = new Map(
    GROUPS.flatMap(([g, items]) => items.map(([id]) => [id, g] as const)),
  )
  const titleOf = new Map(GROUPS.flatMap(([, items]) => items))
  const out: Example[] = []
  for (const id of readdirSync(join(ROOT, 'examples')).sort()) {
    const dir = join('examples', id)
    const layout = fileIn(dir, 'layout')
    if (!layout) continue
    const data = fileIn(dir, 'data')
    const d = describe(join(dir, layout))
    out.push({
      id,
      title:
        titleOf.get(id) ??
        d.heading ??
        id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      group: groupOf.get(id) ?? 'More',
      portrait: d.portrait,
      types: d.types,
      layout: `/examples/files/${id}/${layout}`,
      data: data ? `/examples/files/${id}/${data}` : null,
      sourceUrl: `${REPO}/tree/main/examples/${id}`,
      source: {
        layout: join(dir, layout),
        data: data ? join(dir, data) : null,
      },
    })
  }
  return (cache = out)
}

export const readRepo = (path: string) => readFileSync(join(ROOT, path), 'utf8')
