import eslint from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  globalIgnores([
    'dist/',
    'node_modules/',
    'storybook-static/',
    'preview/',
    'site/dist/',
    'site/.astro/',
  ]),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      complexity: ['error', { max: 20 }],
      'max-lines-per-function': [
        'error',
        { max: 70, skipBlankLines: true, skipComments: true },
      ],
      'max-lines': [
        'error',
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    files: ['bin/**', 'scripts/**', 'site/astro.config.mjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', URL: 'readonly' },
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'stories/**'],
    rules: { 'max-lines': 'off', 'max-lines-per-function': 'off' },
  },
)
