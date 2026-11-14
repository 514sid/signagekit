type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const TRACK = /^(\d+(\.\d+)?(px|fr|%)|auto|min-content|max-content)$/
const NAME = /^[a-z][a-z0-9_-]*$/

function tracks(v: unknown, at: string, count: number, errs: string[]): void {
  if (v === undefined) return
  if (typeof v !== 'string')
    return void errs.push(`${at}: expected a string like "2fr 1fr"`)
  const parts = v.trim().split(/\s+/)
  const bad = parts.find((p) => !TRACK.test(p))
  if (bad)
    return void errs.push(
      `${at}: ${JSON.stringify(bad)} is not a track size, use px, fr, % or auto`,
    )
  if (parts.length !== count)
    errs.push(`${at}: has ${parts.length} sizes, the areas have ${count}`)
}

/** Checks that every named area is one filled rectangle, as CSS grid requires. */
function rectangles(grid: string[][], errs: string[]): void {
  const seen = new Set<string>()
  for (const name of new Set(grid.flat())) {
    if (name === '.' || seen.has(name)) continue
    seen.add(name)
    let r0 = Infinity,
      r1 = -1,
      c0 = Infinity,
      c1 = -1,
      cells = 0
    grid.forEach((row, r) =>
      row.forEach((n, c) => {
        if (n !== name) return
        cells++
        r0 = Math.min(r0, r)
        r1 = Math.max(r1, r)
        c0 = Math.min(c0, c)
        c1 = Math.max(c1, c)
      }),
    )
    if (cells !== (r1 - r0 + 1) * (c1 - c0 + 1))
      errs.push(`layout.areas: area "${name}" is not a rectangle`)
  }
}

function gap(l: Obj, errs: string[]): void {
  if (
    l.gap !== undefined &&
    (typeof l.gap !== 'number' || l.gap < 0 || l.gap > 200)
  )
    errs.push('layout.gap: expected a number of pixels from 0 to 200')
}

/** Accepts either a fixed grid ("areas") or a flow ("flow"), not both. */
export function layout(l: unknown, errs: string[]): string[] {
  if (!isObj(l))
    return (
      void errs.push('layout: expected an object with "flow" or "areas"'),
      []
    )
  if ('flow' in l && 'areas' in l)
    return (void errs.push('layout: use "flow" or "areas", not both'), [])
  return 'flow' in l ? flowLayout(l, errs) : gridLayout(l, errs)
}

const HEIGHT_PX = /^\d+(\.\d+)?px$/
const FLOW_KEYS = ['zone', 'span', 'height']

function flowItem(v: unknown, at: string, errs: string[]): string | null {
  if (typeof v === 'string') {
    if (NAME.test(v)) return v
    errs.push(`${at}: "${v}" is not a valid zone name`)
    return null
  }
  if (!isObj(v) || typeof v.zone !== 'string' || !NAME.test(v.zone)) {
    errs.push(`${at}: expected a zone name or {"zone": "name", "span": 6}`)
    return null
  }
  const { span, height } = v
  if (
    span !== undefined &&
    !(Number.isInteger(span) && (span as number) >= 1 && (span as number) <= 12)
  )
    errs.push(`${at}.span: expected a whole number of columns from 1 to 12`)
  if (
    height !== undefined &&
    !(typeof height === 'number' && height > 0 && height <= 100) &&
    !(typeof height === 'string' && HEIGHT_PX.test(height))
  )
    errs.push(`${at}.height: expected a share like 2, or pixels like "150px"`)
  for (const k of Object.keys(v))
    if (!FLOW_KEYS.includes(k))
      errs.push(`${at}.${k}: unknown property, expected zone, span or height`)
  return v.zone
}

function flowLayout(l: Obj, errs: string[]): string[] {
  if (!Array.isArray(l.flow) || l.flow.length === 0) {
    errs.push('layout.flow: expected a non-empty list of zones')
    return []
  }
  if (
    l.design !== undefined &&
    l.design !== 'landscape' &&
    l.design !== 'portrait'
  )
    errs.push('layout.design: expected "landscape" or "portrait"')
  for (const k of Object.keys(l))
    if (!['flow', 'design', 'gap'].includes(k))
      errs.push(
        `layout.${k}: not used with "flow", expected flow, design or gap`,
      )
  gap(l, errs)
  const names: string[] = []
  l.flow.forEach((v, i) => {
    const name = flowItem(v, `layout.flow[${i}]`, errs)
    if (!name) return
    if (names.includes(name))
      errs.push(`layout.flow[${i}]: zone "${name}" is already in the flow`)
    names.push(name)
  })
  return names
}

function gridLayout(l: Obj, errs: string[]): string[] {
  if (
    !Array.isArray(l.areas) ||
    l.areas.length === 0 ||
    l.areas.some((a) => typeof a !== 'string')
  ) {
    errs.push(
      'layout.areas: expected a non-empty array of strings like "head head"',
    )
    return []
  }
  const grid = (l.areas as string[]).map((a) => a.trim().split(/\s+/))
  const width = grid[0].length
  grid.forEach((row, i) => {
    if (row.length !== width)
      errs.push(
        `layout.areas[${i}]: has ${row.length} names, the first row has ${width}`,
      )
    row.forEach((n) => {
      if (n !== '.' && !NAME.test(n))
        errs.push(
          `layout.areas[${i}]: "${n}" is not a valid name, use lowercase letters, digits, - and _`,
        )
    })
  })
  if (errs.length) return []
  rectangles(grid, errs)
  tracks(l.columns, 'layout.columns', width, errs)
  tracks(l.rows, 'layout.rows', grid.length, errs)
  gap(l, errs)
  return [...new Set(grid.flat())].filter((n) => n !== '.')
}
