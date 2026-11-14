import { describe, expect, test } from 'bun:test'
import { DEFAULT_SIZES, parseSize, SIZES } from './sizes'

describe('parseSize', () => {
  test('reads names, aliases and WIDTHxHEIGHT', () => {
    expect(parseSize('fullhd')).toMatchObject({ width: 1920, height: 1080 })
    expect(parseSize('1080p')).toBe(SIZES.fullhd)
    expect(parseSize(' Portrait ')).toMatchObject({ width: 1080, height: 1920 })
    expect(parseSize('1366x768')).toMatchObject({
      name: '1366x768',
      width: 1366,
      height: 768,
      label: '1366×768',
    })
    expect(parseSize('800×1280')).toMatchObject({ width: 800, height: 1280 })
  })

  test('rejects anything else', () => {
    for (const bad of ['16:9', 'huge', '10x10', '99999x1080', '', '1920x'])
      expect(parseSize(bad)).toBeNull()
  })

  test('every default size has a name', () => {
    for (const s of DEFAULT_SIZES) expect(SIZES[s]).toBeDefined()
  })
})
