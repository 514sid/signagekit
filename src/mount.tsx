// Renders a screen document into an element and keeps it fitted. The canvas
// is 1080 px on its short side and follows the element's shape; one CSS
// transform scales it to the element, so text sizes are the same on every
// screen of a given shape.

import { render } from 'preact'
import {
  checkData,
  checkLayout,
  readData,
  DEFAULT_ACCENT,
  type CheckResult,
  type Source,
} from './check'
import { applyColors, resolveColors, type Colors, type Scheme } from './colors'
import { Problems, Screen } from './components'
import { fitAll } from './fit'
import { canvasSize, toGrid } from './flow'
import { settled } from './ready'
import { TimeContext, type TimeOptions } from './time'
import type { Data } from './types'
import { preloadViews } from './views'

export interface MountOptions {
  /** The screen document: JSON or YAML text, or a parsed object. */
  layout: Source
  /** Values that binds read: JSON or YAML text, or an object. */
  data?: Source
  /** Scheme used when the document doesn't set one. Default dark. */
  scheme?: Scheme
  /** Accent used when the document doesn't set one. Default #2563eb. */
  accent?: string
  /**
   * Colors that win over the document's own, like `{ scheme: 'light' }` to
   * see a screen in the other scheme.
   */
  colors?: Colors
  /** IANA time zone for clocks and schedules. Default the device's. */
  timeZone?: string
  /** BCP 47 locale for dates and times. Default the device's. */
  locale?: string
  /** Show errors and warnings over the screen. Default false. */
  showProblems?: boolean
  /** Freezes the clock at this time, for screenshots and tests. */
  now?: Date
}

export interface Update {
  layout?: Source
  data?: Source
}

export interface ScreenHandle {
  /** Errors from the last check, plus any reported with report(). */
  readonly errors: string[]
  readonly warnings: string[]
  /** Replaces the layout, the data or both, and renders again. */
  update(changes: Update): Promise<void>
  /** Adds an error, shown over the screen when showProblems is on. */
  report(message: string): void
  /** Stops watching the element's size and removes the screen. */
  destroy(): void
}

function makeCanvas(container: HTMLElement): HTMLElement {
  if (getComputedStyle(container).position === 'static')
    container.style.position = 'relative'
  container.style.overflow = 'hidden'
  const canvas = document.createElement('div')
  canvas.className = 'signagekit signagekit-canvas'
  container.appendChild(canvas)
  return canvas
}

/** Sizes the canvas to the container and returns its width. */
function scale(container: HTMLElement, canvas: HTMLElement): number {
  const cw = container.clientWidth || 1920
  const ch = container.clientHeight || 1080
  const [w, h] = canvasSize(cw, ch)
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  canvas.style.transform = `scale(${cw / w})`
  return w
}

/** Fetches the chunks a document uses, waiting at most 5 s. */
async function preload(r: CheckResult): Promise<void> {
  await Promise.race([
    preloadViews(r.doc).catch((e) =>
      console.error('signagekit: chunk failed', e),
    ),
    new Promise((done) => setTimeout(done, 5000)),
  ])
}

/** Applies the colors, renders the screen and fits its text. */
function draw(
  canvas: HTMLElement,
  r: CheckResult,
  width: number,
  options: MountOptions,
  time: TimeOptions,
  reported: string[],
): void {
  const palette = resolveColors(
    { ...r.doc?.colors, ...options.colors },
    options.scheme ?? 'dark',
    options.accent ?? DEFAULT_ACCENT,
  )
  applyColors(palette, canvas)
  render(
    <>
      {r.doc && (
        <TimeContext.Provider value={time}>
          <Screen
            zones={r.doc.zones}
            layout={toGrid(r.doc.layout, width)}
            alert={r.doc.alert}
            data={r.data}
          />
        </TimeContext.Provider>
      )}
      {options.showProblems && (
        <Problems errors={[...r.errors, ...reported]} warnings={r.warnings} />
      )}
    </>,
    canvas,
  )
  fitAll(canvas)
}

/**
 * Returns a function that parses data text, remembering the text it last
 * read cleanly: a screen often gets the same text pushed again, and parsing
 * it again gives the same values. Objects pass through.
 */
function dataReader(): (src?: Source) => Promise<Source | undefined> {
  let text: string | undefined
  let value: Data = {}
  return async (src) => {
    if (typeof src !== 'string') return src
    if (src === text) return value
    const d = await readData(src)
    // Text with a problem goes to the check as it is, which reports it.
    if (d.errors.length) return src
    text = src
    value = d.data
    return value
  }
}

/**
 * Renders a screen document into `container` and resolves once it is drawn,
 * charts included. The container sets the size; the screen fills it.
 */
export async function mount(
  container: HTMLElement,
  options: MountOptions,
): Promise<ScreenHandle> {
  // Each screen keeps its own time zone, locale and fixed time, so several
  // screens on one page don't overwrite each other's.
  const time: TimeOptions = {
    timeZone: options.timeZone,
    locale: options.locale,
    now: options.now,
  }
  const opts = {
    scheme: options.scheme,
    accent: options.accent,
    colors: options.colors,
  }
  const canvas = makeCanvas(container)
  let width = scale(container, canvas)
  // The container size the screen was last fitted to. A ResizeObserver
  // reports once as soon as it starts watching; at the same size that would
  // fit the whole screen a second time for nothing.
  const sizeOf = () => `${container.clientWidth}x${container.clientHeight}`
  let fittedTo = sizeOf()
  // The checked document, kept while only the data changes: parsing and
  // validating it again would give the same answer every time.
  let laid = await checkLayout(options.layout, opts)
  const parsed = dataReader()
  let r = await checkData(laid, await parsed(options.data), opts)
  const reported: string[] = []

  const paint = () => draw(canvas, r, width, options, time, reported)

  await preload(r)
  paint()
  await settled()

  const observer =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          const size = sizeOf()
          if (size === fittedTo) return
          fittedTo = size
          width = scale(container, canvas)
          paint()
        })
  observer?.observe(container)

  return {
    get errors() {
      return [...r.errors, ...reported]
    },
    get warnings() {
      return r.warnings
    },
    async update(changes) {
      if (changes.layout !== undefined)
        laid = await checkLayout(changes.layout, opts)
      r = await checkData(laid, (await parsed(changes.data)) ?? r.data, opts)
      if (changes.layout !== undefined) await preload(r)
      paint()
      await settled()
    },
    report(message) {
      reported.push(message)
      paint()
    },
    destroy() {
      observer?.disconnect()
      render(null, canvas)
      canvas.remove()
    },
  }
}
