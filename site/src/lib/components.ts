// One sample per component for the Components page. Each sample is the zone
// as a user writes it; the page draws it in a frame of the given shape.

export interface Sample {
  type: string
  description: string
  /** CSS aspect-ratio of the preview frame. */
  aspect: string
  yaml: string
}

export const SAMPLES: Sample[] = [
  {
    type: 'heading',
    description: 'A large title that fills its zone.',
    aspect: '32 / 9',
    yaml: `type: heading
text: Welcome to Harbour House`,
  },
  {
    type: 'text',
    description:
      'A paragraph. With fit: true it fills the zone; otherwise size picks s, m, l or xl.',
    aspect: '16 / 9',
    yaml: `type: text
title: Today
fit: true
text: The pool reopens at 14:00 after its weekly clean. Towels are at reception.`,
  },
  {
    type: 'stat',
    description:
      'A big number with a unit, label and optional state, trend arrow and sparkline.',
    aspect: '4 / 3',
    yaml: `type: stat
title: Visitors today
value: 1284
trend: up
delta: +12%
good_when: up
label: vs last Saturday
spark: [880, 940, 1010, 990, 1120, 1210, 1284]`,
  },
  {
    type: 'meter',
    description: 'One value against a maximum, with a bar.',
    aspect: '4 / 3',
    yaml: `type: meter
title: Shelf fill, aisle 4
value: 64
max: 100
unit: '%'
thresholds: { warning: 70, danger: 40 }
label: Dairy chiller`,
  },
  {
    type: 'meters',
    description: 'One row per item, each against its own limit, bars lined up.',
    aspect: '16 / 9',
    yaml: `type: meters
title: Line speed, bottles per minute
items:
  - { label: Line 1, value: 412, max: 480 }
  - { label: Line 2, value: 301, max: 360 }
  - { label: Line 3, value: 188, max: 360 }
  - { label: Line 4, value: 0, max: 600, state: danger }`,
  },
  {
    type: 'bars',
    description: 'Ranked horizontal bars, largest first, values printed.',
    aspect: '16 / 9',
    yaml: `type: bars
title: Top reps, $K
items:
  - { label: Dana Reyes, value: 31.2 }
  - { label: Marcus Okafor, value: 28.4 }
  - { label: Lena Brandt, value: 26.9 }
  - { label: Sam Whitfield, value: 22.1 }`,
  },
  {
    type: 'split',
    description: 'One whole in up to six parts, with their shares printed.',
    aspect: '32 / 9',
    yaml: `type: split
title: Contacts by channel
items:
  - { label: Phone, value: 42 }
  - { label: Email, value: 31 }
  - { label: Chat, value: 27 }`,
  },
  {
    type: 'chart',
    description:
      'A line, area or column chart, with an optional labelled target line.',
    aspect: '16 / 9',
    yaml: `type: chart
kind: column
title: Revenue by hour, thousands
labels: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00']
series:
  - { name: Revenue, values: [9.1, 12.4, 14.8, 16.2, 17.5, 19.9] }
target: 15
target_label: Hourly target 15K`,
  },
  {
    type: 'table',
    description:
      "Rows and columns. Pages through the rows when they don't fit at a readable size.",
    aspect: '16 / 9',
    yaml: `type: table
title: Menu
columns: [Dish, Diet, Price]
align: [start, start, end]
rows:
  - [Tomato soup, VG, '4.50']
  - [Chicken curry, GF, '8.90']
  - [Mushroom risotto, V, '8.20']
  - [Falafel wrap, VG, '6.80']`,
  },
  {
    type: 'list',
    description: 'A bulleted list.',
    aspect: '16 / 9',
    yaml: `type: list
title: Notices
items:
  - Fire drill Thursday at 10:00
  - New vegan station opens Monday
  - Bring your own cup for 20p off`,
  },
  {
    type: 'status',
    description: 'Rows with a state icon each, like service health.',
    aspect: '16 / 9',
    yaml: `type: status
title: Services
items:
  - { label: Checkout, state: good }
  - { label: Payments, state: good }
  - { label: Search, state: warning, note: 'Slow, p95 1.2 s' }
  - { label: Office VPN, state: danger, note: Down }`,
  },
  {
    type: 'schedule',
    description: 'Entries from the current one on, with Now and Next marked.',
    aspect: '16 / 9',
    yaml: `type: schedule
title: Today in room 3.02
items:
  - { start: '10:00', end: '11:00', title: Northwind planning, detail: Priya Raman }
  - { start: '12:30', title: Cleaning and reset }
  - { start: '13:30', title: Hiring panel, detail: Tomas Lindqvist }
  - { start: '15:00', title: Design crit }`,
  },
  {
    type: 'queue',
    description: 'The number now being served, and the ones called before it.',
    aspect: '4 / 3',
    yaml: `type: queue
title: Counter
label: Now serving
current: B047
recent: [A112, B046, A111, B045]`,
  },
  {
    type: 'clock',
    description: 'The current time, optionally with the date.',
    aspect: '21 / 9',
    yaml: `type: clock
show_date: true`,
  },
  {
    type: 'clocks',
    description: 'One clock per time zone, each with a label.',
    aspect: '21 / 9',
    yaml: `type: clocks
title: Our offices
hour12: false
zones:
  - { label: London, timezone: Europe/London }
  - { label: New York, timezone: America/New_York }
  - { label: Tokyo, timezone: Asia/Tokyo }`,
  },
  {
    type: 'countdown',
    description:
      'Time left until a moment; shows its done text once it has passed.',
    aspect: '4 / 3',
    yaml: `type: countdown
title: Sale ends
to: '2026-11-22T21:00:00Z'
label: Ends Sunday
done: Sale over`,
  },
  {
    type: 'cycle',
    description:
      'One-line messages that swap instantly on a timer, never scrolling.',
    aspect: '32 / 9',
    yaml: `type: cycle
seconds: 8
items:
  - Coffee bar open until 16:00
  - Card payments only after 14:00
  - Reusable cups get 20p off`,
  },
  {
    type: 'image',
    description: 'A picture, filling the zone or shown whole.',
    aspect: '16 / 9',
    yaml: `type: image
src: /examples/images/kettle.svg
fit: cover
alt: Staff pick of the week`,
  },
  {
    type: 'slideshow',
    description: 'Pictures swapped instantly on a timer.',
    aspect: '16 / 9',
    yaml: `type: slideshow
seconds: 6
images:
  - /examples/images/snacks.svg
  - /examples/images/tote.svg
  - /examples/images/hamper.svg`,
  },
  {
    type: 'qr',
    description: 'A QR code, black on white so phones can scan it.',
    aspect: '4 / 3',
    yaml: `type: qr
title: Book this room
value: https://example.com/rooms/3.02
label: Scan to book`,
  },
  {
    type: 'stack',
    description:
      'Splits one zone into parts holding other components, in a row or a column.',
    aspect: '16 / 9',
    yaml: `type: stack
direction: row
items:
  - { type: stat, title: Wait time, value: 6, unit: min }
  - { type: stat, title: Seats free, value: 42 }
  - { type: text, surface: accent, title: Allergens, fit: true, text: Ask at the counter }`,
  },
]
