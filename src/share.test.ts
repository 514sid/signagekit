import { describe, expect, test } from 'bun:test'
import { parseArgs } from './cli'
import { pack, previewUrl, unpack } from './share'

describe('preview links', () => {
  test('pack and unpack round-trip YAML text exactly', async () => {
    const shared = {
      layout: 'zones:\n  a: { type: heading, text: Café ☕ }\n',
      data: 'x: 4.50\n',
    }
    expect(await unpack(await pack(shared))).toEqual(shared)
    expect(await unpack(await pack({ layout: '{}' }))).toEqual({
      layout: '{}',
      data: undefined,
    })
  })

  test('previewUrl puts options in the query and the screen in the fragment', async () => {
    const url = new URL(
      await previewUrl(
        { zones: {} },
        { a: 1 },
        {
          mode: 'sizes',
          size: ['fullhd', '1366x768'],
          now: '2026-11-14T09:30',
          problems: true,
          base: 'https://example.test/preview/',
        },
      ),
    )
    expect(url.origin + url.pathname).toBe('https://example.test/preview/')
    expect(url.searchParams.get('mode')).toBe('sizes')
    expect(url.searchParams.get('size')).toBe('fullhd,1366x768')
    expect(url.searchParams.get('now')).toBe('2026-11-14T09:30')
    expect(url.searchParams.get('problems')).toBe('1')
    const s = new URLSearchParams(url.hash.slice(1)).get('s')!
    expect(await unpack(s)).toEqual({ layout: '{"zones":{}}', data: '{"a":1}' })
  })

  test('unpack rejects a damaged value', async () => {
    expect(unpack('not-a-link')).rejects.toThrow()
  })
})

describe('parseArgs', () => {
  test('separates files, valued flags and switches', () => {
    expect(
      parseArgs([
        'a.yml',
        '--mode',
        'sizes',
        '--problems',
        'b.yml',
        '--tz',
        'Europe/Berlin',
      ]),
    ).toEqual({
      files: ['a.yml', 'b.yml'],
      flags: { mode: 'sizes', problems: true, tz: 'Europe/Berlin' },
    })
  })
})
