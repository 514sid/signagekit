import { describe, expect, spyOn, test } from 'bun:test'
import { parseArgs, run } from './cli'

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

  test('reads --name=value flags', () => {
    expect(parseArgs(['--scheme=light', 'layout.yml'])).toEqual({
      files: ['layout.yml'],
      flags: { scheme: 'light' },
    })
  })
})

describe('run', () => {
  test('a missing file is a one-line error, not a crash', async () => {
    const err = spyOn(console, 'error').mockImplementation(() => {})
    expect(await run(['check', '/no/such/file.yml'])).toBe(2)
    expect(String(err.mock.calls[0][0])).toContain('ENOENT')
    err.mockRestore()
  })
})
