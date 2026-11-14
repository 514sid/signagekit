// Library build: ES modules only, so rarely used components, the chart
// library, the QR encoder and the YAML parser stay in their own chunks and a
// page downloads them only when a screen uses them.
import { defineConfig } from 'vite'

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  build: {
    target: 'es2020',
    sourcemap: true,
    // Many pages load this straight onto a player with no bundler in between.
    minify: true,
    cssCodeSplit: false,
    lib: {
      entry: { index: 'src/index.ts', cli: 'src/cli.ts' },
      formats: ['es'],
    },
    rollupOptions: {
      // Dependencies stay imports, so an app that also uses Preact or YAML
      // ships one copy.
      external: [/^preact(\/|$)/, 'uplot', 'uqr', 'yaml', /^node:/],
      output: {
        minify: true,
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (info) =>
          info.names?.some((n) => n.endsWith('.css'))
            ? 'style.css'
            : 'assets/[name]-[hash][extname]',
      },
    },
  },
})
