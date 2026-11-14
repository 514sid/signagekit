import type { Meta, StoryObj } from '@storybook/preact-vite'
import {
  COLOR_KEYS,
  contrast,
  contrastWarnings,
  resolveColors,
  type ColorKey,
} from '../src/colors'
import { colorArgs, colorArgTypes, type ColorArgs } from './Frame'

const PAIRS: [ColorKey, ColorKey][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['muted', 'background'],
  ['muted', 'surface'],
  ['on_accent', 'accent'],
]

function Palette({ scheme, accent }: ColorArgs) {
  const p = resolveColors({ scheme, accent }, 'dark', accent)
  const warnings = contrastWarnings(p)
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 960 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {COLOR_KEYS.map((k) => (
          <div key={k}>
            <div style={{ height: 96, background: p[k] }} />
            <div style={{ padding: '8px 4px', fontSize: 13 }}>
              <strong>{k}</strong>
              <div>{p[k]}</div>
            </div>
          </div>
        ))}
      </div>
      <table
        style={{ marginTop: 24, borderCollapse: 'collapse', fontSize: 14 }}
      >
        <tbody>
          {PAIRS.map(([fg, bg]) => {
            const ratio = contrast(p[fg], p[bg])
            return (
              <tr key={fg + bg}>
                <td style={{ padding: 4 }}>
                  <span
                    style={{
                      background: p[bg],
                      color: p[fg],
                      padding: '4px 12px',
                    }}
                  >
                    Sample
                  </span>
                </td>
                <td style={{ padding: '4px 12px' }}>
                  {fg} on {bg}
                </td>
                <td style={{ padding: 4, fontVariantNumeric: 'tabular-nums' }}>
                  {ratio.toFixed(1)}:1 {ratio >= 4.5 ? 'passes' : 'fails'} 4.5:1
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {warnings.length > 0 && <p>{warnings.length} pair(s) below 4.5:1</p>}
    </div>
  )
}

const meta: Meta<ColorArgs> = {
  title: 'Design system/Colors',
  argTypes: colorArgTypes,
  args: colorArgs,
  render: (args) => <Palette {...args} />,
}
export default meta

export const Dark: StoryObj<ColorArgs> = {}
export const Light: StoryObj<ColorArgs> = {
  args: { scheme: 'light', accent: '#2563eb' },
}
