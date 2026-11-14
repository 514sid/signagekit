import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

const lib = (p) => fileURLToPath(new URL(`../src/${p}`, import.meta.url))

export default defineConfig({
  site: 'https://signagekit.pages.dev',
  trailingSlash: 'ignore',
  output: 'static',
  // Agents screenshot the dev server too; the toolbar would be in every shot.
  devToolbar: { enabled: false },
  build: { format: 'directory' },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: [
        {
          find: /^@514sid\/signagekit\/style\.css$/,
          replacement: lib('style.css'),
        },
        { find: /^@514sid\/signagekit$/, replacement: lib('index.ts') },
      ],
      dedupe: ['preact'],
    },
    server: { fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
    oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  },
})
