// Charts are drawn by uPlot (canvas, no dependencies, no animation). It loads
// as its own chunk, so screens without a chart never download it.
//
// Signage is not interactive, so there is no cursor, tooltip or zoom. Series
// identity never rests on color alone: two or more series get a legend with
// each series' latest value.

import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import type uPlotType from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { items, text } from './data'
import { track } from './ready'
import { Empty } from './empty'
import type { Chart as ChartSpec, Data, Value } from './types'

type UPlot = typeof uPlotType
let loading: Promise<UPlot> | undefined
// A failed load is forgotten, so the next draw tries again.
const loadUPlot = () =>
  (loading ??= import('uplot')
    .then((m) => m.default as unknown as UPlot)
    .catch((e: unknown) => {
      loading = undefined
      throw e
    }))

/** Numbers, or numeric text from YAML data; anything else leaves a gap. */
function toNumber(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

export interface Resolved {
  labels: string[]
  series: { name: string; values: (number | null)[] }[]
  target: number | null
  targetLabel: string
}

export function resolveChart(c: ChartSpec, data: Data): Resolved {
  const labels = items(c.labels, data).map((v) => text(v as Value, data))
  const series = c.series.map((s) => ({
    name: text(s.name, data),
    values: labels.map((_, i) => toNumber(items(s.values, data)[i])),
  }))
  const target = c.target === undefined ? null : toNumber(text(c.target, data))
  const targetLabel = text(c.target_label, data)
  return { labels, series, target, targetLabel }
}

const compact = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const fmt = (n: number | null) =>
  n === null
    ? ''
    : Math.abs(n) >= 10_000
      ? compact.format(n)
      : n.toLocaleString()

const lastValue = (values: (number | null)[]) =>
  [...values].reverse().find((v) => v !== null) ?? null

function cssVar(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim()
}

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

interface Look {
  fontSize: number
  muted: string
  line: string
  text: string
  background: string
  colors: string[]
}

/** Axis text scales with the chart so it stays readable at a distance. */
function look(el: HTMLElement, r: Resolved): Look {
  return {
    fontSize: Math.round(Math.max(16, Math.min(28, el.clientHeight / 16))),
    muted: cssVar(el, '--muted'),
    line: cssVar(el, '--line'),
    text: cssVar(el, '--text'),
    background: cssVar(el, '--background'),
    colors: r.series.map((_, i) => cssVar(el, `--series-${i + 1}`)),
  }
}

function axes(r: Resolved, l: Look, width: number): uPlotType.Axis[] {
  const base = {
    stroke: l.muted,
    font: `500 ${l.fontSize}px system-ui, sans-serif`,
    grid: { stroke: l.line, width: 1 },
    ticks: { show: false },
    gap: l.fontSize / 2,
  }
  // Label every nth point, so labels never collide on long series. Room per
  // label comes from the longest label's estimated width plus a gap.
  const longest = Math.max(1, ...r.labels.map((s) => s.length))
  const fits = Math.max(
    1,
    Math.floor(width / (longest * l.fontSize * 0.6 + l.fontSize * 1.2)),
  )
  const step = Math.ceil(r.labels.length / fits)
  return [
    {
      ...base,
      grid: { show: false },
      splits: () => r.labels.map((_, i) => i).filter((i) => i % step === 0),
      values: (_u, splits) => splits.map((i) => r.labels[i] ?? ''),
      size: l.fontSize * 2.2,
    },
    {
      ...base,
      values: (_u, splits) => splits.map((v) => fmt(v)),
      size: (_u, values) =>
        Math.max(...(values ?? ['']).map((v) => v.length)) * l.fontSize * 0.62 +
        l.fontSize,
    },
  ]
}

function series(
  uPlot: UPlot,
  c: ChartSpec,
  r: Resolved,
  l: Look,
): uPlotType.Series[] {
  const column = c.kind === 'column'
  return [
    {},
    ...r.series.map((s, i) => ({
      label: s.name,
      stroke: l.colors[i],
      width: column ? 0 : 3,
      fill:
        c.kind === 'area'
          ? hexToRgba(l.colors[i], 0.12)
          : column
            ? l.colors[i]
            : undefined,
      points: { show: false },
      paths: column
        ? uPlot.paths.bars!({ size: [0.6, 64], radius: [0.15, 0] })
        : undefined,
    })),
  ]
}

/**
 * Prints each column's value on its cap, in the text color, above the bar.
 * Runs in uPlot's draw hook, on the canvas, so sizes are in canvas pixels.
 */
function columnLabels(r: Resolved, l: Look) {
  return (u: uPlotType) => {
    const ratio = u.bbox.width / u.width || 1
    const { ctx } = u
    ctx.save()
    ctx.fillStyle = l.text
    ctx.font = `700 ${Math.round(l.fontSize * ratio)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    r.series[0].values.forEach((v, i) => {
      if (v === null) return
      const x = u.valToPos(i, 'x', true)
      const y = u.valToPos(v, 'y', true)
      ctx.fillText(fmt(v), x, y - l.fontSize * 0.35 * ratio)
    })
    ctx.restore()
  }
}

/** A solid line at the target, labelled at its right end. */
function targetLine(r: Resolved, l: Look) {
  return (u: uPlotType) => {
    if (r.target === null) return
    const ratio = u.bbox.width / u.width || 1
    const y = u.valToPos(r.target, 'y', true)
    const { ctx } = u
    ctx.save()
    ctx.strokeStyle = l.text
    ctx.globalAlpha = 0.7
    ctx.lineWidth = 2 * ratio
    ctx.beginPath()
    ctx.moveTo(u.bbox.left, y)
    ctx.lineTo(u.bbox.left + u.bbox.width, y)
    ctx.stroke()
    ctx.globalAlpha = 1
    // The label sits in a solid pill in inverse colors, so bars, lines and
    // grid behind it never cut through the text.
    const size = Math.round(l.fontSize * 0.9 * ratio)
    ctx.font = `600 ${size}px system-ui, sans-serif`
    const label = r.targetLabel || `Target ${fmt(r.target)}`
    const padX = size * 0.5
    const boxW = ctx.measureText(label).width + padX * 2
    const boxH = size * 1.5
    const right = u.bbox.left + u.bbox.width
    // Above the line when there's room, else below it.
    const top =
      y - boxH - 4 * ratio >= u.bbox.top ? y - boxH - 4 * ratio : y + 4 * ratio
    ctx.fillStyle = l.text
    ctx.beginPath()
    // roundRect is missing on older player browsers; a plain box will do.
    if (ctx.roundRect) ctx.roundRect(right - boxW, top, boxW, boxH, boxH / 4)
    else ctx.rect(right - boxW, top, boxW, boxH)
    ctx.fill()
    ctx.fillStyle = l.background
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, right - padX, top + boxH / 2)
    ctx.restore()
  }
}

/**
 * The y range: y_min and y_max when given; otherwise columns and areas start
 * at zero and lines fit their data. The target line always stays in view, and
 * columns get headroom for the value printed on each cap.
 */
function yRange(c: ChartSpec, r: Resolved) {
  return (_u: uPlotType, min: number, max: number): [number, number] => {
    const t = r.target
    let lo = c.kind === 'line' ? min : 0
    let hi = max
    if (t !== null) {
      lo = Math.min(lo, t)
      hi = Math.max(hi, t)
    }
    const pad =
      (hi - lo || Math.abs(hi) || 1) * (c.kind === 'column' ? 0.18 : 0.08)
    return [c.y_min ?? (c.kind === 'line' ? lo - pad : lo), c.y_max ?? hi + pad]
  }
}

async function draw(
  el: HTMLElement,
  c: ChartSpec,
  r: Resolved,
  onSize: (size: string) => void,
): Promise<() => void> {
  const uPlot = await loadUPlot()
  const width = el.clientWidth
  const height = el.clientHeight
  onSize(`${width}x${height}`)
  if (!width || !height) return () => {}
  const l = look(el, r)
  const plot = new uPlot(
    {
      width,
      height,
      padding: [l.fontSize, l.fontSize * 2, 0, 0],
      cursor: { show: false },
      legend: { show: false },
      select: { show: false, left: 0, top: 0, width: 0, height: 0 },
      scales: {
        x:
          c.kind === 'column'
            ? { time: false, range: (_u, min, max) => [min - 0.5, max + 0.5] }
            : { time: false },
        y: { range: yRange(c, r) },
      },
      axes: axes(r, l, width),
      series: series(uPlot, c, r, l),
      hooks: {
        draw: [
          ...(c.kind === 'column' ? [columnLabels(r, l)] : []),
          targetLine(r, l),
        ],
      },
    },
    [r.labels.map((_, i) => i), ...r.series.map((s) => s.values)],
    el,
  )
  return () => plot.destroy()
}

export function Chart({ c, data }: { c: ChartSpec; data: Data }) {
  const ref = useRef<HTMLDivElement>(null)
  const r = resolveChart(c, data)
  const key = JSON.stringify([c, r])
  // uPlot draws at a fixed size, so the chart redraws when its box changes,
  // like after the screen rotates. `drawn` is the size of the last draw.
  const [box, setBox] = useState('')
  const drawn = useRef('')

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let destroy: (() => void) | undefined
    let gone = false
    const done = draw(el, c, r, (size) => (drawn.current = size))
      .then((d) => {
        if (gone) d()
        else destroy = d
      })
      .catch((e) => console.error('signagekit: chart failed', e))
    track(done)
    return () => {
      gone = true
      destroy?.()
    }
  }, [key, box])

  const empty =
    !r.labels.length || r.series.every((s) => s.values.every((v) => v === null))

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      const size = `${el.clientWidth}x${el.clientHeight}`
      if (size !== drawn.current) setBox(size)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [empty])

  if (empty) return <Empty text="No data" />
  return (
    <div class="c-chart">
      {r.series.length > 1 && (
        <div class="c-chart-legend">
          {r.series.map((s, i) => (
            <span key={i} class="c-chart-key">
              <span
                class="c-chart-swatch"
                style={{ background: `var(--series-${i + 1})` }}
              />
              {s.name}
              <strong>{fmt(lastValue(s.values))}</strong>
            </span>
          ))}
        </div>
      )}
      <div class="c-chart-plot" ref={ref} />
    </div>
  )
}
