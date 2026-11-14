// An alert is literal in the layout, or a bind to an object in the data, so
// an assistant can raise one by writing data alone:
//   alert: { bind: /alert }
//   data:  { alert: { level: danger, icon: fire, title: Fire alarm, ... } }
// It shows while its title or message is set, and until its `until` time.

import { getPath, isBind, items, text } from './data'
import { Icon } from './icon'
import { isIcon, type IconName } from './icons'
import { useMinute } from './time'
import type { Alert, Data, Value } from './types'

export const LEVELS = ['info', 'good', 'warning', 'danger'] as const
export type Level = (typeof LEVELS)[number]

const LEVEL_ICONS: Record<Level, IconName> = {
  info: 'info',
  good: 'check',
  warning: 'warning',
  danger: 'danger',
}

export interface ActiveAlert {
  level: Level
  icon: IconName
  title: string
  message: string
  steps: string[]
  footer: string
  mode: 'takeover' | 'banner'
}

type Fields = Record<string, unknown>

/** Reads a field as text, whether the alert came from the layout or data. */
function field(f: Fields, key: string, data: Data): string {
  const v = f[key]
  return typeof v === 'string' || typeof v === 'number' || isBind(v)
    ? text(v as Value, data)
    : ''
}

/** The alert to show now, or null. Unknown levels and icons fall back. */
export function resolveAlert(
  a: Alert | undefined,
  data: Data,
  now: Date,
): ActiveAlert | null {
  if (!a) return null
  const raw = isBind(a) ? getPath(data, a.bind) : a
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const f = raw as Fields
  const title = field(f, 'title', data)
  const message = field(f, 'message', data) || field(f, 'text', data)
  // Older documents used `text` with a fixed title: the alert showed while
  // the text was set. They keep that meaning; newer ones show while either
  // the title or the message is set.
  const legacy = f.text !== undefined && f.message === undefined
  if (legacy ? !message : !title && !message) return null
  const until = Date.parse(field(f, 'until', data))
  if (!Number.isNaN(until) && until <= now.getTime()) return null

  const levelText = field(f, 'level', data) || field(f, 'state', data)
  const level = (LEVELS as readonly string[]).includes(levelText)
    ? (levelText as Level)
    : 'danger'
  const iconText = field(f, 'icon', data)
  const steps =
    Array.isArray(f.steps) || isBind(f.steps)
      ? items(f.steps as Value[], data)
          .map((s) => text(s as Value, data))
          .filter(Boolean)
      : []
  return {
    level,
    icon: isIcon(iconText) ? iconText : LEVEL_ICONS[level],
    title,
    message,
    steps,
    footer: field(f, 'footer', data),
    mode: field(f, 'mode', data) === 'banner' ? 'banner' : 'takeover',
  }
}

/** Re-checks every minute, so an alert past its `until` time goes away. */
export function useAlert(a: Alert | undefined, data: Data): ActiveAlert | null {
  const now = useMinute()
  return resolveAlert(a, data, now)
}

function Takeover({ a }: { a: ActiveAlert }) {
  return (
    <div class={`alert takeover lvl-${a.level}`} role="alert">
      <div class="alert-head">
        <Icon name={a.icon} cls="alert-icon" />
        {a.title && (
          <div class="alert-title-box">
            <h1 class="alert-title" data-fit="line" data-kind="alert-title">
              {a.title}
            </h1>
          </div>
        )}
      </div>
      <div class="alert-box">
        <div class="alert-content" data-fit="wrap" data-kind="alert">
          {a.message && <p class="alert-message">{a.message}</p>}
          {a.steps.length > 0 && (
            <ol class="alert-steps">
              {a.steps.map((s, i) => (
                <li key={i}>
                  <span class="alert-step-n">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
      {a.footer && <div class="alert-footer">{a.footer}</div>}
    </div>
  )
}

/** A strip across the top; the screen stays visible below it. */
function Banner({ a }: { a: ActiveAlert }) {
  return (
    <div class={`alert banner lvl-${a.level}`} role="alert">
      <Icon name={a.icon} cls="alert-icon" />
      <div class="alert-box">
        <div class="alert-content" data-fit="wrap" data-kind="alert-banner">
          {a.title && <strong class="alert-banner-title">{a.title}</strong>}
          {a.message && <span>{a.message}</span>}
        </div>
      </div>
      {a.footer && <div class="alert-footer">{a.footer}</div>}
    </div>
  )
}

export function AlertView({ a }: { a: ActiveAlert }) {
  return a.mode === 'banner' ? <Banner a={a} /> : <Takeover a={a} />
}
