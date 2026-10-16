'use client'

import { useMemo, type JSX } from 'react'
import qrcode from 'qrcode-generator'
import { BRAND_RED, PAPER, PAPER_INK } from './constants'
import { useIsClient } from './hooks'

interface QrCodeProps {
  text: string
  className?: string
  label?: string
}

interface QrGeometry {
  size: number
  path: string
  finders: { x: number; y: number }[]
}

const PAD = 1

const buildQr = (text: string): QrGeometry => {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  const inFinder = (r: number, c: number): boolean =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)
  const parts: string[] = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c) && !inFinder(r, c)) parts.push(`M${c + PAD} ${r + PAD}h1v1h-1z`)
    }
  }
  return {
    size: n + PAD * 2,
    path: parts.join(''),
    finders: [
      { x: PAD, y: PAD },
      { x: n - 7 + PAD, y: PAD },
      { x: PAD, y: n - 7 + PAD }
    ]
  }
}

/** Real, scannable QR code drawn as SVG; the three finder patterns are outlined in red. Client-only. */
export const QrCode = ({ text, className, label = 'QR code' }: QrCodeProps): JSX.Element => {
  const isClient = useIsClient()
  const geo = useMemo(() => (isClient ? buildQr(text) : null), [isClient, text])

  if (!geo) {
    return <svg className={className} viewBox='0 0 29 29' role='img' aria-label={label} />
  }

  return (
    <svg className={className} viewBox={`0 0 ${geo.size} ${geo.size}`} role='img' aria-label={label}>
      <rect width={geo.size} height={geo.size} fill={PAPER} />
      <path d={geo.path} fill={PAPER_INK} />
      {geo.finders.map(f => (
        <g key={`${f.x}-${f.y}`}>
          <rect x={f.x + 0.5} y={f.y + 0.5} width={6} height={6} fill='none' stroke={BRAND_RED} strokeWidth={1} />
          <rect x={f.x + 2} y={f.y + 2} width={3} height={3} fill={PAPER_INK} />
        </g>
      ))}
    </svg>
  )
}

export default QrCode
