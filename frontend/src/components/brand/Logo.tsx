import type { JSX } from 'react'
import { cn } from '@/utils/cn'

interface LogoMarkProps {
  size?: number
  className?: string
  title?: string
}

/**
 * Qorstack mark: a square "Q" whose tail turns into three document lines,
 * with the red tab carried over from the original logo.
 */
export const LogoMark = ({ size = 28, className, title }: LogoMarkProps): JSX.Element => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 40 40'
    className={cn('shrink-0 text-foreground', className)}
    role={title ? 'img' : undefined}
    aria-label={title}
    aria-hidden={title ? undefined : true}>
    <path d='M4 4H30V22H24V10H10V28H17V34H4Z' fill='currentColor' />
    <rect x='20' y='20' width='16' height='4' fill='currentColor' />
    <rect x='20' y='27' width='16' height='4' fill='currentColor' />
    <rect x='20' y='34' width='16' height='4' fill='currentColor' />
    <rect x='31' y='13' width='5' height='4' fill='#F2271C' />
  </svg>
)

interface LogoProps {
  size?: number
  className?: string
  /** Second line under QORSTACK (default "REPORT") */
  caption?: string
}

/** Mark + stacked wordmark, used in navbars, sidebar and auth pages. */
export const Logo = ({ size = 30, className, caption = 'REPORT' }: LogoProps): JSX.Element => (
  <span className={cn('flex items-center gap-3', className)}>
    <LogoMark size={size} />
    <span className='flex flex-col leading-none'>
      <span className='text-[16px] font-extrabold tracking-[0.01em] text-foreground [font-variation-settings:"wdth"_88]'>QORSTACK</span>
      <span className='mt-1 font-mono text-[10px] tracking-[0.32em] text-default-500'>{caption}</span>
    </span>
  </span>
)

export default Logo
