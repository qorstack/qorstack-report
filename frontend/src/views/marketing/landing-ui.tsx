import type { JSX, ReactNode } from 'react'
import Link from 'next/link'
import { ArrowIcon } from '@/components/landing/icons'
import { Reveal } from '@/components/landing/Reveal'
import { cn } from '@/utils/cn'

/** Page container: 1280px, 28px gutters (16px on phones). */
export const Wrap = ({ children, className }: { children: ReactNode; className?: string }): JSX.Element => (
  <div className={cn('mx-auto w-full max-w-[1280px] px-4 sm:px-7', className)}>{children}</div>
)

type ButtonVariant = 'red' | 'line' | 'white'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT: Record<ButtonVariant, string> = {
  red: 'bg-primary text-white hover:bg-primary-600',
  line: 'border-default-300 bg-transparent text-foreground hover:border-foreground',
  white: 'bg-white text-primary hover:bg-[#141414] hover:text-white dark:hover:bg-background'
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-[13px]',
  md: 'h-[52px] px-6 text-[15px]',
  lg: 'h-[60px] px-8 text-[16px]'
}

interface ButtonLinkProps {
  href: string
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  arrow?: boolean
  external?: boolean
  className?: string
}

/** Square Press button rendered as a link; the arrow nudges right on hover. */
export const ButtonLink = ({
  href,
  children,
  variant = 'red',
  size = 'md',
  arrow = false,
  external = false,
  className
}: ButtonLinkProps): JSX.Element => {
  const classes = cn(
    'group/btn inline-flex items-center gap-3 whitespace-nowrap border border-transparent font-bold uppercase tracking-[0.04em] transition-colors [font-variation-settings:"wdth"_90]',
    VARIANT[variant],
    SIZE[size],
    className
  )
  const content = (
    <>
      {children}
      {arrow && <ArrowIcon size={size === 'lg' ? 18 : 16} className='transition-transform duration-200 group-hover/btn:translate-x-[3px]' />}
    </>
  )
  if (external) {
    return (
      <a href={href} target='_blank' rel='noopener noreferrer' className={classes}>
        {content}
      </a>
    )
  }
  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  )
}

interface SectionNumberProps {
  no: string
  label: string
  className?: string
}

/** "01 — LABEL" mono line with a 2px red top rule. */
export const SectionNumber = ({ no, label, className }: SectionNumberProps): JSX.Element => (
  <div
    className={cn(
      'self-start border-t-2 border-primary pt-3 font-mono text-[12px] uppercase tracking-[0.16em] text-default-500',
      className
    )}>
    <b className='font-bold text-primary'>{no}</b> — {label}
  </div>
)

interface SectionHeaderProps {
  no: string
  label: string
  title: ReactNode
  lede?: ReactNode
}

export const SectionHeader = ({ no, label, title, lede }: SectionHeaderProps): JSX.Element => (
  <Reveal className='mb-16 grid gap-6 min-[820px]:grid-cols-[200px_minmax(0,1fr)]'>
    <SectionNumber no={no} label={label} />
    <div>
      <h2 className='press-display text-[clamp(48px,7vw,104px)]'>{title}</h2>
      {lede && <p className='mt-[22px] max-w-[620px] text-[19px] text-default-500'>{lede}</p>}
    </div>
  </Reveal>
)

/** Red accent word inside a display title. */
export const Red = ({ children }: { children: ReactNode }): JSX.Element => <span className='text-primary'>{children}</span>

export const LABEL_CLASS = 'font-mono text-[11px] uppercase tracking-[0.14em] text-default-400'
