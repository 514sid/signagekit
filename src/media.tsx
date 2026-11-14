import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { items, text } from './data'
import { Empty } from './empty'
import { sizeQr } from './qr-size'
import { track } from './ready'
import type { Data, Qr, Slideshow, Value } from './types'

/** Swaps images instantly on a timer and preloads the next one. */
export function SlideshowView({ c, data }: { c: Slideshow; data: Data }) {
  // Images that fail to load drop out of the rotation.
  const [failed, setFailed] = useState<string[]>([])
  const srcs = items(c.images, data)
    .map((v) => text(v as Value, data))
    .filter((s) => s && !failed.includes(s))
  const key = srcs.join('\n')
  const [index, setIndex] = useState(0)
  const current = srcs.length ? index % srcs.length : 0

  useEffect(() => {
    if (srcs.length < 2) return
    const id = setInterval(
      () => setIndex((n) => n + 1),
      (c.seconds ?? 10) * 1000,
    )
    return () => clearInterval(id)
  }, [key, c.seconds])

  useEffect(() => {
    if (srcs.length < 2) return
    const next = new Image()
    next.decoding = 'async'
    next.src = srcs[(current + 1) % srcs.length]
  }, [key, current])

  if (!srcs.length)
    return <Empty text={failed.length ? 'Images not available' : 'No images'} />
  const src = srcs[current]
  return (
    <img
      class="c-image"
      src={src}
      alt=""
      decoding="async"
      onError={() => setFailed((f) => (f.includes(src) ? f : [...f, src]))}
      style={{ objectFit: c.fit ?? 'cover' }}
    />
  )
}

type Encode = (typeof import('uqr'))['encode']
let loading: Promise<Encode> | undefined
const loadQr = () => (loading ??= import('uqr').then((m) => m.encode))

/**
 * One SVG path for all dark modules, with a four-module quiet zone. Always
 * black on white: many phone scanners fail on inverted codes.
 */
export function qrPath(grid: boolean[][]): string {
  let d = ''
  grid.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) d += `M${x} ${y}h1v1h-1z`
    }),
  )
  return d
}

export function QrView({ c, data }: { c: Qr; data: Data }) {
  const value = text(c.value, data)
  const label = text(c.label, data)
  const [code, setCode] = useState<{ size: number; d: string } | null>(null)

  useLayoutEffect(() => {
    if (!value) return
    let gone = false
    const done = loadQr().then((encode) => {
      const qr = encode(value, { ecc: 'M', border: 4 })
      if (!gone) setCode({ size: qr.size, d: qrPath(qr.data) })
    })
    track(done)
    return () => {
      gone = true
    }
  }, [value])

  // The code arrives after its library loads, so it sizes itself then too.
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (box.current?.parentElement) sizeQr(box.current.parentElement)
  }, [code])

  if (!value) return <Empty text="No link" />
  return (
    <div class="c-qr" ref={box}>
      {code && (
        <svg
          class="c-qr-code"
          viewBox={`0 0 ${code.size} ${code.size}`}
          shape-rendering="crispEdges"
          role="img"
          aria-label={label || 'QR code'}
        >
          <rect width={code.size} height={code.size} fill="#ffffff" />
          <path d={code.d} fill="#000000" />
        </svg>
      )}
      {label && <div class="c-qr-label">{label}</div>}
    </div>
  )
}
