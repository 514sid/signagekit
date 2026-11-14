// Packs a layout and its data into a preview link. The text is deflated and
// base64url-encoded into the URL fragment, which never reaches a server and
// isn't held to the length limits on query strings. Uses the compression
// streams built into browsers and Node 18+, so it adds no dependency.

export const PREVIEW_BASE = 'https://signagekit.pages.dev/preview/'

export interface PreviewOptions {
  /** `screen` (default), `sizes`, `schemes` or `edit`. */
  mode?: 'screen' | 'sizes' | 'schemes' | 'edit'
  /**
   * Resolution: a name like `fullhd` or `portrait`, or `WIDTHxHEIGHT`. One
   * for `screen` and `schemes`, a list for `sizes`.
   */
  size?: string | string[]
  scheme?: 'dark' | 'light'
  accent?: string
  timeZone?: string
  locale?: string
  /** Show errors and warnings over the screen. */
  problems?: boolean
  /** Freeze the clock at this ISO time, like 2026-11-14T09:30. */
  now?: string
  /** Preview page to link to. Default the public site. */
  base?: string
}

export interface Shared {
  layout: string
  data?: string
}

async function pipe(
  bytes: Uint8Array,
  stream: GenericTransformStream,
): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** Packs layout and data text into the `s` value of a preview link. */
export async function pack(shared: Shared): Promise<string> {
  const json = JSON.stringify(shared.data ? shared : { layout: shared.layout })
  const bytes = new TextEncoder().encode(json)
  return toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')))
}

/** Reverses pack(). Throws on a damaged value. */
export async function unpack(s: string): Promise<Shared> {
  const bytes = await pipe(
    fromBase64Url(s),
    new DecompressionStream('deflate-raw'),
  )
  const v = JSON.parse(new TextDecoder().decode(bytes)) as Partial<Shared>
  if (typeof v.layout !== 'string') throw new Error('no layout in link')
  return {
    layout: v.layout,
    data: typeof v.data === 'string' ? v.data : undefined,
  }
}

/**
 * A link to the preview page showing this layout and data. Pass the text as
 * written, JSON or YAML, or objects, which are sent as JSON.
 */
export async function previewUrl(
  layout: string | object,
  data?: string | object,
  options: PreviewOptions = {},
): Promise<string> {
  const text = (v: string | object) =>
    typeof v === 'string' ? v : JSON.stringify(v)
  const url = new URL(options.base ?? PREVIEW_BASE)
  const q = url.searchParams
  if (options.mode && options.mode !== 'screen') q.set('mode', options.mode)
  if (options.size)
    q.set('size', ([] as string[]).concat(options.size).join(','))
  if (options.scheme) q.set('scheme', options.scheme)
  if (options.accent) q.set('accent', options.accent)
  if (options.timeZone) q.set('tz', options.timeZone)
  if (options.locale) q.set('locale', options.locale)
  if (options.problems) q.set('problems', '1')
  if (options.now) q.set('now', options.now)
  url.hash =
    's=' +
    (await pack({
      layout: text(layout),
      data: data === undefined ? undefined : text(data),
    }))
  return url.toString()
}
