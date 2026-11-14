import { mount } from '@514sid/signagekit'
import '@514sid/signagekit/style.css'

const frame = document.getElementById('demo')!
const source = JSON.parse(
  document.getElementById('demo-source')!.textContent!,
) as {
  layout: string
  data: string
}

void mount(frame, { ...source, scheme: 'dark' })

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-size]')) {
  b.addEventListener('click', () => {
    const [w, h] = b.dataset.size!.split('x').map(Number)
    frame.style.aspectRatio = `${w} / ${h}`
    frame.toggleAttribute('data-portrait', h > w)
    for (const o of document.querySelectorAll('[data-size]'))
      o.setAttribute('aria-pressed', String(o === b))
  })
}
