import { useEffect, useState } from 'preact/hooks'
import type { IconName } from './icons'

// Icon shapes load as their own chunk. The app preloads it before the first
// paint when a document uses icons; anything later loads it on first use.
let paths: Record<string, string> | undefined
let loading: Promise<Record<string, string>> | undefined

export function loadIcons(): Promise<Record<string, string>> {
  loading ??= import('./icon-paths').then((m) => (paths = m.ICONS))
  return loading
}

/** A named icon from the set in icons.ts, drawn in the current text color. */
export function Icon({ name, cls = '' }: { name: IconName; cls?: string }) {
  const [, setLoaded] = useState(0)
  useEffect(() => {
    if (!paths) void loadIcons().then(() => setLoaded((n) => n + 1))
  }, [])
  return (
    <svg
      class={`icon ${cls}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      // Trusted, fixed markup from icon-paths.ts, never from a document.
      dangerouslySetInnerHTML={{ __html: paths?.[name] ?? '' }}
    />
  )
}
