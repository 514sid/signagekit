import type { JSX } from 'preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { Alert, Component, Data, GridLayout, Value } from './types'
import { items, text } from './data'
import { Stat, StateIcon, stateOf } from './stat'
import { Icon } from './icon'
import { isIcon } from './icons'
import { Table } from './table'
import { AlertView, useAlert } from './alert'
import { loadedView, loadView, type AnyView, type LazyType } from './views'
import { fitMessages } from './fit'
import { DASH, Empty } from './empty'
import { formatClock, formatCountdown, formatDate, useMinute } from './time'

type Props<T> = { c: T; data: Data }
type Of<K extends Component['type']> = Extract<Component, { type: K }>

const SIZES = { s: 24, m: 32, l: 48, xl: 64 }

function Heading({ c, data }: Props<Of<'heading'>>) {
  if (!text(c.text, data)) return <Empty text={DASH} />
  return (
    <h1
      class={`c-heading a-${c.align ?? 'start'}`}
      data-fit="wrap"
      data-kind="heading"
    >
      {text(c.text, data)}
    </h1>
  )
}

function Text({ c, data }: Props<Of<'text'>>) {
  if (!text(c.text, data)) return <Empty />
  const fit = c.fit ? { 'data-fit': 'wrap', 'data-kind': 'text' } : {}
  return (
    <p
      class={`c-text a-${c.align ?? 'start'}`}
      style={c.fit ? undefined : { fontSize: SIZES[c.size ?? 'm'] + 'px' }}
      {...fit}
    >
      {text(c.text, data)}
    </p>
  )
}

function List({ c, data }: Props<Of<'list'>>) {
  const rows = items(c.items, data)
    .map((v) => text(v as Value, data))
    .filter(Boolean)
  if (!rows.length) return <Empty />
  return (
    <ul class="c-list" data-fit="wrap" data-kind="list">
      {rows.map((v, i) => (
        <li key={i}>{v}</li>
      ))}
    </ul>
  )
}

function Image({ c, data }: Props<Of<'image'>>) {
  const src = text(c.src, data)
  // A picture that won't load shows the empty state, never a broken icon.
  const [failed, setFailed] = useState('')
  if (!src) return <Empty text="No image" />
  if (failed === src) return <Empty text="Image not available" />
  return (
    <img
      class="c-image"
      src={src}
      alt={c.alt ?? ''}
      decoding="async"
      onError={() => setFailed(src)}
      style={{ objectFit: c.fit ?? 'cover' }}
    />
  )
}

function Clock({ c }: Props<Of<'clock'>>) {
  const now = useMinute()
  return (
    <div class="c-clock" data-fit="line" data-kind="clock">
      <div class="c-clock-time">{formatClock(now, c.hour12)}</div>
      {c.show_date && <div class="c-clock-date">{formatDate(now)}</div>}
    </div>
  )
}

function Countdown({ c, data }: Props<Of<'countdown'>>) {
  const now = useMinute()
  const to = new Date(text(c.to, data))
  const label = text(c.label, data)
  return (
    <div class="c-stat" data-fit="line" data-kind="countdown">
      <div class="c-stat-value">
        {isNaN(to.getTime())
          ? DASH
          : formatCountdown(to, now) || text(c.done, data) || 'Now'}
      </div>
      {label && <div class="c-stat-label">{label}</div>}
    </div>
  )
}

// Swaps messages instantly, with no animation. Every message is measured up
// front and shown at one shared size, so the text never jumps between swaps.
function Cycle({ c, data }: Props<Of<'cycle'>>) {
  const ref = useRef<HTMLDivElement>(null)
  const messages = items(c.items, data)
    .map((v) => text(v as Value, data))
    .filter(Boolean)
  const key = messages.join('\n')
  const [index, setIndex] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current as
      (HTMLDivElement & { __messages?: string[] }) | null
    if (!el) return
    // The layout pass refits cycles with the rest of the screen.
    el.__messages = messages
    fitMessages(el, messages)
  }, [key])
  useEffect(() => {
    if (messages.length < 2) return
    const id = setInterval(
      () => setIndex((n) => n + 1),
      (c.seconds ?? 8) * 1000,
    )
    return () => clearInterval(id)
  }, [key, c.seconds])
  if (!messages.length) return <Empty />
  return (
    <div class={`c-cycle a-${c.align ?? 'start'}`} ref={ref} data-kind="cycle">
      {messages[index % messages.length] ?? ''}
    </div>
  )
}

function Stack({ c, data }: Props<Of<'stack'>>) {
  return (
    <div class={`c-stack d-${c.direction ?? 'column'}`}>
      {c.items.map((item, i) => (
        <Cell key={i} c={item} data={data} />
      ))}
    </div>
  )
}

type View<K extends Component['type']> = (p: Props<Of<K>>) => JSX.Element | null

/**
 * Renders a component whose code is in a separate chunk. The app preloads the
 * chunks a document needs, so this normally renders at once; if a chunk is
 * still on its way, the cell stays empty until it arrives.
 */
function Lazy({ c, data }: Props<Component>) {
  const type = c.type as LazyType
  const [View, setView] = useState<AnyView | undefined>(() => loadedView(type))
  useEffect(() => {
    if (!View) void loadView(type).then((v) => setView(() => v))
  }, [type, View])
  return View ? <View c={c as never} data={data} /> : null
}

// One view per component type; the type checker makes sure none is missing.
const VIEWS: { [K in Component['type']]: View<K> } = {
  heading: Heading,
  text: Text,
  stat: Stat,
  table: Table,
  list: List,
  image: Image,
  clock: Clock,
  countdown: Countdown,
  cycle: Cycle,
  chart: Lazy,
  stack: Stack,
  meter: Lazy,
  meters: Lazy,
  bars: Lazy,
  split: Lazy,
  status: Lazy,
  schedule: Lazy,
  queue: Lazy,
  clocks: Lazy,
  slideshow: Lazy,
  qr: Lazy,
}

function Render({ c, data }: Props<Component>) {
  const View = VIEWS[c.type] as View<typeof c.type>
  return <View c={c as never} data={data} />
}

// A cell is one full-bleed zone or stack part. The body is the box a component
// fills; fitting measures against it, below the optional title.
function Cell({ c, data }: Props<Component>) {
  const pinned = typeof c.size === 'number' ? String(c.size) : undefined
  const state = stateOf(c, data)
  const icon = isIcon(c.icon) ? c.icon : null
  const titleClass = `title${state !== 'neutral' ? ' has-state' : ''}${icon ? ' has-icon' : ''}`
  // A title can be bound, like a room name that changes with the data.
  const title = text(c.title, data)
  return (
    <div
      class={`cell s-${c.surface ?? 'base'} k-${c.type} state-${state}`}
      data-size={pinned}
      style={c.weight ? { flexGrow: c.weight } : undefined}
    >
      {title && (
        <div class={titleClass}>
          {/* Shown only in short zones, where the state label may not fit. */}
          {state !== 'neutral' && (
            <span class="title-state">
              <StateIcon state={state} />
            </span>
          )}
          {icon && <Icon name={icon} cls="title-icon" />}
          <span>{title}</span>
        </div>
      )}
      <div class="body">
        <Render c={c} data={data} />
      </div>
    </div>
  )
}

export function gridStyle(l: GridLayout): Record<string, string> {
  return {
    gridTemplateAreas: l.areas.map((a) => `"${a.trim()}"`).join(' '),
    gridTemplateColumns:
      l.columns ?? `repeat(${l.areas[0].trim().split(/\s+/).length}, 1fr)`,
    gridTemplateRows: l.rows ?? `repeat(${l.areas.length}, 1fr)`,
    gap: (l.gap ?? 2) + 'px',
    '--gap': (l.gap ?? 2) + 'px',
  }
}

export function Screen({
  zones,
  layout,
  data,
  alert,
}: {
  zones: Record<string, Component>
  layout: GridLayout
  data: Data
  alert?: Alert
}) {
  // A takeover alert replaces the layout; a banner sits above it.
  const active = useAlert(alert, data)
  if (active?.mode === 'takeover') return <AlertView a={active} />
  return (
    <div class="screen">
      {active && <AlertView a={active} />}
      <div class="grid" style={gridStyle(layout)}>
        {Object.entries(zones).map(([name, c]) => (
          <div key={name} class="zone" style={{ gridArea: name }}>
            <Cell c={c} data={data} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function Problems({
  errors,
  warnings,
}: {
  errors: string[]
  warnings: string[]
}) {
  if (errors.length + warnings.length === 0) return null
  return (
    <div class="problems" role="status">
      {errors.map((e, i) => (
        <div key={'e' + i}>Error: {e}</div>
      ))}
      {warnings.map((w, i) => (
        <div key={'w' + i}>Warning: {w}</div>
      ))}
    </div>
  )
}
