// Parameters may sit in the query or in the fragment; the fragment wins, so
// a packed `#s=` link can carry options too.

import {
  DEFAULT_SIZES,
  parseSize,
  unpack,
  type MountOptions,
  type Shared,
  type Size,
} from '@514sid/signagekit'

const query = new URLSearchParams(location.search)
const fragment = new URLSearchParams(location.hash.slice(1))

export const param = (k: string): string | null =>
  fragment.get(k) ?? query.get(k)

export type Mode = 'screen' | 'sizes' | 'schemes' | 'edit'

export function sizes(fallback: string[] = DEFAULT_SIZES): Size[] {
  const list = (param('size') ?? '')
    .split(',')
    .map(parseSize)
    .filter((s): s is Size => s !== null)
  return list.length ? list : fallback.map((n) => parseSize(n)!)
}

export function mode(): Mode {
  const m = param('mode')
  return m === 'sizes' || m === 'schemes' || m === 'edit' ? m : 'screen'
}

export function options(): Omit<MountOptions, 'layout' | 'data'> {
  const s = param('scheme')
  const scheme = s === 'light' || s === 'dark' ? s : undefined
  const now = param('now')
  const time = now ? new Date(now) : undefined
  return {
    // `scheme` in the link wins over the document's own, so a screen can be
    // checked in the other scheme without editing it.
    colors: scheme ? { scheme } : undefined,
    accent: param('accent') ?? undefined,
    timeZone: param('tz') ?? undefined,
    locale: param('locale') ?? undefined,
    now: time && !Number.isNaN(time.getTime()) ? time : undefined,
    showProblems: param('problems') === '1',
  }
}

async function text(url: string, what: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${what}: ${url} answered ${res.status}`)
  return res.text()
}

interface Listed {
  id: string
  layout: string
  data: string | null
}

async function example(id: string): Promise<Shared> {
  const list = (await (await fetch('/examples/index.json')).json()) as Listed[]
  const e = list.find((x) => x.id === id)
  if (!e) throw new Error(`no example called "${id}"`)
  return {
    layout: await text(e.layout, 'layout'),
    data: e.data ? await text(e.data, 'data') : undefined,
  }
}

export async function loadSource(): Promise<Shared | null> {
  const packed = param('s')
  if (packed) return unpack(packed)
  const id = param('example')
  if (id) return example(id)
  const layoutUrl = param('layout_url')
  const dataUrl = param('data_url')
  const layout =
    param('layout') ?? (layoutUrl ? await text(layoutUrl, 'layout') : null)
  if (layout === null) return null
  const data =
    param('data') ?? (dataUrl ? await text(dataUrl, 'data') : undefined)
  return { layout, data }
}

export const lunchExample = () => example('lunch')
