// QR codes are sized by the layout pass and again when their code arrives,
// since the QR library loads after the first render.

/** QR codes: the largest square that fits beside their caption. */
export function sizeQr(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('.c-qr').forEach((qr) => {
    const code = qr.querySelector<SVGElement>('.c-qr-code')
    if (!code) return
    const label = qr.querySelector<HTMLElement>('.c-qr-label')
    const room = qr.clientHeight - (label ? label.offsetHeight + 16 : 0)
    const side = Math.max(0, Math.min(qr.clientWidth, room))
    code.style.width = code.style.height = `${side}px`
  })
}
