import { describe, expect, test } from 'bun:test'
import { contrast, contrastWarnings, resolveColors, SCHEMES } from './colors'

describe('colors', () => {
  test('computes WCAG contrast', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#fff', '#ffffff')).toBe(1)
  })

  test('fills missing colors from the scheme and the fallback accent', () => {
    const p = resolveColors(
      { scheme: 'light', surface: '#fafafa' },
      'dark',
      '#2563eb',
    )
    expect(p.background).toBe(SCHEMES.light.background)
    expect(p.surface).toBe('#fafafa')
    expect(p.accent).toBe('#2563eb')
    expect(p.on_accent).toBe(SCHEMES.dark.text)
  })

  test('picks dark text on a pale accent', () => {
    expect(resolveColors({ accent: '#fde047' }, 'dark', '#000').on_accent).toBe(
      SCHEMES.light.text,
    )
  })

  test('both built-in schemes pass the contrast checks', () => {
    for (const scheme of ['dark', 'light'] as const)
      expect(
        contrastWarnings(resolveColors({ scheme }, 'dark', '#2563eb')),
      ).toEqual([])
  })

  test('warns when a text pair is below 4.5:1', () => {
    const w = contrastWarnings(
      resolveColors({ muted: '#555555' }, 'dark', '#2563eb'),
    )
    expect(w).toHaveLength(2)
    expect(w[0]).toStartWith('colors: muted #555555 on background #0b0f17')
    expect(w[1]).toStartWith('colors: muted #555555 on surface #161c27')
  })
})
