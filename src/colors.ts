// Colors come from the document's `colors` block. A scheme supplies defaults
// for anything left out; the accent defaults to the one mount() is given.

export const COLOR_KEYS = [
  'background',
  'surface',
  'text',
  'muted',
  'line',
  'accent',
  'on_accent',
  'good',
  'warning',
  'danger',
] as const
export type ColorKey = (typeof COLOR_KEYS)[number]
export type Scheme = 'dark' | 'light'
export type Palette = Record<ColorKey, string>
export type Colors = Partial<Palette> & { scheme?: Scheme }

export const SCHEMES: Record<Scheme, Omit<Palette, 'accent' | 'on_accent'>> = {
  dark: {
    background: '#0b0f17',
    surface: '#161c27',
    text: '#f1f5f9',
    muted: '#a3adbb',
    line: '#2a3443',
    good: '#22c55e',
    warning: '#fab219',
    danger: '#ef4444',
  },
  light: {
    background: '#eef0f3',
    surface: '#ffffff',
    text: '#111827',
    muted: '#4b5563',
    line: '#dde1e7',
    good: '#16a34a',
    warning: '#f59e0b',
    danger: '#dc2626',
  },
}

// Chart series, in fixed order. Each scheme has its own steps, validated
// against that scheme's background and surface (CVD separation, normal-vision
// floor, contrast). The light set has three hues under 3:1 on the light
// background, so multi-series charts always carry a legend with values.
export const SERIES: Record<Scheme, string[]> = {
  dark: [
    '#3987e5',
    '#d95926',
    '#199e70',
    '#c98500',
    '#d55181',
    '#008300',
    '#9085e9',
    '#e66767',
  ],
  light: [
    '#2a78d6',
    '#eb6834',
    '#1baf7a',
    '#eda100',
    '#e87ba4',
    '#008300',
    '#6250d6',
    '#e34948',
  ],
}

export const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

function rgb(hex: string): [number, number, number] {
  let h = hex.slice(1)
  if (h.length === 3) h = h.replace(/./g, (c) => c + c)
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function onAccent(accent: string): string {
  const dark = SCHEMES.light.text
  const light = SCHEMES.dark.text
  return contrast(accent, dark) >= contrast(accent, light) ? dark : light
}

export function resolveColors(
  colors: Colors | undefined,
  fallbackScheme: Scheme,
  fallbackAccent: string,
): Palette {
  const scheme = SCHEMES[colors?.scheme ?? fallbackScheme]
  const accent = colors?.accent ?? fallbackAccent
  return {
    ...scheme,
    accent,
    on_accent: onAccent(accent),
    ...stripScheme(colors),
  }
}

function stripScheme(colors: Colors | undefined): Partial<Palette> {
  if (!colors) return {}
  const out: Partial<Palette> = {}
  for (const k of COLOR_KEYS) if (colors[k]) out[k] = colors[k]
  return out
}

// Text pairs that must stay readable on a screen viewed from a distance.
const PAIRS: [ColorKey, ColorKey][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['muted', 'background'],
  ['muted', 'surface'],
  ['on_accent', 'accent'],
]

const STATES = ['good', 'warning', 'danger'] as const

/** White or near-black, whichever reads better on a state fill. */
export function inkOn(fill: string): string {
  return contrast(fill, '#ffffff') >= contrast(fill, '#0b0f17')
    ? '#ffffff'
    : '#0b0f17'
}

export function contrastWarnings(p: Palette): string[] {
  const check = (pairs: [ColorKey, ColorKey][], min: number) =>
    pairs.flatMap(([fg, bg]) => {
      const ratio = contrast(p[fg], p[bg])
      return ratio < min
        ? [
            `colors: ${fg} ${p[fg]} on ${bg} ${p[bg]} has contrast ${ratio.toFixed(1)}:1, needs at least ${min}:1`,
          ]
        : []
    })
  // State fills sit behind a glyph; the glyph needs 3:1 against its fill.
  // The strip and badge can stay vivid, since glyph and label carry meaning.
  const states = STATES.flatMap((k) => {
    const ratio = contrast(inkOn(p[k]), p[k])
    return ratio < 3
      ? [
          `colors: ${k} ${p[k]} leaves its icon at ${ratio.toFixed(1)}:1, needs at least 3:1`,
        ]
      : []
  })
  return [...check(PAIRS, 4.5), ...states]
}

/** Applies the palette as CSS variables, plus the chart series for its scheme. */
export function applyColors(
  p: Palette,
  target: HTMLElement = document.documentElement,
): void {
  for (const k of COLOR_KEYS)
    target.style.setProperty(`--${k.replace('_', '-')}`, p[k])
  const scheme: Scheme = luminance(p.background) > 0.4 ? 'light' : 'dark'
  for (const k of STATES) target.style.setProperty(`--on-${k}`, inkOn(p[k]))
  SERIES[scheme].forEach((c, i) => {
    target.style.setProperty(`--series-${i + 1}`, c)
    target.style.setProperty(`--on-series-${i + 1}`, inkOn(c))
  })
}
