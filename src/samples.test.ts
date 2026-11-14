import { describe, expect, test } from 'bun:test'
import { parse } from 'yaml'
import { check } from './check'
import { SPECS } from './specs'
import { SAMPLES } from '../site/src/lib/components'

describe('Components page samples', () => {
  test('cover every component type', () => {
    expect(SAMPLES.map((s) => s.type).sort()).toEqual(Object.keys(SPECS).sort())
  })

  test('are valid, with no warnings', async () => {
    for (const s of SAMPLES) {
      const zone = parse(s.yaml)
      const r = await check({
        version: 1,
        layout: { areas: ['a'] },
        zones: { a: zone },
      })
      expect({ type: s.type, problems: [...r.errors, ...r.warnings] }).toEqual({
        type: zone.type,
        problems: [],
      })
    }
  })
})
