import type { StoryObj } from '@storybook/preact-vite'
import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import { applyColors, resolveColors, type Colors } from '../src/colors'
import { Problems, Screen } from '../src/components'
import { fitAll } from '../src/fit'
import { preloadViews } from '../src/views'
import { canvasSize, toGrid } from '../src/flow'
import type { Data, ScreenDoc } from '../src/types'
import { validate } from '../src/validate'

export interface ColorArgs {
  scheme: 'dark' | 'light'
  accent: string
}

export const colorArgTypes = {
  scheme: { control: 'inline-radio', options: ['dark', 'light'] },
  accent: { control: 'color' },
} as const

export const colorArgs: ColorArgs = { scheme: 'dark', accent: '#2563eb' }

export const ASPECTS = {
  '16:9': [16, 9],
  '4:3': [4, 3],
  '21:9': [21, 9],
  '9:16': [9, 16],
  '3:4': [3, 4],
} as const
export type Aspect = keyof typeof ASPECTS

export interface FrameProps {
  doc: Record<string, unknown>
  data?: Data
  aspect?: Aspect
  colors?: Partial<ColorArgs>
  /** Caps the rendered width, so portrait frames stay on screen. */
  maxWidth?: number
}

/** Re-renders once the document's chunks are in, so their views get fitted. */
function useChunks(doc: ScreenDoc | null, key: string): void {
  const [, setLoaded] = useState(0)
  useLayoutEffect(() => {
    void preloadViews(doc).then(() => setLoaded((n) => n + 1))
  }, [key])
}

/**
 * Renders a document exactly as mount() would: at its reference size, scaled
 * down to the story's width, with text fitted after every render.
 */
export function Frame({
  doc,
  data = {},
  aspect = '16:9',
  colors,
  maxWidth,
}: FrameProps) {
  const [aw, ah] = ASPECTS[aspect]
  const [width, height] = canvasSize(aw, ah)
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  const merged = {
    ...doc,
    colors: { ...(doc.colors as Colors | undefined), ...colors },
  }
  const result = validate(merged)
  useChunks(result.doc, JSON.stringify(merged))

  useLayoutEffect(() => {
    const el = outer.current
    if (!el) return
    const update = () => setScale(el.clientWidth / width)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [width])

  useLayoutEffect(() => {
    if (!inner.current) return
    applyColors(
      resolveColors(result.doc?.colors, 'dark', '#2563eb'),
      inner.current,
    )
    fitAll(inner.current)
  })

  return (
    <div
      ref={outer}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: maxWidth ?? (height > width ? 560 : undefined),
        aspectRatio: `${width} / ${height}`,
        overflow: 'hidden',
      }}
    >
      <div
        ref={inner}
        class="signagekit"
        style={{
          position: 'absolute',
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {result.doc && (
          <Screen
            zones={result.doc.zones}
            layout={toGrid(result.doc.layout, width)}
            alert={result.doc.alert}
            data={data}
          />
        )}
        <Problems errors={result.errors} warnings={result.warnings} />
      </div>
    </div>
  )
}

export const screen = (
  layout: Record<string, unknown>,
  zones: Record<string, unknown>,
  data: Record<string, unknown> = {},
): StoryObj<ColorArgs> => ({
  render: (colors) => (
    <Frame doc={{ layout, zones }} data={data} colors={colors} />
  ),
})
