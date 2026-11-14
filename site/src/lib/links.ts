// Links in the docs are written for GitHub: other docs as `format.md`, repo
// files as `../schema.json`. On the site they point at the pages instead.

import { DOCS } from './docs'

export function siteHref(href: string): string {
  const [path, hash] = href.split('#')
  const doc = DOCS.find((d) => path === `${d.id}.md`)
  if (doc) return doc.path + (hash ? `#${hash}` : '')
  if (path === '../schema.json') return '/schema.json'
  if (/^\.\.\/examples/.test(path)) return '/examples/'
  return href
}

/** Rewrites every inline Markdown link target, `[text](target)`. */
export const siteLinks = (md: string) =>
  md.replace(/\]\(([^)\s]+)\)/g, (_, href: string) => `](${siteHref(href)})`)
