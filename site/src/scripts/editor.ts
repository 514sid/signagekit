// Every change re-renders and rewrites the link, so the address bar always
// holds a link to what's on screen.

import {
  mount,
  pack,
  parseSize,
  SIZES,
  type MountOptions,
  type ScreenHandle,
  type Shared,
  type Size,
} from '@514sid/signagekit'
import { sizes } from './source'
import { el, problemList, scaledFrame, sizeLabel, type Result } from './ui'

function segmented(
  label: string,
  values: string[],
  current: string,
  names?: string[],
) {
  const group = el('div', 'segmented')
  group.setAttribute('role', 'group')
  group.setAttribute('aria-label', label)
  values.forEach((v, i) => {
    const b = el('button', '', names?.[i] ?? v) as HTMLButtonElement
    b.type = 'button'
    b.dataset.value = v
    b.setAttribute('aria-pressed', String(v === current))
    group.append(b)
  })
  return group
}

function press(group: HTMLElement, value: string): void {
  for (const b of group.querySelectorAll<HTMLButtonElement>('button'))
    b.setAttribute('aria-pressed', String(b.dataset.value === value))
}

function field(id: string, label: string, value: string) {
  const wrap = el('div', 'field')
  const l = el('label', '', label) as HTMLLabelElement
  l.htmlFor = id
  const t = el('textarea') as HTMLTextAreaElement
  t.id = id
  t.value = value
  t.spellcheck = false
  t.setAttribute('autocapitalize', 'off')
  wrap.append(l, t)
  return { wrap, t }
}

function sizeSelect(current: Size) {
  const wrap = el('label', 'bar-field', 'Resolution ')
  const select = el('select') as HTMLSelectElement
  const all = SIZES[current.name]
    ? Object.values(SIZES)
    : [current, ...Object.values(SIZES)]
  for (const s of all) {
    const o = el('option', '', sizeLabel(s)) as HTMLOptionElement
    o.value = s.name
    o.selected = s.name === current.name
    select.append(o)
  }
  wrap.append(select)
  return { wrap, select }
}

function link(
  packed: string,
  mode: string,
  scheme: string | undefined,
  size?: string,
): string {
  const q = new URLSearchParams(location.search)
  q.set('mode', mode)
  if (scheme) q.set('scheme', scheme)
  else q.delete('scheme')
  if (size) q.set('size', size)
  else q.delete('size')
  return `${location.pathname}?${q}#s=${packed}`
}

function onPick(group: HTMLElement, fn: (value: string) => void): void {
  group.addEventListener('click', (e) => {
    const v = (e.target as HTMLElement).closest('button')?.dataset.value
    if (!v) return
    press(group, v)
    fn(v)
  })
}

function copyOnClick(button: HTMLButtonElement): void {
  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(location.href)
    button.textContent = 'Copied'
    setTimeout(() => (button.textContent = 'Copy link'), 1500)
  })
}

/** The scheme a document sets for itself, read without a full parse. */
function docScheme(layout: string): string {
  return /scheme["']?\s*:\s*["']?light/.test(layout) ? 'light' : 'dark'
}

function build(root: HTMLElement, src: Shared, size: Size, scheme: string) {
  const bar = el('header', 'editor-bar')
  const brand = el('a', 'brand', 'signagekit') as HTMLAnchorElement
  brand.href = '/'
  const resolution = sizeSelect(size)
  const schemes = segmented('Scheme', ['dark', 'light'], scheme, [
    'Dark',
    'Light',
  ])
  const all = el('a', 'bar-link', 'All sizes') as HTMLAnchorElement
  const copy = el('button', 'bar-button', 'Copy link') as HTMLButtonElement
  copy.type = 'button'
  bar.append(brand, resolution.wrap, schemes, all, copy)

  const inputs = el('div', 'editor-inputs')
  const layout = field('layout', 'Layout', src.layout)
  const data = field('data', 'Data', src.data ?? '')
  const problems = el('div', 'editor-problems')
  inputs.append(layout.wrap, data.wrap, problems)

  const stage = el('div', 'editor-stage')
  const body = el('div', 'editor-body')
  body.append(inputs, stage)
  root.className = 'preview editor'
  root.append(bar, body)
  return { resolution, schemes, all, copy, layout, data, problems, stage }
}

/** Builds the editor in `root` and resolves once the first render is done. */
export async function startEditor(
  root: HTMLElement,
  src: Shared,
  opts: Partial<MountOptions>,
  report: (r: Result) => void,
): Promise<Result> {
  let size = sizes(['fullhd'])[0]
  // Until a scheme is picked here or in the link, the document's own wins;
  // the switch then shows the document's scheme, or dark by default.
  let scheme = opts.colors?.scheme
  const { resolution, schemes, all, copy, layout, data, problems, stage } =
    build(root, src, size, scheme ?? docScheme(src.layout))

  let frame = scaledFrame(size, 'editor-frame')
  stage.append(frame.outer)
  const fit = () =>
    frame.fit(stage.clientWidth - 48, stage.clientHeight - 48, true)
  new ResizeObserver(fit).observe(stage)

  let screen: ScreenHandle
  const current = (): Shared => ({
    layout: layout.t.value,
    data: data.t.value || undefined,
  })
  const show = async () => {
    problems.replaceChildren(problemList(screen.errors, screen.warnings))
    const packed = await pack(current())
    history.replaceState(null, '', link(packed, 'edit', scheme, size.name))
    all.href = link(packed, 'sizes', scheme)
    report({
      status: 'ready',
      errors: screen.errors,
      warnings: screen.warnings,
    })
  }
  const remount = async () => {
    screen?.destroy()
    screen = await mount(frame.inner, {
      ...opts,
      colors: scheme ? { ...opts.colors, scheme } : opts.colors,
      ...current(),
    })
    await show()
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const changed = () => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      await screen.update(current())
      await show()
    }, 300)
  }
  layout.t.addEventListener('input', changed)
  data.t.addEventListener('input', changed)

  resolution.select.addEventListener('change', () => {
    size = parseSize(resolution.select.value) ?? size
    frame.outer.remove()
    frame = scaledFrame(size, 'editor-frame')
    stage.append(frame.outer)
    fit()
    void remount()
  })
  onPick(schemes, (v) => {
    scheme = v === 'light' ? 'light' : 'dark'
    void remount()
  })
  copyOnClick(copy)

  await remount()
  return { status: 'ready', errors: screen!.errors, warnings: screen!.warnings }
}
