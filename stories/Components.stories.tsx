import type { Meta } from '@storybook/preact-vite'
import { colorArgs, colorArgTypes, screen, type ColorArgs } from './Frame'

// Each story is a full 1920x1080 screen that shows one component's variants,
// so sizes and fitting match what a screen renders.

const meta: Meta<ColorArgs> = {
  title: 'Components',
  argTypes: colorArgTypes,
  args: colorArgs,
}
export default meta

export const Surfaces = screen(
  { areas: ['a b c'] },
  {
    a: {
      type: 'text',
      title: 'Base',
      fit: true,
      text: 'Background color, the default.',
    },
    b: {
      type: 'text',
      title: 'Raised',
      surface: 'raised',
      fit: true,
      text: 'Surface color, to set a zone apart.',
    },
    c: {
      type: 'text',
      title: 'Accent',
      surface: 'accent',
      fit: true,
      text: 'Accent color, for the one thing to notice.',
    },
  },
)

export const Heading = screen(
  { areas: ['a', 'b', 'c'], rows: '1fr 1fr 2fr' },
  {
    a: { type: 'heading', text: 'Welcome' },
    b: {
      type: 'heading',
      title: 'With a title',
      text: 'Quarterly all-hands',
      align: 'center',
    },
    c: {
      type: 'heading',
      surface: 'raised',
      text: 'A longer heading wraps onto more lines and still fills its zone',
    },
  },
)

export const Text = screen(
  { areas: ['s m', 'l fit'] },
  {
    s: {
      type: 'text',
      title: 'Size s',
      size: 's',
      text: 'Small text for fine print.\nLine breaks are kept.',
    },
    m: {
      type: 'text',
      title: 'Size m',
      text: 'Medium text, the default size.',
    },
    l: { type: 'text', title: 'Size l', size: 'l', text: 'Large text.' },
    fit: {
      type: 'text',
      title: 'fit: true',
      surface: 'raised',
      fit: true,
      text: 'Fitted text grows to fill its zone.',
    },
  },
)

export const List = screen(
  { areas: ['a b'] },
  {
    a: {
      type: 'list',
      title: 'Notices',
      items: [
        'Fire drill Thursday at 10:00',
        'New vegan station opens Monday',
        'Lost and found is at reception',
      ],
    },
    b: {
      type: 'list',
      title: 'On accent',
      surface: 'accent',
      items: { bind: '/steps' },
    },
  },
  { steps: ['Scan your badge', 'Collect your tray', 'Pay at the till'] },
)

const art =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><rect width="160" height="90" fill="#1e3a8a"/><rect x="96" width="64" height="90" fill="#2563eb"/><circle cx="48" cy="45" r="26" fill="#f1f5f9"/></svg>',
  )

export const Image = screen(
  { areas: ['a b'] },
  {
    a: { type: 'image', src: art, alt: 'Shapes' },
    b: {
      type: 'image',
      title: 'contain',
      surface: 'raised',
      src: art,
      fit: 'contain',
      alt: 'Shapes',
    },
  },
)

export const ClockAndCountdown = screen(
  { areas: ['a b', 'c c'] },
  {
    a: { type: 'clock' },
    b: {
      type: 'clock',
      title: 'With date',
      surface: 'raised',
      hour12: true,
      show_date: true,
    },
    c: {
      type: 'countdown',
      title: 'Event starts in',
      to: new Date(Date.now() + 2.2 * 86_400_000).toISOString(),
      label: 'Doors open 30 minutes before',
    },
  },
)

export const Cycle = screen(
  { areas: ['a', 'b', 'c'], rows: '1fr 140px 140px' },
  {
    a: {
      type: 'text',
      fit: true,
      text: 'A cycle shows one message at a time and swaps to the next instantly. Every message gets the same size, set by the longest one, so nothing jumps.',
    },
    b: {
      type: 'cycle',
      surface: 'raised',
      seconds: 3,
      items: [
        'Coffee bar open until 16:00',
        'Card payments only after 14:00',
        'Reusable cups get 20p off',
      ],
    },
    c: {
      type: 'cycle',
      surface: 'accent',
      align: 'center',
      seconds: 3,
      items: { bind: '/alerts' },
    },
  },
  { alerts: ['Platform 4 is closed', 'Use the north entrance'] },
)

export const Stack = screen(
  { areas: ['a b'] },
  {
    a: {
      type: 'stack',
      title: 'Row stack',
      direction: 'row',
      items: [
        { type: 'stat', title: 'In', value: 412 },
        { type: 'stat', title: 'Out', value: 377 },
        { type: 'stat', title: 'Inside', surface: 'accent', value: 35 },
      ],
    },
    b: {
      type: 'stack',
      items: [
        { type: 'heading', text: 'Column stack' },
        {
          type: 'text',
          surface: 'raised',
          fit: true,
          text: 'Parts split the zone equally and are divided by hairline rules.',
        },
        { type: 'clock' },
      ],
    },
  },
)
