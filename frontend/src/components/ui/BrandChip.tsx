import Icon from '@/components/icon'
import { cn } from '@heroui/react'
import React from 'react'

export type BrandChipTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
export type BrandChipSize = 'xs' | 'sm' | 'md'

interface BrandChipProps {
  children: React.ReactNode
  tone?: BrandChipTone
  size?: BrandChipSize
  icon?: string
  uppercase?: boolean
  mono?: boolean
  className?: string
}

/** Square outline chip (Press, calm app mode: 'primary' is neutral-emphasis, never red). */
const toneClasses: Record<BrandChipTone, string> = {
  primary: 'border-default-300 text-foreground',
  success: 'border-success text-success',
  warning: 'border-warning text-warning',
  danger: 'border-danger text-danger',
  neutral: 'border-default-300 text-default-500'
}

const sizeClasses: Record<BrandChipSize, string> = {
  xs: 'h-5 px-1.5 text-[11px] gap-1',
  sm: 'h-6 px-2 text-[11px] gap-1',
  md: 'h-7 px-2.5 text-[12px] gap-1.5'
}

const iconSize: Record<BrandChipSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5'
}

export const BrandChip: React.FC<BrandChipProps> = ({
  children,
  tone = 'neutral',
  size = 'sm',
  icon,
  uppercase = false,
  mono = false,
  className
}) => (
  <span
    className={cn(
      'inline-flex items-center whitespace-nowrap border bg-transparent font-medium leading-none',
      toneClasses[tone],
      sizeClasses[size],
      uppercase && 'uppercase tracking-[0.12em]',
      mono && 'font-mono',
      className
    )}>
    {icon && <Icon icon={icon} className={cn('shrink-0', iconSize[size])} />}
    {children}
  </span>
)
