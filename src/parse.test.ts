import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { parseText } from './parse'
import lunch from './fixtures/lunch.layout.json'
import lunchData from './fixtures/lunch.data.json'

const read = (name: string) =>
  readFileSync(new URL(`../examples/${name}`, import.meta.url), 'utf8')

describe('parseText', () => {
  test('reads JSON', async () => {
    expect((await parseText('{"a": [1, true]}', 'layout')).value).toEqual({
      a: [1, true],
    })
  })

  test('reads the YAML lunch example as the same document as its JSON fixture', async () => {
    const doc = (await parseText(read('lunch/layout.yml'), 'layout')).value
    expect(doc).toEqual(lunch)
  })

  test('reads data scalars as text, so prices keep their zeros', async () => {
    const data = (await parseText(read('lunch/data.yml'), 'data')).value as {
      menu: string[][]
      wait: string
    }
    expect(data.menu[0]).toEqual(['Tomato soup', 'VG', '4.50'])
    expect(data.wait).toBe('6')
    expect(data.menu.map((r) => r[0])).toEqual(lunchData.menu.map((r) => r[0]))
  })

  test('reports JSON errors for JSON-looking text', async () => {
    expect((await parseText('{"a": ', 'layout')).error).toStartWith(
      'not valid JSON',
    )
  })

  test('reports YAML errors with the line', async () => {
    const r = await parseText('a: [1, 2\nb: 3', 'layout')
    expect(r.error).toStartWith('not valid YAML')
    expect(r.error).toContain('line')
  })

  test('limits alias expansion', async () => {
    const bomb = ['a: &a [x, x, x, x, x, x, x, x, x]']
    for (let i = 1; i < 9; i++) {
      const prev = String.fromCharCode(96 + i)
      const next = String.fromCharCode(97 + i)
      bomb.push(
        `${next}: &${next} [${Array(9)
          .fill('*' + prev)
          .join(', ')}]`,
      )
    }
    expect((await parseText(bomb.join('\n'), 'layout')).error).toBeDefined()
  })
})
