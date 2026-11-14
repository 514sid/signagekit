import type { Meta } from '@storybook/preact-vite'
import { colorArgs, colorArgTypes, screen, type ColorArgs } from './Frame'

const meta: Meta<ColorArgs> = {
  title: 'Components/Data',
  argTypes: colorArgTypes,
  args: colorArgs,
}
export default meta

const hours = Array.from({ length: 13 }, (_, i) => `${8 + i}:00`)

export const Stat = screen(
  { areas: ['a b c d'], rows: '1fr' },
  {
    a: { type: 'stat', title: 'Visitors', value: '1,284' },
    b: { type: 'stat', title: 'Wait time', value: 6, unit: 'min' },
    c: {
      type: 'stat',
      title: 'Uptime',
      surface: 'raised',
      value: '99.9',
      unit: '%',
      label: 'Last 30 days',
    },
    d: {
      type: 'stat',
      title: 'Open tickets',
      surface: 'accent',
      value: { bind: '/tickets' },
    },
  },
  { tickets: 17 },
)

export const States = screen(
  { areas: ['a b c d'], rows: '1fr' },
  {
    a: {
      type: 'stat',
      title: 'Queue',
      value: 4,
      unit: 'min',
      label: 'Normal',
      state: 'neutral',
    },
    b: {
      type: 'stat',
      title: 'Uptime',
      value: '99.9',
      unit: '%',
      state: 'good',
      label: 'On target',
    },
    c: {
      type: 'stat',
      title: 'Disk',
      value: 82,
      unit: '%',
      state: { bind: '/disk' },
    },
    d: {
      type: 'stat',
      title: 'Errors',
      value: 37,
      state: 'danger',
      label: 'Above limit',
    },
  },
  { disk: 'warning' },
)

export const Trends = screen(
  { areas: ['a b c d'], rows: '1fr' },
  {
    a: {
      type: 'stat',
      title: 'Visitors',
      value: '1,284',
      trend: 'up',
      delta: '+12%',
      good_when: 'up',
    },
    b: {
      type: 'stat',
      title: 'Wait time',
      value: 9,
      unit: 'min',
      trend: 'up',
      delta: '+3 min',
      good_when: 'down',
      state: 'warning',
    },
    c: {
      type: 'stat',
      title: 'Errors',
      value: 4,
      trend: 'down',
      delta: '-6',
      good_when: 'down',
    },
    d: {
      type: 'stat',
      title: 'Seats free',
      value: 42,
      trend: { bind: '/seats' },
      delta: '0',
    },
  },
  { seats: 'flat' },
)

/**
 * Big and small numbers sharing a row. Top: the default short format. Middle:
 * a million in full. Bottom: a billion in full beside small numbers, also full.
 */
export const MixedMagnitudes = screen(
  { areas: ['a b c d', 'e f g h', 'i j k l'] },
  {
    a: {
      type: 'stat',
      title: 'Page views',
      value: 1000000,
      trend: 'up',
      delta: '+8%',
      good_when: 'up',
    },
    b: { type: 'stat', title: 'Open incidents', value: 3, state: 'warning' },
    c: { type: 'stat', title: 'Revenue', value: 2500000000, unit: 'EUR' },
    d: {
      type: 'stat',
      title: 'Uptime',
      value: '99.9',
      unit: '%',
      state: 'good',
    },
    e: {
      type: 'stat',
      title: 'Page views, full',
      value: 1000000,
      format: 'full',
    },
    f: {
      type: 'stat',
      title: 'Open incidents, full',
      value: 3,
      state: 'warning',
      format: 'full',
    },
    g: {
      type: 'stat',
      title: 'Revenue, full',
      value: 12900,
      unit: 'EUR',
      format: 'full',
    },
    h: {
      type: 'stat',
      title: 'Uptime, full',
      value: '99.9',
      unit: '%',
      state: 'good',
      format: 'full',
    },
    i: {
      type: 'stat',
      title: 'Revenue, full, own size',
      value: 2500000000,
      unit: 'EUR',
      format: 'full',
      match_row: false,
    },
    j: {
      type: 'stat',
      title: 'Open incidents, full',
      value: 3,
      state: 'danger',
      format: 'full',
    },
    k: { type: 'stat', title: 'Sites, full', value: 42, format: 'full' },
    l: {
      type: 'stat',
      title: 'Queue, full',
      value: 7,
      unit: 'min',
      format: 'full',
    },
  },
)

export const Table = screen(
  { areas: ['a b'], columns: '3fr 2fr' },
  {
    a: {
      type: 'table',
      title: 'Departures',
      columns: ['Time', 'Destination', 'Platform'],
      align: ['start', 'start', 'end'],
      rows: { bind: '/departures' },
    },
    b: {
      type: 'table',
      title: 'Shrinks to fit',
      surface: 'raised',
      columns: ['Room', 'Status'],
      rows: Array.from({ length: 16 }, (_, i) => [
        `Room ${101 + i}`,
        i % 3 ? 'Free' : 'Busy',
      ]),
    },
  },
  {
    departures: [
      ['09:12', 'Cambridge', '4'],
      ['09:20', 'London Kings Cross', '1'],
      ['09:31', 'Peterborough', '2'],
      ['09:45', 'Stevenage', '3'],
    ],
  },
)

export const Chart = screen(
  { areas: ['line line', 'area column'] },
  {
    line: {
      type: 'chart',
      title: 'Visitors per hour, two series with a legend',
      kind: 'line',
      labels: hours,
      series: [
        {
          name: 'North entrance',
          values: [12, 40, 86, 120, 98, 140, 210, 190, 160, 120, 90, 60, 30],
        },
        {
          name: 'South entrance',
          values: [8, 22, 50, 70, 88, 92, 130, 150, 140, 110, 70, 40, 20],
        },
      ],
    },
    area: {
      type: 'chart',
      title: 'Energy use, kWh',
      kind: 'area',
      surface: 'raised',
      labels: { bind: '/days' },
      series: [{ name: 'Energy', values: { bind: '/energy' } }],
    },
    column: {
      type: 'chart',
      title: 'Tickets closed',
      kind: 'column',
      labels: { bind: '/days' },
      series: [{ name: 'Tickets', values: [34, 41, 38, 52, 47, 12, 9] }],
    },
  },
  {
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    energy: ['1,240', '1,310', '1,280', '1,450', '1,390', '620', '580'],
  },
)
