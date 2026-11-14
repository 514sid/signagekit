import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineCollection } from 'astro:content'
import type { Loader } from 'astro/loaders'
import { ROOT } from './lib/examples'
import { siteLinks } from './lib/links'

// A custom loader so the links in docs/, written for GitHub, can be pointed
// at the site's pages before rendering.
const docsLoader: Loader = {
  name: 'signagekit-docs',
  async load({ store, renderMarkdown, watcher }) {
    const dir = join(ROOT, 'docs')
    watcher?.add(dir)
    store.clear()
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const body = siteLinks(readFileSync(`${dir}/${file}`, 'utf8'))
      store.set({
        id: file.replace(/\.md$/, ''),
        data: {},
        body,
        rendered: await renderMarkdown(body),
      })
    }
  },
}

export const collections = { docs: defineCollection({ loader: docsLoader }) }
