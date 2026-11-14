// Draws each component preview when it scrolls near the viewport.

import { mount } from '@514sid/signagekit'
import '@514sid/signagekit/style.css'

const seen = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      seen.unobserve(e.target)
      const frame = e.target as HTMLElement
      void mount(frame, {
        layout: JSON.parse(frame.dataset.doc!),
        now: frame.dataset.now ? new Date(frame.dataset.now) : undefined,
      })
    }
  },
  { rootMargin: '400px' },
)
for (const f of document.querySelectorAll<HTMLElement>('.component-frame'))
  seen.observe(f)
