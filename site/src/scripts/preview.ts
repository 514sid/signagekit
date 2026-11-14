// Reports when it is done so headless browsers know when to screenshot:
// <html data-status="ready|error"> and window.signagekit.

import {
  mount,
  type MountOptions,
  type Shared,
  type Size,
} from '@514sid/signagekit'
import '@514sid/signagekit/style.css'
import { startEditor } from './editor'
import { loadSource, lunchExample, mode, options, param, sizes } from './source'
import {
  el,
  problemList,
  report,
  scaledFrame,
  sizeLabel,
  type Result,
} from './ui'

const root = document.getElementById('preview')!

async function screen(
  src: Shared,
  opts: Partial<MountOptions>,
): Promise<Result> {
  root.className = 'preview screen'
  let target: HTMLElement
  if (param('size')) {
    const f = scaledFrame(sizes()[0], 'screen-sized')
    const fit = () => f.fit(innerWidth, innerHeight)
    fit()
    addEventListener('resize', fit)
    root.append(f.outer)
    target = f.inner
  } else {
    target = el('div', 'screen-frame')
    root.append(target)
  }
  const s = await mount(target, { ...opts, layout: src.layout, data: src.data })
  return { status: 'ready', errors: s.errors, warnings: s.warnings }
}

type Frame = { label: string; size: Size; extra?: Partial<MountOptions> }

async function sheet(
  src: Shared,
  opts: Partial<MountOptions>,
  frames: Frame[],
): Promise<Result> {
  root.className = 'preview sheet'
  // Each screen's long side on the page, in px.
  const long = Math.min(1600, Math.max(160, Number(param('frame')) || 640))
  const head = el('div', 'sheet-head')
  const grid = el('div', 'sheet-grid')
  root.append(head, grid)
  const mounted = await Promise.all(
    frames.map(async (f) => {
      const fig = el('figure')
      const frame = scaledFrame(f.size, 'sheet-frame')
      frame.fit(long, long, true)
      fig.append(frame.outer, el('figcaption', '', f.label))
      grid.append(fig)
      return mount(frame.inner, {
        ...opts,
        ...f.extra,
        layout: src.layout,
        data: src.data,
      })
    }),
  )
  const { errors, warnings } = mounted[0]
  head.append(problemList(errors, warnings))
  return { status: 'ready', errors, warnings }
}

function failure(message: string, hint = true): Result {
  root.className = 'preview failed'
  const box = el('div', 'failure')
  box.append(el('h1', '', 'Nothing to preview'), el('p', '', message))
  if (hint) {
    const p = el('p')
    p.innerHTML =
      'Make a link with <code>npx @514sid/signagekit url layout.yml data.yml</code>, open the <a href="/preview/?mode=edit">editor</a>, or read the <a href="/docs/preview/">preview docs</a>.'
    box.append(p)
  }
  root.append(box)
  return { status: 'error', errors: [message], warnings: [] }
}

async function start(): Promise<Result> {
  const m = mode()
  const opts = options()
  let src: Shared | null
  try {
    src = await loadSource()
  } catch (e) {
    return failure(`The link couldn't be read: ${(e as Error).message}`, false)
  }
  if (m === 'edit')
    return startEditor(root, src ?? (await lunchExample()), opts, report)
  if (!src) return failure('This link names no screen.')

  let r: Result
  if (m === 'sizes')
    r = await sheet(
      src,
      opts,
      sizes().map((size) => ({ label: sizeLabel(size), size })),
    )
  else if (m === 'schemes') {
    const size = sizes(['fullhd'])[0]
    r = await sheet(src, opts, [
      {
        label: `Dark, ${sizeLabel(size)}`,
        size,
        extra: { colors: { scheme: 'dark' } },
      },
      {
        label: `Light, ${sizeLabel(size)}`,
        size,
        extra: { colors: { scheme: 'light' } },
      },
    ])
  } else r = await screen(src, opts)
  // A layout that can't be drawn at all is an error for whoever is waiting.
  if (!root.querySelector('.grid, .alert')) r.status = 'error'
  return r
}

report({ status: 'loading', errors: [], warnings: [] })
start()
  .then(report)
  .catch((e: Error) => report(failure(e.message, false)))
