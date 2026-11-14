// Draws each example's thumbnail when it scrolls into view, so the page
// doesn't render every screen at once.

import { mount } from '@514sid/signagekit'
import '@514sid/signagekit/style.css'

const text = (url: string) => fetch(url).then((r) => (r.ok ? r.text() : ''))

async function draw(thumb: HTMLElement): Promise<void> {
  const [layout, data] = await Promise.all([
    text(thumb.dataset.layout!),
    thumb.dataset.data ? text(thumb.dataset.data) : Promise.resolve(undefined),
  ])
  let target = thumb
  if (thumb.classList.contains('portrait')) {
    target = document.createElement('div')
    target.className = 'aspect-[9/16] h-full'
    thumb.append(target)
  }
  const now = thumb.dataset.now ? new Date(thumb.dataset.now) : undefined
  await mount(target, { layout, data, now })
}

const seen = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      seen.unobserve(e.target)
      void draw(e.target as HTMLElement)
    }
  },
  { rootMargin: '300px' },
)
for (const t of document.querySelectorAll<HTMLElement>('.thumb'))
  seen.observe(t)
