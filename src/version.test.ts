import { describe, expect, test } from 'bun:test'
import { check } from './check'
import { validate } from './validate'
import { upgrade, type Migrations } from './version'

const heading = { type: 'heading', text: 'Hi' }

describe('upgrade', () => {
  // A pretend history: format 1 called the zones "cells", format 2 had a
  // `ticker` component that format 3 dropped.
  const loaded: number[] = []
  const migrations: Migrations = {
    1: async () => {
      loaded.push(1)
      return {
        default: ({ cells, ...rest }) => ({
          doc: { ...rest, zones: cells },
          notes: ['cells renamed to zones'],
        }),
      }
    },
    2: async () => {
      loaded.push(2)
      return {
        default: (doc) => ({ doc, notes: ['ticker zones dropped'] }),
      }
    },
  }

  test('runs every step from the document version, in order', async () => {
    loaded.length = 0
    const r = await upgrade(
      { layout: { areas: ['a'] }, cells: { a: heading } },
      migrations,
      3,
    )
    expect(loaded).toEqual([1, 2])
    expect(r.doc).toEqual({
      layout: { areas: ['a'] },
      zones: { a: heading },
      version: 3,
    })
    expect(r.notes).toEqual([
      'version 1 to 2: cells renamed to zones',
      'version 2 to 3: ticker zones dropped',
    ])
  })

  test('loads only the steps a document needs', async () => {
    loaded.length = 0
    await upgrade({ version: 2, zones: {} }, migrations, 3)
    expect(loaded).toEqual([2])
    loaded.length = 0
    await upgrade({ version: 3, zones: {} }, migrations, 3)
    await upgrade({ version: 7, zones: {} }, migrations, 3)
    expect(loaded).toEqual([])
  })

  test('stops with a note when a step is missing', async () => {
    const r = await upgrade({ zones: {} }, {}, 2)
    expect(r.notes).toEqual(['version: no upgrade from 1 to 2, shown as is'])
  })
})

describe('versions in validate and check', () => {
  test('a missing version means format 1', () => {
    const v = validate({ layout: { areas: ['a'] }, zones: { a: heading } })
    expect(v.errors).toEqual([])
    expect(v.doc!.version).toBe(1)
  })

  test('rejects a version that is not a whole number', () => {
    expect(
      validate({ version: '2', layout: { areas: ['a'] }, zones: {} }).errors,
    ).toContain('version: expected a whole number from 1')
  })

  test('shows a newer document as far as it can, with warnings', async () => {
    const r = await check({
      version: 2,
      layout: { areas: ['a b'] },
      zones: { a: heading, b: { type: 'hologram' } },
      lighting: 'ambient',
    })
    expect(r.errors).toEqual([])
    expect(Object.keys(r.doc!.zones)).toEqual(['a'])
    expect(r.warnings.join('\n')).toContain('written for format 2')
    expect(r.warnings.join('\n')).toContain('zones.b.type')
    expect(r.warnings.join('\n')).toContain(
      'lighting: unknown top-level property',
    )
  })
})
