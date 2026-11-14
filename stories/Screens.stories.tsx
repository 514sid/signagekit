import type { Meta, StoryObj } from '@storybook/preact-vite'
import lunch from '../src/fixtures/lunch.layout.json'
import lunchData from '../src/fixtures/lunch.data.json'
import {
  ASPECTS,
  colorArgTypes,
  Frame,
  type Aspect,
  type ColorArgs,
} from './Frame'

type Args = ColorArgs & { aspect: Aspect }

const meta: Meta<Args> = {
  title: 'Screens/Lunch menu',
  argTypes: {
    ...colorArgTypes,
    aspect: { control: 'inline-radio', options: Object.keys(ASPECTS) },
  },
  args: { scheme: 'dark', accent: '#2563eb', aspect: '16:9' },
  render: ({ scheme, accent, aspect }) => (
    <Frame
      doc={lunch}
      data={lunchData}
      colors={{ scheme, accent }}
      aspect={aspect}
    />
  ),
}
export default meta

type Story = StoryObj<Args>

export const Landscape: Story = {}
export const Light: Story = { args: { scheme: 'light', accent: '#2563eb' } }
export const FourByThree: Story = { args: { aspect: '4:3' } }
export const UltraWide: Story = { args: { aspect: '21:9' } }
export const Portrait: Story = { args: { aspect: '9:16' } }

/** One landscape design on every screen shape. */
export const EveryShape: Story = {
  render: ({ scheme, accent }) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {(['16:9', '4:3', '9:16'] as const).map((aspect) => (
        <div key={aspect} style={{ flex: aspect === '9:16' ? '0 0 22%' : 1 }}>
          <Frame
            doc={lunch}
            data={lunchData}
            colors={{ scheme, accent }}
            aspect={aspect}
            maxWidth={9999}
          />
          <p style={{ font: '13px system-ui', marginTop: 8 }}>{aspect}</p>
        </div>
      ))}
    </div>
  ),
}

/** A bound alert takes over the whole screen until its text clears. */
export const Alert: Story = {
  render: ({ scheme, accent }) => (
    <Frame
      doc={{
        ...lunch,
        alert: { text: { bind: '/alert' }, title: 'Fire alarm' },
      }}
      data={{
        ...lunchData,
        alert: 'Leave the building by the nearest exit. Do not use the lifts.',
      }}
      colors={{ scheme, accent }}
    />
  ),
}

export const WithProblems: Story = {
  render: ({ scheme, accent }) => (
    <Frame
      doc={{ ...lunch, zones: { ...lunch.zones, menu: { type: 'chart' } } }}
      data={lunchData}
      colors={{ scheme, accent, muted: '#333333' } as ColorArgs}
    />
  ),
}
