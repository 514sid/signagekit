// Icon names for alerts and zone titles. The shapes themselves are in
// icon-paths.ts, a separate chunk that loads only on screens that use icons.

export const ICON_NAMES = [
  'info',
  'check',
  'warning',
  'danger',
  'fire',
  'evacuate',
  'assembly',
  'medical',
  'first-aid',
  'storm',
  'wind',
  'snow',
  'flood',
  'heat',
  'lockdown',
  'shelter',
  'security',
  'power',
  'water',
  'network',
  'closed',
  'delay',
  'maintenance',
  'announcement',
  'phone',
  'biohazard',
  'radiation',
  'chemical',
  'event',
  'location',
  'accessibility',
] as const

export type IconName = (typeof ICON_NAMES)[number]

export const isIcon = (v: unknown): v is IconName =>
  typeof v === 'string' && (ICON_NAMES as readonly string[]).includes(v)
