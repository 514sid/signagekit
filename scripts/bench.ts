// Measures how fast screens mount, refit and update in a real Chromium, with
// the built package loaded through an import map as a player page loads it.
// Usage: bun scripts/bench.ts [--runs 5] [--cpu 4] [--latency 100] [--out bench.json] [filter]
//
// Two passes per fixture, each in a fresh page with the cache off:
//   fit   CPU slowed --cpu times, no network delay: layout work in mount,
//         after mount, on a rotation, and data-only update() time
//   load  --latency ms per request, CPU at full speed: time until mount()
//         resolves, and the chain of JS requests it waited for
// Fixtures are every examples/<name>/ plus a generated stress screen.
// Set CHROMIUM_PATH to use a browser other than the installed Chrome.

import { chromium, type CDPSession, type Page } from '@playwright/test'
import { execSync } from 'child_process'
import { existsSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { fixtures as allFixtures, type Fixture } from './bench-fixtures'
import { serve } from './bench-server'

const args = process.argv.slice(2)
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args.splice(i, 2)[1] : fallback
}
const RUNS = Number(flag('--runs', '5'))
const CPU = Number(flag('--cpu', '4'))
const LATENCY = Number(flag('--latency', '100'))
const OUT = resolve(flag('--out', 'bench.json'))
const FILTER = args[0]

const root = resolve(import.meta.dir, '..')
if (!existsSync(join(root, 'dist', 'index.js')))
  execSync('bun run build', { cwd: root, stdio: 'inherit' })

const fixtures = allFixtures(root).filter(
  (f) => !FILTER || f.name.includes(FILTER),
)
const { origin, close } = await serve(root)

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : { channel: 'chrome' },
)

type Metrics = Record<string, number>
const METRICS = [
  'LayoutCount',
  'RecalcStyleCount',
  'LayoutDuration',
  'RecalcStyleDuration',
  'ScriptDuration',
]

async function metrics(cdp: CDPSession, page: Page): Promise<Metrics> {
  const { metrics } = await cdp.send('Performance.getMetrics')
  const out: Metrics = {}
  for (const m of metrics) if (METRICS.includes(m.name)) out[m.name] = m.value
  const counts = await page.evaluate(() => {
    const w = window as unknown as Record<string, number>
    return { gcs: w.__gcs, fits: w.__fits, cycleFits: w.__cycleFits }
  })
  out.getComputedStyle = counts.gcs
  out.fitPasses = counts.fits
  out.cycleFits = counts.cycleFits
  return out
}

const diff = (a: Metrics, b: Metrics): Metrics =>
  Object.fromEntries(
    Object.keys(b).map((k) => [
      k,
      k.endsWith('Duration') ? (b[k] - a[k]) * 1000 : b[k] - a[k],
    ]),
  )

async function open(cpu: number, latency: number) {
  const tab = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  // Counts style reads, the cost the fit pass repeats most; whole fit passes
  // (fitAll starts by finding every [data-fit] element); and cycle fits
  // (fitMessages measures with a clone of the cycle).
  await tab.addInitScript(() => {
    const w = window as unknown as Record<string, number>
    w.__gcs = w.__fits = w.__cycleFits = 0
    const real = window.getComputedStyle.bind(window)
    window.getComputedStyle = (el: Element, p?: string | null) => {
      w.__gcs++
      return real(el, p)
    }
    const qsa = Element.prototype.querySelectorAll
    Element.prototype.querySelectorAll = function (this: Element, sel: string) {
      if (sel === '[data-fit]') w.__fits++
      return qsa.call(this, sel)
    } as typeof qsa
    const clone = Node.prototype.cloneNode
    Node.prototype.cloneNode = function (this: Node, deep?: boolean) {
      if ((this as Element).classList?.contains('c-cycle')) w.__cycleFits++
      return clone.call(this, deep)
    }
  })
  const cdp = await tab.context().newCDPSession(tab)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  if (latency)
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency,
      downloadThroughput: -1,
      uploadThroughput: -1,
    })
  await cdp.send('Performance.enable')
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  return { tab, cdp }
}

const idle = (tab: Page, ms: number) => tab.waitForTimeout(ms)

async function fitRun(f: Fixture) {
  const { tab, cdp } = await open(CPU, 0)
  await tab.goto(origin)
  await tab.waitForFunction(() => (window as { __loaded?: boolean }).__loaded)
  const m0 = await metrics(cdp, tab)
  const t = await tab.evaluate(
    (o) =>
      (
        window as unknown as {
          __mount: (o: unknown) => Promise<{ start: number; end: number }>
        }
      ).__mount(o),
    { layout: f.layout, data: f.data },
  )
  // Let the frames right after mount() resolves run (a ResizeObserver
  // reports on the next one), so CDP and in-page counters, read one after
  // the other, agree on which window the work belongs to.
  await tab.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  )
  const m1 = await metrics(cdp, tab)
  // Work that runs later: timers, late chunks, refits.
  await idle(tab, 1500)
  const m2 = await metrics(cdp, tab)
  await tab.setViewportSize({ width: 1080, height: 1920 })
  await idle(tab, 1500)
  const m3 = await metrics(cdp, tab)
  await tab.setViewportSize({ width: 1920, height: 1080 })
  await idle(tab, 1000)
  // Data-only updates, the call a polling feed makes.
  const updates = await tab.evaluate(async (data) => {
    const s = (
      window as unknown as {
        __screen: { update: (c: { data?: string }) => Promise<void> }
      }
    ).__screen
    const out: number[] = []
    for (let i = 0; i < 10; i++) {
      const t0 = performance.now()
      await s.update({ data })
      out.push(performance.now() - t0)
    }
    return out
  }, f.data ?? '{}')
  await tab.close()
  return {
    mountMs: t.end - t.start,
    mount: diff(m0, m1),
    afterMount: diff(m1, m2),
    rotate: diff(m2, m3),
    updateMs: median(updates),
  }
}

async function loadRun(f: Fixture) {
  const { tab, cdp } = await open(1, LATENCY)
  const requests: { url: string; start: number }[] = []
  let origin0 = 0
  cdp.on('Network.requestWillBeSent', (e) => {
    if (e.type === 'Document') origin0 = e.timestamp
    else if (e.type === 'Script')
      requests.push({ url: e.request.url, start: e.timestamp })
  })
  // Mount starts as soon as the entry module runs, as on a real player.
  await tab.addInitScript(
    (o) => {
      ;(window as unknown as { __auto: unknown }).__auto = o
    },
    { layout: f.layout, data: f.data },
  )
  await tab.goto(origin)
  const t = (await (
    await tab.waitForFunction(
      () => (window as unknown as { __result?: unknown }).__result,
      null,
      { timeout: 30000 },
    )
  ).jsonValue()) as { start: number; end: number }
  await idle(tab, 300)
  await tab.close()
  const scripts = requests.map((r) => ({
    url: r.url.replace(origin, ''),
    ms: Math.round((r.start - origin0) * 1000),
  }))
  return {
    readyMs: t.end, // since navigation start
    scripts: scripts.length,
    // Requests that start more than half a latency apart are a new wave.
    waves: scripts.reduce(
      (n, s, i) => (i && s.ms - scripts[i - 1].ms > LATENCY / 2 ? n + 1 : n),
      scripts.length ? 1 : 0,
    ),
    chain: scripts,
  }
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

/** Median of every numeric field across runs, nested objects included. */
function medianOf<T>(runs: T[]): T {
  const first = runs[0] as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(first)) {
    const v = first[k]
    if (typeof v === 'number')
      out[k] = median(runs.map((r) => (r as Record<string, number>)[k]))
    else if (Array.isArray(v)) out[k] = v
    else if (v && typeof v === 'object')
      out[k] = medianOf(runs.map((r) => (r as Record<string, unknown>)[k]))
  }
  return out as T
}

const results: Record<string, unknown> = {}
const r1 = (n: number) => Math.round(n * 10) / 10
console.log(
  `cpu ${CPU}x, latency ${LATENCY} ms, ${RUNS} runs, medians\n` +
    'fixture              mount ms  fits  cycle  layouts   gCS | after: fits  layouts   gCS | rotate: ms  fits  layouts | update ms | ready ms  scripts  waves',
)
for (const f of fixtures) {
  // One run at a time, so runs don't share the CPU.
  const fits = []
  for (let i = 0; i < RUNS; i++) fits.push(await fitRun(f))
  const fit = medianOf(fits)
  const loads = []
  for (let i = 0; i < RUNS; i++) loads.push(await loadRun(f))
  const load = medianOf(loads)
  results[f.name] = { fit, load }
  const rotateMs =
    fit.rotate.LayoutDuration +
    fit.rotate.RecalcStyleDuration +
    fit.rotate.ScriptDuration
  console.log(
    [
      f.name.padEnd(20),
      String(r1(fit.mountMs)).padStart(8),
      String(fit.mount.fitPasses).padStart(5),
      String(fit.mount.cycleFits).padStart(6),
      String(fit.mount.LayoutCount).padStart(8),
      String(fit.mount.getComputedStyle).padStart(5),
      '|',
      String(fit.afterMount.fitPasses).padStart(11),
      String(fit.afterMount.LayoutCount).padStart(8),
      String(fit.afterMount.getComputedStyle).padStart(5),
      '|',
      String(r1(rotateMs)).padStart(10),
      String(fit.rotate.fitPasses).padStart(5),
      String(fit.rotate.LayoutCount).padStart(8),
      '|',
      String(r1(fit.updateMs)).padStart(9),
      '|',
      String(r1(load.readyMs)).padStart(9),
      String(load.scripts).padStart(8),
      String(load.waves).padStart(6),
    ].join(' '),
  )
}
writeFileSync(
  OUT,
  JSON.stringify({ cpu: CPU, latency: LATENCY, runs: RUNS, results }, null, 2),
)
console.log(`\n${OUT}`)
await browser.close()
close()
