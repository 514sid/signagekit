import { describe, expect, test } from 'bun:test'
import { formatValue } from './stat'

describe('formatValue', () => {
  test('shortens numbers from 10,000 up', () => {
    expect(formatValue('1000000')).toBe('1M')
    expect(formatValue('12,900')).toBe('12.9K')
    expect(formatValue('-25000')).toBe('-25K')
    expect(formatValue('2500000000')).toBe('2.5B')
    expect(formatValue('1000000000000')).toBe('1T')
  })

  test('keeps smaller numbers, adding thousands separators', () => {
    expect(formatValue('3')).toBe('3')
    expect(formatValue('1284')).toBe('1,284')
    expect(formatValue('99.9')).toBe('99.9')
  })

  test('shows full numbers when asked and leaves text alone', () => {
    expect(formatValue('1000000', 'full')).toBe('1,000,000')
    expect(formatValue('Closed')).toBe('Closed')
    expect(formatValue('$4.2M')).toBe('$4.2M')
  })
})

describe('match_row', () => {
  test('is a boolean', async () => {
    const { validate } = await import('./validate')
    const r = validate({
      layout: { areas: ['a'] },
      zones: { a: { type: 'stat', value: 1, match_row: 'no' } },
    })
    expect(r.errors).toEqual(['zones.a.match_row: expected true or false'])
  })
})
