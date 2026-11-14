// What each component accepts. The validator walks these; schema.json
// describes the same rules for agents.

import {
  ALIGN,
  bool,
  clockZone,
  finite,
  thresholds,
  widths,
  capped,
  int,
  part,
  shape,
  chartSeries,
  isBind,
  list,
  oneOf,
  seconds,
  stateValue,
  str,
  strings,
  value,
  type Check,
} from './checks'
import type { ComponentType } from './types'

export interface Spec {
  required: Record<string, Check>
  optional: Record<string, Check>
}

export const SPECS: Record<ComponentType, Spec> = {
  heading: { required: { text: value }, optional: { align: ALIGN } },
  text: {
    required: { text: value },
    optional: { size: oneOf('s', 'm', 'l', 'xl'), align: ALIGN, fit: bool },
  },
  stat: {
    required: { value },
    optional: {
      label: value,
      unit: value,
      state: stateValue,
      trend: (v, at, e) =>
        isBind(v) ? undefined : oneOf('up', 'down', 'flat')(v, at, e),
      delta: value,
      good_when: oneOf('up', 'down'),
      format: oneOf('compact', 'full'),
      match_row: bool,
      thresholds,
      spark: list(value),
    },
  },
  table: {
    required: { columns: strings, rows: list(list(value)) },
    optional: {
      align: (v, at, e) =>
        Array.isArray(v)
          ? v.forEach((x, i) => ALIGN(x, `${at}[${i}]`, e))
          : e.push(`${at}: expected an array`),
      page_rows: int(1, 100),
      widths,
      seconds,
    },
  },
  list: { required: { items: list(value) }, optional: {} },
  image: {
    required: { src: value },
    optional: { fit: oneOf('cover', 'contain'), alt: str },
  },
  clock: { required: {}, optional: { hour12: bool, show_date: bool } },
  countdown: {
    required: { to: value },
    optional: { label: value, done: value },
  },
  chart: {
    required: {
      kind: oneOf('line', 'area', 'column'),
      labels: list(value),
      series: chartSeries,
    },
    optional: {
      target: value,
      target_label: value,
      y_min: finite,
      y_max: finite,
    },
  },
  cycle: {
    required: { items: list(value) },
    optional: { seconds: seconds, align: ALIGN },
  },
  stack: {
    required: { items: () => {} }, // checked recursively below
    optional: { direction: oneOf('row', 'column') },
  },
  meter: {
    required: { value },
    optional: {
      max: value,
      label: value,
      unit: value,
      state: stateValue,
      thresholds,
    },
  },
  meters: {
    required: { items: list(part) },
    optional: { max: value, unit: value, thresholds },
  },
  bars: {
    required: { items: list(part) },
    optional: { unit: value, limit: int(1, 50) },
  },
  split: { required: { items: capped(part, 6) }, optional: {} },
  status: {
    required: {
      items: list(shape({ label: value, state: stateValue }, { note: value })),
    },
    optional: {},
  },
  schedule: {
    required: {
      items: list(
        shape({ start: value, title: value }, { end: value, detail: value }),
      ),
    },
    optional: { rows: int(1, 20) },
  },
  queue: {
    required: { current: value },
    optional: { recent: list(value), label: value },
  },
  clocks: {
    required: {
      zones: capped(clockZone, 12),
    },
    optional: { hour12: bool },
  },
  slideshow: {
    required: { images: list(value) },
    optional: { seconds, fit: oneOf('cover', 'contain') },
  },
  qr: { required: { value }, optional: { label: value } },
}
