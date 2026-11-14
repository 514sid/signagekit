import { defineConfig } from 'vite'

export default defineConfig({
  // tsconfig.json only covers src/, so stories would otherwise compile against
  // React's JSX runtime. Point both of Vite's transformers at Preact.
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  // In dev, Vite pre-bundles dependencies one by one. If preact/hooks is
  // pre-bundled but preact is not, the page gets two copies of Preact and
  // every hook fails. Bundle all entry points together and dedupe.
  resolve: { dedupe: ['preact'] },
  optimizeDeps: {
    include: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  },
})
