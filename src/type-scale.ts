// The type scale and size limits the layout pass works within. Sizes are px
// on the reference canvas (1080 px on the short side).

export const RANGES: Record<string, [number, number]> = {
  heading: [28, 400],
  text: [22, 200],
  table: [22, 64],
  list: [22, 96],
  stat: [22, 240],
  clock: [22, 600],
  countdown: [22, 300],
  cycle: [22, 200],
  meter: [22, 160],
  meters: [22, 64],
  bars: [22, 64],
  split: [22, 64],
  status: [22, 72],
  schedule: [22, 64],
  queue: [22, 320],
  clocks: [22, 120],
  alert: [32, 120],
  'alert-title': [56, 240],
  'alert-banner': [28, 72],
}

/** The type scale every fitted size snaps down to. */
export const STEPS = [
  22, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96, 112, 128, 144, 160, 192,
  224, 256, 320, 400,
]

/** Components made of rows; they share one body size across the screen. */
export const BODY = [
  'table',
  'list',
  'status',
  'meters',
  'bars',
  'schedule',
  'clocks',
  'split',
]
/** Display text kept within this many times the body size. */
export const DISPLAY = ['heading', 'cycle', 'text']
export const DISPLAY_RATIO = 3.5
/** List-like components may grow this much past the shared body size. */
export const BODY_SPREAD = 1.4
