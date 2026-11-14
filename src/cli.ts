// Usage:
//   signagekit check <layout> [data]  validates a screen; exits 1 on errors
//   signagekit url <layout> [data]    prints a preview link to open or screenshot

import { readFileSync } from 'node:fs'
import { check } from './check'
import { previewUrl, type PreviewOptions } from './share'

const USAGE = `usage:
  signagekit check <layout file> [data file] [--scheme dark|light] [--accent #hex]
      Checks a screen document (JSON or YAML) and its data. Exits with 1 on errors.

  signagekit url <layout file> [data file] [--mode screen|sizes|schemes|edit]
      [--size fullhd,portrait,1366x768] [--scheme dark|light] [--accent #hex] [--tz Europe/Berlin]
      [--locale de-DE] [--now 2026-11-14T09:30] [--problems]
      [--base https://your.site/preview/]
      Prints a link to the preview page with the screen packed into it.`

const BOOLEAN = new Set(['problems'])

interface Args {
  files: string[]
  flags: Record<string, string | true>
}

/** Splits `--name value` and `--name` flags from file paths. */
export function parseArgs(argv: string[]): Args {
  const files: string[] = []
  const flags: Args['flags'] = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) files.push(a)
    else if (BOOLEAN.has(a.slice(2))) flags[a.slice(2)] = true
    else flags[a.slice(2)] = argv[++i] ?? ''
  }
  return { files, flags }
}

const str = (v: string | true | undefined) =>
  typeof v === 'string' && v ? v : undefined

type Flags = Args['flags']

async function runCheck(layout: string, data: string | undefined, f: Flags) {
  const r = await check(layout, data, {
    scheme: f.scheme === 'light' ? 'light' : 'dark',
    accent: str(f.accent),
  })
  for (const e of r.errors) console.log(`error   ${e}`)
  for (const w of r.warnings) console.log(`warning ${w}`)
  console.log(
    r.errors.length + r.warnings.length === 0
      ? 'ok: no problems found'
      : `${r.errors.length} error(s), ${r.warnings.length} warning(s)`,
  )
  return r.errors.length ? 1 : 0
}

async function runUrl(layout: string, data: string | undefined, f: Flags) {
  const options: PreviewOptions = {
    mode: str(f.mode) as PreviewOptions['mode'],
    size: str(f.size),
    scheme: str(f.scheme) as PreviewOptions['scheme'],
    accent: str(f.accent),
    timeZone: str(f.tz),
    locale: str(f.locale),
    base: str(f.base),
    problems: f.problems === true,
    now: str(f.now),
  }
  console.log(await previewUrl(layout, data, options))
  return 0
}

export async function run(argv: string[]): Promise<number> {
  const [command, ...rest] = argv
  const { files, flags } = parseArgs(rest)
  const handler =
    command === 'check' ? runCheck : command === 'url' ? runUrl : null
  if (!handler || !files[0]) {
    console.error(USAGE)
    return 2
  }
  const read = (p: string) => readFileSync(p, 'utf8')
  return handler(read(files[0]), files[1] ? read(files[1]) : undefined, flags)
}
