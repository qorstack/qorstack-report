import type { JSX } from 'react'

interface Bar {
  width: number
  gap: number
}

/** Deterministic pseudo-random bars (decorative Code128 look). */
const BARS: Bar[] = (() => {
  let seed = 7
  return Array.from({ length: 42 }, () => {
    seed = (seed * 69069 + 1) & 0xffff
    return { width: 1 + (seed % 3), gap: seed % 2 }
  })
})()

export const Barcode = ({ className }: { className?: string }): JSX.Element => (
  <div className={`flex h-[30px] items-end gap-px ${className ?? ''}`} aria-hidden='true'>
    {BARS.map((bar, i) => (
      <i
        key={i}
        className='block h-full bg-[#141414]'
        style={{ width: `${bar.width}px`, marginRight: `${bar.gap}px` }}
      />
    ))}
  </div>
)

export default Barcode
