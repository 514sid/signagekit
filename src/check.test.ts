import { describe, expect, test } from 'bun:test'
import { check } from './check'
import { getPath, merge, text } from './data'
import { formatCountdown } from './time'
import lunch from './fixtures/lunch.layout.json'

describe('data', () => {
  const data = { menu: [['Soup', '4.50']], n: 0, nested: { a: { b: 'x' } } }

  test('reads paths and treats missing ones as empty', () => {
    expect(getPath(data, '/menu/0/1')).toBe('4.50')
    expect(text({ bind: '/n' }, data)).toBe('0')
    expect(text({ bind: '/nope/deeper' }, data)).toBe('')
    expect(text({ bind: '/nested' }, data)).toBe('')
  })

  test('merges objects deeply and replaces arrays', () => {
    expect(
      merge({ a: { b: 1, c: 2 }, l: [1, 2] }, { a: { c: 3 }, l: [9] }),
    ).toEqual({ a: { b: 1, c: 3 }, l: [9] })
  })
})

describe('formatCountdown', () => {
  const now = new Date('2026-11-14T10:00:00Z')
  test('picks the two largest units', () => {
    expect(formatCountdown(new Date('2026-11-16T14:30:00Z'), now)).toBe(
      '2 d 4 h',
    )
    expect(formatCountdown(new Date('2026-11-14T12:05:00Z'), now)).toBe(
      '2 h 5 min',
    )
    expect(formatCountdown(new Date('2026-11-14T10:00:30Z'), now)).toBe('1 min')
    expect(formatCountdown(new Date('2026-11-14T09:00:00Z'), now)).toBe('')
  })
})

describe('check', () => {
  test('reports bad JSON in the layout and a non-object in the data', async () => {
    expect((await check('{')).errors[0]).toStartWith('layout: not valid JSON')
    expect((await check(lunch, '[1]')).errors).toEqual([
      'data: expected an object (a JSON object or a YAML mapping)',
    ])
  })

  test('reports an empty layout', async () => {
    expect((await check('  ')).errors).toEqual(['layout: empty'])
  })

  test('accepts parsed objects, JSON and YAML alike', async () => {
    const yaml =
      'layout: { areas: [a] }\nzones: { a: { type: heading, text: Hi } }'
    for (const src of [yaml, JSON.stringify(lunch), lunch]) {
      const r = await check(src, { menu: [] }, { checkBinds: false })
      expect(r.errors).toEqual([])
      expect(r.doc).not.toBeNull()
    }
  })

  test('warns about binds with no data and low contrast', async () => {
    const r = await check({
      colors: { background: '#ffffff', text: '#eeeeee' },
      layout: { areas: ['a'] },
      zones: { a: { type: 'heading', text: { bind: '/title' } } },
    })
    expect(r.warnings.join('\n')).toContain('/title')
    expect(r.warnings.join('\n')).toContain(
      'colors: text #eeeeee on background #ffffff',
    )
  })
})
