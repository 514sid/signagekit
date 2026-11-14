// Renders a screen to PNG files with the built package, so a person or an
// AI can see the result without a display.
// Usage: bun run preview <layout file> [data file] [--out dir] [--size fullhd,portrait]
// Each size is a name from src/sizes.ts or WIDTHxHEIGHT, and the PNG is that
// many pixels.
// Needs a Chromium for Playwright (bun x playwright install chromium), or set
// CHROMIUM_PATH to an existing browser.

import { chromium } from '@playwright/test'
import { parseSize } from '../src/sizes'
import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, createReadStream } from 'fs'
import { createServer } from 'http'
import { basename, extname, join, resolve } from 'path'

const args = process.argv.slice(2)
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args.splice(i, 2)[1] : fallback
}
const out = resolve(flag('--out', 'preview'))
const sizes = flag('--size', 'fullhd,portrait')
  .split(',')
  .map((s) => {
    const size = parseSize(s)
    if (!size) throw new Error(`unknown size: ${s}`)
    return size
  })
const [layoutPath, dataPath] = args
if (!layoutPath) {
  console.error(
    'usage: bun run preview <layout file> [data file] [--out dir] [--size fullhd,portrait]',
  )
  process.exit(2)
}

const root = resolve(import.meta.dir, '..')
if (!existsSync(join(root, 'dist', 'index.js')))
  execSync('bun run build', { cwd: root, stdio: 'inherit' })

// The page loads the built package and its dependencies straight from
// node_modules through an import map, as a page without a bundler would.
const imports = {
  '@514sid/signagekit': '/dist/index.js',
  preact: '/node_modules/preact/dist/preact.module.js',
  'preact/hooks': '/node_modules/preact/hooks/dist/hooks.module.js',
  'preact/jsx-runtime':
    '/node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js',
  uplot: '/node_modules/uplot/dist/uPlot.esm.js',
  uqr: '/node_modules/uqr/dist/index.mjs',
  yaml: '/node_modules/yaml/browser/index.js',
}
const options = {
  layout: readFileSync(layoutPath, 'utf8'),
  data: dataPath ? readFileSync(dataPath, 'utf8') : undefined,
}
const page = `<!doctype html>
<meta charset="utf-8">
<link rel="stylesheet" href="/dist/style.css">
<style>html,body{margin:0;height:100%;overflow:hidden}#screen{position:fixed;inset:0}</style>
<script type="importmap">${JSON.stringify({ imports })}</script>
<div id="screen"></div>
<script type="module">
  import { mount } from '@514sid/signagekit'
  const s = await mount(document.getElementById('screen'), ${JSON.stringify(options)})
  for (const e of s.errors) console.error(e)
  for (const w of s.warnings) console.warn(w)
  window.__ready = true
</script>`

const types: Record<string, string> = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
}
const server = createServer((req, res) => {
  const path = (req.url ?? '/').split('?')[0]
  if (path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    return res.end(page)
  }
  const file = join(root, path)
  if (!file.startsWith(root) || !existsSync(file)) {
    res.writeHead(404)
    return res.end()
  }
  res.writeHead(200, {
    'Content-Type': types[extname(file)] ?? 'application/octet-stream',
  })
  createReadStream(file).pipe(res)
})
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
const address = server.address()
const port = typeof address === 'object' && address ? address.port : 0

mkdirSync(out, { recursive: true })
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
})
const name = basename(layoutPath).replace(
  /\.layout\.(ya?ml|json)$|\.(ya?ml|json)$/,
  '',
)
for (const size of sizes) {
  const tab = await browser.newPage({
    viewport: { width: size.width, height: size.height },
  })
  const messages: string[] = []
  tab.on('console', (m) => {
    const t = m.text()
    if (
      (m.type() === 'error' || m.type() === 'warning') &&
      !t.startsWith('Failed to load')
    )
      messages.push(`${m.type()}: ${t}`)
  })
  await tab.goto(`http://127.0.0.1:${port}/`)
  await tab.waitForFunction(
    () => (window as { __ready?: boolean }).__ready === true,
    null,
    {
      timeout: 15000,
    },
  )
  await tab.waitForTimeout(500)
  const file = join(out, `${name}.${size.name}.png`)
  await tab.screenshot({ path: file })
  console.log(file)
  for (const m of messages) console.log(`  ${m}`)
  await tab.close()
}
await browser.close()
server.close()
