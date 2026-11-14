import type { Meta, StoryObj } from '@storybook/preact-vite'
import lunch from '../src/fixtures/lunch.layout.json'
import lunchData from '../src/fixtures/lunch.data.json'
import { Icon } from '../src/icon'
import { ICON_NAMES } from '../src/icons'
import {
  ASPECTS,
  colorArgTypes,
  Frame,
  type Aspect,
  type ColorArgs,
} from './Frame'

const ALERTS = {
  'Fire evacuation': {
    level: 'danger',
    icon: 'fire',
    title: 'Fire alarm',
    message: 'Leave the building now by the nearest exit.',
    steps: [
      'Do not use the lifts',
      'Leave your belongings',
      'Gather at assembly point B, car park',
    ],
    footer: 'Fire wardens wear yellow vests. Wait for the all clear.',
  },
  Lockdown: {
    level: 'danger',
    icon: 'lockdown',
    title: 'Lockdown',
    message:
      'Stay where you are. Lock or block the door and stay out of sight.',
    steps: [
      'Silence your phone',
      'Do not open the door to anyone',
      'Wait for police or security to release you',
    ],
  },
  'Severe weather': {
    level: 'warning',
    icon: 'storm',
    title: 'Storm warning',
    message:
      'High winds expected from 15:00. Outdoor areas and the roof terrace are closed.',
    footer: 'Updated 11:20 by Facilities',
  },
  'Medical emergency': {
    level: 'warning',
    icon: 'medical',
    title: 'Medical emergency, level 2',
    message: 'Keep the east corridor clear for paramedics.',
    steps: [
      'First aiders to the east stairwell',
      'Bring the defibrillator from reception',
    ],
  },
  'All clear': {
    level: 'good',
    icon: 'check',
    title: 'All clear',
    message: 'You can return to the building. Thank you for your patience.',
  },
  'Maintenance notice': {
    level: 'info',
    icon: 'maintenance',
    title: 'Planned maintenance',
    message:
      'Lifts B and C are out of service until 14:00. Please use lift A or the stairs.',
  },
  'Network outage banner': {
    mode: 'banner',
    level: 'warning',
    icon: 'network',
    title: 'Wi-Fi is down on floors 3 to 5',
    message: 'Use the wired desks by the windows. IT expects a fix by 12:30.',
    footer: 'IT 4400',
  },
  'Closure banner': {
    mode: 'banner',
    level: 'info',
    icon: 'closed',
    title: 'Café closes at 14:00 today',
    message: 'Vending machines on level 1 stay open.',
  },
} as const

type Name = keyof typeof ALERTS
type Args = ColorArgs & { alert: Name; aspect: Aspect }

const meta: Meta<Args> = {
  title: 'Components/Alerts',
  argTypes: {
    alert: { control: 'select', options: Object.keys(ALERTS) },
    aspect: { control: 'inline-radio', options: Object.keys(ASPECTS) },
    ...colorArgTypes,
  },
  args: {
    alert: 'Fire evacuation',
    aspect: '16:9',
    scheme: 'dark',
    accent: '#2563eb',
  },
  render: ({ alert, aspect, scheme, accent }) => (
    <Frame
      doc={{ ...lunch, alert: { bind: '/alert' } }}
      data={{ ...lunchData, alert: ALERTS[alert] }}
      aspect={aspect}
      colors={{ scheme, accent }}
    />
  ),
}
export default meta

type Story = StoryObj<Args>

export const FireEvacuation: Story = {}
export const Lockdown: Story = { args: { alert: 'Lockdown' } }
export const SevereWeather: Story = { args: { alert: 'Severe weather' } }
export const MedicalEmergency: Story = { args: { alert: 'Medical emergency' } }
export const AllClear: Story = { args: { alert: 'All clear' } }
export const MaintenanceNotice: Story = {
  args: { alert: 'Maintenance notice' },
}
export const NetworkOutageBanner: Story = {
  args: { alert: 'Network outage banner' },
}
export const ClosureBanner: Story = { args: { alert: 'Closure banner' } }
export const PortraitFire: Story = { args: { aspect: '9:16' } }

/** Every icon an alert or a zone title can use, by name. */
export const Icons: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 16,
        font: '13px system-ui',
      }}
    >
      {ICON_NAMES.map((name) => (
        <div
          key={name}
          style={{ display: 'grid', justifyItems: 'center', gap: 6 }}
        >
          <span style={{ width: 40, height: 40, display: 'block' }}>
            <Icon name={name} />
          </span>
          {name}
        </div>
      ))}
    </div>
  ),
}
