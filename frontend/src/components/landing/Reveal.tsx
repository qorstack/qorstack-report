'use client'

import type { JSX, ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { useInView } from './hooks'

interface RevealProps {
  children: ReactNode
  className?: string
  id?: string
}

/** Fades + lifts its children in the first time they scroll into view. */
export const Reveal = ({ children, className, id }: RevealProps): JSX.Element => {
  const [ref, inView] = useInView<HTMLDivElement>()
  return (
    <div ref={ref} id={id} className={cn('lp-reveal', inView && 'is-in', className)}>
      {children}
    </div>
  )
}

export default Reveal
