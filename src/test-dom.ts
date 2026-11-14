// Gives bun tests a DOM. Loaded before every test file by bunfig.toml.
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
})
const g = globalThis as Record<string, unknown>
for (const key of [
  'window',
  'document',
  'navigator',
  'Node',
  'HTMLElement',
  'SVGSVGElement',
  'getComputedStyle',
] as const)
  g[key] = key === 'window' ? dom.window : (dom.window as never)[key]
