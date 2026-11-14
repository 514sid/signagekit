// Components most screens don't use live in their own chunks and load only
// when a document asks for them. Common components stay in the main bundle.

import type { JSX } from 'preact'
import { loadIcons } from './icon'
import { track } from './ready'
import type { Component, Data, ScreenDoc } from './types'

export type AnyView = (p: { c: never; data: Data }) => JSX.Element | null
type Loader = () => Promise<AnyView>

const LOADERS = {
  chart: () => import('./chart').then((m) => m.Chart),
  meter: () => import('./measures').then((m) => m.MeterView),
  meters: () => import('./measures').then((m) => m.MetersView),
  bars: () => import('./measures').then((m) => m.BarsView),
  split: () => import('./measures').then((m) => m.SplitView),
  status: () => import('./lists').then((m) => m.StatusView),
  schedule: () => import('./lists').then((m) => m.ScheduleView),
  queue: () => import('./lists').then((m) => m.QueueView),
  clocks: () => import('./lists').then((m) => m.ClocksView),
  slideshow: () => import('./media').then((m) => m.SlideshowView),
  qr: () => import('./media').then((m) => m.QrView),
} satisfies Record<string, Loader>

export type LazyType = keyof typeof LOADERS

export const isLazy = (t: string): t is LazyType => t in LOADERS

const loaded = new Map<string, AnyView>()
const loading = new Map<string, Promise<AnyView>>()

/** The view if its chunk is already here, so it renders without waiting. */
export const loadedView = (t: LazyType) => loaded.get(t)

export function loadView(t: LazyType): Promise<AnyView> {
  let p = loading.get(t)
  if (!p) {
    p = (LOADERS[t] as Loader)().then((v) => {
      loaded.set(t, v)
      return v
    })
    loading.set(t, p)
  }
  return p
}

function collect(c: Component, into: Set<string>): void {
  into.add(c.type)
  if (c.icon) into.add('icon')
  if (c.type === 'stack') c.items.forEach((i) => collect(i, into))
}

/** Component types a document uses, stacks included. */
export function usedTypes(doc: ScreenDoc): Set<string> {
  const types = new Set<string>()
  Object.values(doc.zones).forEach((c) => collect(c, types))
  return types
}

/** Loads every chunk the document needs, so the first paint is complete. */
export function preloadViews(doc: ScreenDoc | null | undefined): Promise<void> {
  if (!doc) return Promise.resolve()
  const types = usedTypes(doc)
  // Icons appear in zone titles and alerts; an alert may come from data at
  // any time, so a document with one loads them up front.
  const icons = types.has('icon') || doc.alert ? [loadIcons()] : []
  const all = Promise.all([
    ...[...types].filter(isLazy).map(loadView),
    ...icons,
  ]).then(() => undefined)
  track(all)
  return all
}
