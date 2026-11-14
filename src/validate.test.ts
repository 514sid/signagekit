import { describe, expect, test } from 'bun:test'
import { validate } from './validate'
import lunch from './fixtures/lunch.layout.json'

const base = (zones: Record<string, unknown>, areas = ['a b']) => ({
  layout: { areas },
  zones,
})

describe('validate', () => {
  test('accepts the lunch example with no errors or warnings', () => {
    const r = validate(lunch)
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([])
    expect(Object.keys(r.doc!.zones)).toHaveLength(5)
  })

  test('rejects a non-object document', () => {
    expect(validate([]).doc).toBeNull()
  })
})

describe('validate zones', () => {
  test('drops only the broken zone and names the path', () => {
    const r = validate(
      base({
        a: { type: 'heading', text: 'Hi' },
        b: { type: 'table', columns: ['x'] },
      }),
    )
    expect(Object.keys(r.doc!.zones)).toEqual(['a'])
    expect(r.errors).toEqual(['zones.b.rows: required for table'])
  })

  test('reports unknown component types with the allowed list', () => {
    const r = validate(base({ a: { type: 'pie' } }, ['a']))
    expect(r.errors[0]).toStartWith('zones.a.type: unknown component "pie"')
  })

  test('warns about unknown properties without dropping the zone', () => {
    const r = validate(
      base({ a: { type: 'heading', text: 'Hi', colour: 'red' } }, ['a']),
    )
    expect(r.doc!.zones.a).toBeDefined()
    expect(r.warnings).toEqual([
      'zones.a.colour: unknown property for heading, ignored',
    ])
  })

  test('checks components inside stacks', () => {
    const r = validate(
      base(
        {
          a: {
            type: 'stack',
            items: [{ type: 'stat', value: { bind: 'no-slash' } }],
          },
        },
        ['a'],
      ),
    )
    expect(r.errors).toEqual([
      'zones.a.items[0].value: expected a string, a number or {"bind": "/path"}',
    ])
  })

  test('limits stack depth', () => {
    let c: unknown = { type: 'text', text: 'x' }
    for (let i = 0; i < 6; i++) c = { type: 'stack', items: [c] }
    expect(validate(base({ a: c }, ['a'])).errors[0]).toContain(
      'nest at most 4 deep',
    )
  })
})

describe('validate layout', () => {
  test('requires every area row to have the same width', () => {
    const r = validate(base({}, ['a b', 'a']))
    expect(r.doc).toBeNull()
    expect(r.errors).toEqual([
      'layout.areas[1]: has 1 names, the first row has 2',
    ])
  })

  test('requires rectangular areas', () => {
    const r = validate(base({}, ['a b', 'b a']))
    expect(r.errors).toContain('layout.areas: area "a" is not a rectangle')
  })

  test('checks track sizes and their count', () => {
    const r = validate({
      layout: { areas: ['a b'], columns: '2fr 1fr 1fr' },
      zones: {},
    })
    expect(r.errors).toEqual(['layout.columns: has 3 sizes, the areas have 2'])
    const bad = validate({
      layout: { areas: ['a'], rows: 'calc(1px)' },
      zones: {},
    })
    expect(bad.errors[0]).toContain('is not a track size')
  })

  test('warns about zones outside the grid and empty areas', () => {
    const r = validate(base({ a: { type: 'clock' }, z: { type: 'clock' } }))
    expect(r.warnings).toEqual([
      'zones.z: not placed in the layout, not shown',
      'layout: "b" has no zone, left empty',
    ])
  })
})

describe('validate colors', () => {
  test('keeps valid colors and drops bad ones with a message', () => {
    const r = validate({
      ...base({}, ['a']),
      colors: { scheme: 'light', accent: '#f00', text: 'red', glow: '#fff' },
    })
    expect(r.doc!.colors).toEqual({ scheme: 'light', accent: '#f00' })
    expect(r.errors).toEqual([
      'colors.text: expected a hex color like "#1e293b"',
    ])
    expect(r.warnings[0]).toStartWith('colors.glow: unknown color')
  })

  test('warns about unknown top-level properties', () => {
    const r = validate({ ...base({}, ['a']), theme: 'dark' })
    expect(r.warnings).toContain('theme: unknown top-level property, ignored')
  })
})

describe('validate flow', () => {
  test('accepts names and items with span and height', () => {
    const r = validate({
      layout: {
        flow: ['a', { zone: 'b', span: 4, height: '120px' }],
        design: 'portrait',
      },
      zones: { a: { type: 'clock' }, b: { type: 'clock' } },
    })
    expect(r.errors).toEqual([])
    expect(Object.keys(r.doc!.zones)).toEqual(['a', 'b'])
  })

  test('names each bad item', () => {
    const r = validate({
      layout: {
        flow: ['a', 'a', { zone: 'b', span: 13, height: 'tall', width: 2 }],
      },
      zones: {},
    })
    expect(r.doc).toBeNull()
    expect(r.errors).toEqual([
      'layout.flow[1]: zone "a" is already in the flow',
      'layout.flow[2].span: expected a whole number of columns from 1 to 12',
      'layout.flow[2].height: expected a share like 2, or pixels like "150px"',
      'layout.flow[2].width: unknown property, expected zone, span or height',
    ])
  })

  test('rejects flow and areas together', () => {
    const r = validate({ layout: { flow: ['a'], areas: ['a'] }, zones: {} })
    expect(r.errors).toEqual(['layout: use "flow" or "areas", not both'])
  })
})

describe('validate top level', () => {
  test('accepts $schema for editors', () => {
    const r = validate({
      $schema: './catalog.schema.json',
      layout: { areas: ['a'] },
      zones: { a: { type: 'clock' } },
    })
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([])
  })
})
