// Serves the built package and its dependencies from node_modules through
// an import map, as a page without a bundler loads them. The page waits for
// a fixture: bench.ts calls window.__mount, or sets window.__auto before the
// page loads to mount as soon as the entry module runs.

import { createReadStream, existsSync } from 'fs'
import { createServer } from 'http'
import { extname, join } from 'path'

export async function serve(
  root: string,
): Promise<{ origin: string; close: () => void }> {
  const imports = {
    '@514sid/signagekit': '/dist/index.js',
    preact: '/node_modules/preact/dist/preact.module.js',
    'preact/hooks': '/node_modules/preact/hooks/dist/hooks.module.js',
    'preact/jsx-runtime':
      '/node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js',
    uplot: '/node_modules/uplot/dist/uPlot.esm.js',
    uqr: '/node_modules/uqr/dist/index.mjs',
    // One bundled file, as docs/api.md maps it from jsDelivr's +esm build.
    yaml: '/yaml.js',
  }
  const built = await Bun.build({
    entrypoints: [join(root, 'node_modules/yaml/browser/index.js')],
    format: 'esm',
    minify: true,
  })
  const yaml = await built.outputs[0].text()

  // The page waits for the fixture, so one page serves every run.
  const page = `<!doctype html>
  <meta charset="utf-8">
  <link rel="stylesheet" href="/dist/style.css">
  <style>html,body{margin:0;height:100%;overflow:hidden}#screen{position:fixed;inset:0}</style>
  <script type="importmap">${JSON.stringify({ imports })}</script>
  <div id="screen"></div>
  <script type="module">
    import { mount } from '@514sid/signagekit'
    window.__mount = async (options) => {
      const t0 = performance.now()
      window.__screen = await mount(document.getElementById('screen'), {
        ...options,
        now: new Date('2026-11-14T09:30:00Z'),
      })
      return { start: t0, end: performance.now() }
    }
    window.__loaded = true
    if (window.__auto) window.__result = await window.__mount(window.__auto)
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
    if (path === '/yaml.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' })
      return res.end(yaml)
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
  const origin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`
  return { origin, close: () => server.close() }
}
