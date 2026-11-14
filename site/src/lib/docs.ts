// Most pages come from a file in ../docs, so GitHub and the site show the
// same text. A page with `source` is an Astro page of its own, like the
// Components page with its live previews.

export interface DocPage {
  /** File name in docs/, without .md: the content collection id. */
  id: string
  path: string
  title: string
  /** Repository path of a page not written in docs/. */
  source?: string
}

export const DOCS: DocPage[] = [
  { id: 'getting-started', path: '/docs/', title: 'Getting started' },
  { id: 'format', path: '/docs/format/', title: 'Document format' },
  {
    id: 'components',
    path: '/docs/components/',
    title: 'Components',
    source: 'site/src/lib/components.ts',
  },
  {
    id: 'assistants',
    path: '/docs/assistants/',
    title: 'Writing with assistants',
  },
  { id: 'preview', path: '/docs/preview/', title: 'Preview tool' },
  { id: 'api', path: '/docs/api/', title: 'API' },
]

export const REPO = 'https://github.com/514sid/signagekit'
export const NPM = 'https://www.npmjs.com/package/@514sid/signagekit'
