import type { StorybookConfig } from '@storybook/preact-vite'

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.tsx'],
  framework: { name: '@storybook/preact-vite', options: {} },
  core: {
    disableTelemetry: true,
    // vite.config.ts builds the library; Storybook only
    // needs plain Vite with Preact JSX from tsconfig.json.
    builder: {
      name: '@storybook/builder-vite',
      options: { viteConfigPath: '.storybook/vite.config.ts' },
    },
  },
}

export default config
