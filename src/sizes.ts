// Screen resolutions by name, so a preview link or a screenshot can say
// `portrait` or `4k` instead of working out pixels. Any `WIDTHxHEIGHT` works
// too; the names only cover the common ones.

export interface Size {
  name: string
  width: number
  height: number
  label: string
}

const SIZE_LIST: Size[] = [
  { name: 'hd', width: 1280, height: 720, label: 'HD' },
  { name: 'fullhd', width: 1920, height: 1080, label: 'Full HD' },
  { name: 'qhd', width: 2560, height: 1440, label: 'QHD' },
  { name: '4k', width: 3840, height: 2160, label: '4K' },
  { name: 'hd-portrait', width: 720, height: 1280, label: 'HD portrait' },
  { name: 'portrait', width: 1080, height: 1920, label: 'Full HD portrait' },
  { name: '4k-portrait', width: 2160, height: 3840, label: '4K portrait' },
  { name: 'xga', width: 1024, height: 768, label: '4:3' },
  { name: 'xga-portrait', width: 768, height: 1024, label: '4:3 portrait' },
  { name: 'sxga', width: 1280, height: 1024, label: '5:4' },
  { name: 'ultrawide', width: 2560, height: 1080, label: 'Ultrawide 21:9' },
  { name: 'bar', width: 1920, height: 540, label: 'Bar 32:9' },
  { name: 'square', width: 1080, height: 1080, label: 'Square' },
]

/** Every named resolution, keyed by name. */
export const SIZES: Record<string, Size> = Object.fromEntries(
  SIZE_LIST.map((s) => [s.name, s]),
)

/** Other spellings people use for the same screens. */
const ALIASES: Record<string, string> = {
  '720p': 'hd',
  '1080p': 'fullhd',
  fhd: 'fullhd',
  '1440p': 'qhd',
  uhd: '4k',
  '2160p': '4k',
  'fullhd-portrait': 'portrait',
}

/** The sizes the preview compares when none are given. */
export const DEFAULT_SIZES = [
  'fullhd',
  'portrait',
  'xga',
  'ultrawide',
  'square',
]

/**
 * Reads `fullhd`, `1080p` or `1366x768` (also `1366×768`). Returns null for
 * anything else, or for sizes under 64 or over 16384 px.
 */
export function parseSize(text: string): Size | null {
  const t = text.trim().toLowerCase()
  const named = SIZES[ALIASES[t] ?? t]
  if (named) return named
  const m = t.match(/^(\d{2,5})\s*[x×*]\s*(\d{2,5})$/)
  if (!m) return null
  const width = Number(m[1])
  const height = Number(m[2])
  const ok = (n: number) => n >= 64 && n <= 16384
  if (!ok(width) || !ok(height)) return null
  return {
    name: `${width}x${height}`,
    width,
    height,
    label: `${width}×${height}`,
  }
}
