// The screen document a person or an assistant writes.
// schema.json describes the same format for agents.

import type { Colors } from './colors'

/** A literal, or a pointer into the data, like { "bind": "/menu/0/price" }. */
export type Bind = {
  bind: string
  /** Shown when the path is missing or empty in the data. */
  fallback?: string | number
}
export type Value = string | number | Bind

export type Surface = 'base' | 'raised' | 'accent'
export type Align = 'start' | 'center' | 'end'
export type TextSize = 's' | 'm' | 'l' | 'xl'

interface Base {
  surface?: Surface
  /** Short label shown above the component, like "Menu" or "Wait time". */
  title?: Value
  /** Pins the text size in px on the reference canvas, skipping fitting. */
  size?: number | TextSize
  /** Share of a stack's space, relative to its siblings. Default 1. */
  weight?: number
  /** A named icon shown before the title, in place of the square marker. */
  icon?: string
}

export interface Heading extends Base {
  type: 'heading'
  text: Value
  align?: Align
}
export interface Text extends Base {
  type: 'text'
  text: Value
  size?: TextSize
  align?: Align
  fit?: boolean
}
export type State = 'neutral' | 'good' | 'warning' | 'danger'

/**
 * Sets the state from the value, so data only has to carry numbers. With
 * danger above warning, higher is worse; with danger below, lower is worse.
 */
export interface Thresholds {
  warning?: number
  danger?: number
}
export interface Stat extends Base {
  type: 'stat'
  value: Value
  label?: Value
  unit?: Value
  /** Bound or literal; anything but good, warning or danger is neutral. */
  state?: Value
  /** up, down or flat; bound or literal. Anything else shows no arrow. */
  trend?: Value
  /** Change shown next to the arrow, like "+4.2%". */
  delta?: Value
  /** Which direction is good news; colors the arrow green or red. */
  good_when?: 'up' | 'down'
  /** compact (default) shortens numbers from 10,000 up; full never does. */
  format?: 'compact' | 'full'
  /** false keeps this stat's own size instead of matching its row. */
  match_row?: boolean
  /** Recent values drawn as a sparkline under the number. */
  spark?: Value[] | Bind
  thresholds?: Thresholds
}
export interface Table extends Base {
  type: 'table'
  columns: string[]
  rows: Value[][] | Bind
  align?: Align[]
  /** Rows per page; pages flip instantly every `seconds`. */
  page_rows?: number
  /** Relative column widths, like [3, 1, 1]. Long cells end in an ellipsis. */
  widths?: number[]
  seconds?: number
}
export interface List extends Base {
  type: 'list'
  items: Value[] | Bind
}
export interface Image extends Base {
  type: 'image'
  src: Value
  fit?: 'cover' | 'contain'
  alt?: string
}
export interface Clock extends Base {
  type: 'clock'
  hour12?: boolean
  show_date?: boolean
}
export interface Countdown extends Base {
  type: 'countdown'
  to: Value
  label?: Value
  /** Shown once the time has passed. Default "Now". */
  done?: Value
}
export interface ChartSeries {
  name: Value
  values: Value[] | Bind
}
/** Line, area or column chart, drawn by uPlot. */
export interface Chart extends Base {
  type: 'chart'
  kind: 'line' | 'area' | 'column'
  labels: Value[] | Bind
  series: ChartSeries[]
  /** A horizontal target line, like an SLO or a production goal. */
  target?: Value
  target_label?: Value
  /** Fixed y-axis range; either end can be left out. */
  y_min?: number
  y_max?: number
}
/** Shows one message at a time and swaps to the next instantly. */
export interface Cycle extends Base {
  type: 'cycle'
  items: Value[] | Bind
  seconds?: number
  align?: Align
}
export interface Stack extends Base {
  type: 'stack'
  direction?: 'row' | 'column'
  items: Component[]
}

export type Component =
  | Heading
  | Text
  | Stat
  | Table
  | List
  | Image
  | Clock
  | Countdown
  | Cycle
  | Chart
  | Stack
  | Meter
  | Meters
  | Bars
  | Split
  | Status
  | Schedule
  | Queue
  | Clocks
  | Slideshow
  | Qr

/** A labelled amount, used by meters, bars and split. */
export interface Part {
  label: Value
  value: Value
  max?: Value
  state?: Value
}
export type Parts = Part[] | Bind

/** One value against a limit. */
export interface Meter extends Base {
  type: 'meter'
  value: Value
  max?: Value
  label?: Value
  unit?: Value
  state?: Value
  thresholds?: Thresholds
}
/** Several meters, one row each, bars aligned. */
export interface Meters extends Base {
  type: 'meters'
  items: Parts
  max?: Value
  unit?: Value
  /** Applied to each row without its own state. */
  thresholds?: Thresholds
}
/** Ranked horizontal bars, largest first. */
export interface Bars extends Base {
  type: 'bars'
  items: Parts
  unit?: Value
  limit?: number
}
/** One whole split into up to six parts. */
export interface Split extends Base {
  type: 'split'
  items: Parts
}
/** Rows with a state icon each, like service health. */
export interface Status extends Base {
  type: 'status'
  items: { label: Value; state: Value; note?: Value }[] | Bind
}
/** Time-ordered entries; the current and next ones are marked. */
export interface Schedule extends Base {
  type: 'schedule'
  items: { start: Value; end?: Value; title: Value; detail?: Value }[] | Bind
  rows?: number
}
/** "Now serving" number with the recently called ones. */
export interface Queue extends Base {
  type: 'queue'
  current: Value
  recent?: Value[] | Bind
  label?: Value
}
/** Several clocks, one per time zone. */
export interface Clocks extends Base {
  type: 'clocks'
  /** `zone` is the older name for `timezone` and still works. */
  zones: { label: Value; timezone?: string; zone?: string }[]
  hour12?: boolean
}
/** Images that swap instantly on a timer. */
export interface Slideshow extends Base {
  type: 'slideshow'
  images: Value[] | Bind
  seconds?: number
  fit?: 'cover' | 'contain'
}
/** QR code, black on white for scanners, with an optional caption. */
export interface Qr extends Base {
  type: 'qr'
  value: Value
  label?: Value
}

export type ComponentType = Component['type']

/** A fixed grid: named areas, like CSS grid-template-areas. */
export interface GridLayout {
  areas: string[]
  columns?: string
  rows?: string
  gap?: number
}

/** One zone in a flow layout. */
export interface FlowItem {
  zone: string
  /** Columns out of 12 in the design orientation. Default 12. */
  span?: number
  /** A number is a share of the free height (like fr); "150px" is fixed. */
  height?: number | string
}

/** Zones in reading order, packed into rows to suit the screen's shape. */
export interface FlowLayout {
  flow: (string | FlowItem)[]
  design?: 'landscape' | 'portrait'
  gap?: number
}

export type Layout = GridLayout | FlowLayout

/**
 * A screen-wide message: full screen (takeover) or a strip across the top
 * (banner). It shows while its title or message is set and until `until`.
 * The whole alert can also be a bind to an object in the data.
 */
export interface AlertFields {
  level?: 'info' | 'good' | 'warning' | 'danger' | Bind
  icon?: string | Bind
  title?: Value
  message?: Value
  /** Older name for `message`. */
  text?: Value
  steps?: Value[] | Bind
  footer?: Value
  mode?: 'takeover' | 'banner'
  /** ISO date and time after which the alert no longer shows. */
  until?: Value
  /** Older name for `level`. */
  state?: 'warning' | 'danger'
}

export type Alert = AlertFields | Bind

export interface ScreenDoc {
  /** Format version, default 1. See src/version.ts. */
  version?: number
  colors?: Colors
  alert?: Alert
  layout: Layout
  zones: Record<string, Component>
}

export type Data = Record<string, unknown>
