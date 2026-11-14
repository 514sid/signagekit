import type { Meta } from '@storybook/preact-vite'
import { colorArgs, colorArgTypes, screen, type ColorArgs } from './Frame'

const meta: Meta<ColorArgs> = {
  title: 'Components/More',
  argTypes: colorArgTypes,
  args: colorArgs,
}
export default meta

export const Meters = screen(
  { areas: ['a b', 'c c'], rows: '1fr 1.4fr' },
  {
    a: {
      type: 'meter',
      title: 'Room occupancy',
      value: 34,
      max: 50,
      unit: 'people',
    },
    b: {
      type: 'meter',
      title: 'Disk',
      value: 91,
      max: 100,
      unit: '%',
      state: 'danger',
      label: 'Almost full',
    },
    c: {
      type: 'meters',
      title: 'Occupancy by floor',
      unit: 'seats',
      items: [
        { label: 'Floor 1', value: 42, max: 60 },
        { label: 'Floor 2', value: 55, max: 60, state: 'warning' },
        { label: 'Floor 3', value: 18, max: 60 },
        { label: 'Floor 4', value: 60, max: 60, state: 'danger' },
      ],
    },
  },
)

export const BarsAndSplit = screen(
  { areas: ['a b'] },
  {
    a: {
      type: 'bars',
      title: 'Sales by region',
      unit: 'EUR',
      items: [
        { label: 'North', value: 48200 },
        { label: 'South', value: 61900 },
        { label: 'East', value: 23100 },
        { label: 'West', value: 39800 },
        { label: 'Online', value: 87400 },
      ],
    },
    b: {
      type: 'split',
      title: 'Tickets by priority',
      surface: 'raised',
      items: [
        { label: 'Low', value: 46 },
        { label: 'Normal', value: 31 },
        { label: 'High', value: 15 },
        { label: 'Urgent', value: 8 },
      ],
    },
  },
)

export const StatusAndQueue = screen(
  { areas: ['a b'], columns: '3fr 2fr' },
  {
    a: {
      type: 'status',
      title: 'Services',
      items: [
        { label: 'Checkout', state: 'good', note: 'All systems normal' },
        { label: 'Payments', state: 'warning', note: 'Slow responses' },
        { label: 'Search', state: 'good' },
        { label: 'Email', state: 'danger', note: 'Outage since 09:40' },
        { label: 'Reports', state: 'neutral', note: 'Maintenance tonight' },
      ],
    },
    b: {
      type: 'queue',
      surface: 'raised',
      current: 'A127',
      recent: ['A126', 'B044', 'A125', 'C012'],
    },
  },
)

const at = (minutes: number) => {
  const d = new Date(Date.now() + minutes * 60_000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const ScheduleAndClocks = screen(
  { areas: ['a b'], columns: '3fr 2fr' },
  {
    a: {
      type: 'schedule',
      title: 'Room 4.12',
      items: [
        { start: at(-90), end: at(-30), title: 'Design review' },
        {
          start: at(-20),
          end: at(25),
          title: 'Quarterly planning',
          detail: 'Hosted by Finance',
        },
        {
          start: at(40),
          end: at(70),
          title: 'Customer call',
          detail: 'Acme Corp',
        },
        { start: at(90), title: 'Team sync' },
        { start: at(150), title: 'Interview' },
      ],
    },
    b: {
      type: 'clocks',
      title: 'Offices',
      surface: 'raised',
      zones: [
        { label: 'London', zone: 'Europe/London' },
        { label: 'New York', zone: 'America/New_York' },
        { label: 'Singapore', zone: 'Asia/Singapore' },
        { label: 'Sydney', zone: 'Australia/Sydney' },
      ],
    },
  },
)

export const Sparklines = screen(
  { areas: ['a b c'], rows: '1fr' },
  {
    a: {
      type: 'stat',
      title: 'Visitors',
      value: 1284,
      trend: 'up',
      delta: '+12%',
      good_when: 'up',
      spark: [820, 900, 870, 1010, 980, 1120, 1190, 1284],
    },
    b: {
      type: 'stat',
      title: 'Response time',
      value: 212,
      unit: 'ms',
      state: 'warning',
      spark: { bind: '/latency' },
    },
    c: {
      type: 'stat',
      title: 'Orders',
      value: 96,
      spark: [80, 92, 88, 101, 97, 99, 94, 96],
    },
  },
  { latency: ['140', '150', '138', '165', '190', '205', '198', '212'] },
)

const shape = (bg: string, fg: string) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><rect width="160" height="90" fill="${bg}"/><circle cx="80" cy="45" r="28" fill="${fg}"/></svg>`,
  )

export const QrAndSlideshow = screen(
  { areas: ['a b'], columns: '1fr 2fr' },
  {
    a: {
      type: 'qr',
      title: 'Book this room',
      value: 'https://example.com/rooms/4-12',
      label: 'Scan to book',
    },
    b: {
      type: 'slideshow',
      seconds: 4,
      images: [
        shape('#1e3a8a', '#f1f5f9'),
        shape('#14532d', '#fab219'),
        shape('#7f1d1d', '#f1f5f9'),
      ],
    },
  },
)

export const PagedTable = screen(
  { areas: ['a'] },
  {
    a: {
      type: 'table',
      title: 'Departures, 6 rows per page',
      columns: ['Time', 'Destination', 'Platform'],
      align: ['start', 'start', 'end'],
      page_rows: 6,
      seconds: 4,
      rows: Array.from({ length: 15 }, (_, i) => [
        at(5 + i * 7),
        ['Cambridge', 'London Kings Cross', 'Peterborough', 'Stevenage', 'Ely'][
          i % 5
        ],
        String((i % 4) + 1),
      ]),
    },
  },
)
