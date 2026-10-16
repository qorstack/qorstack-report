'use client'

import { Button, cn } from '@heroui/react'
import Icon from '@/components/icon'
import { ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'danger' | 'accent'
type Size = 'xs' | 'sm' | 'md'

interface PillButtonProps {
  children?: ReactNode
  onPress?: () => void
  variant?: Variant
  size?: Size
  icon?: string
  iconRight?: string
  className?: string
  isLoading?: boolean
  isDisabled?: boolean
  type?: 'button' | 'submit'
  title?: string
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-600',
  accent: 'border border-default-500 bg-transparent text-foreground hover:bg-content2',
  ghost: 'border border-default-300 bg-transparent text-foreground hover:border-foreground',
  danger: 'border border-danger/60 bg-transparent text-danger hover:bg-danger/10'
}

const sizeClass: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-[12px] gap-1.5',
  sm: 'h-8 px-3.5 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-[14px] gap-2'
}

const iconSize: Record<Size, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4'
}

/** Square Press button. The name is kept for compatibility. */
export const PillButton = ({
  children,
  onPress,
  variant = 'ghost',
  size = 'sm',
  icon,
  iconRight,
  className,
  isLoading,
  isDisabled,
  type = 'button',
  title
}: PillButtonProps) => (
  <Button
    type={type}
    onPress={onPress}
    isLoading={isLoading}
    isDisabled={isDisabled}
    title={title}
    aria-label={!children && title ? title : undefined}
    radius='none'
    className={cn(
      'min-w-0 shrink-0 font-medium transition-colors',
      variantClass[variant],
      sizeClass[size],
      className
    )}>
    {!isLoading && icon && <Icon icon={icon} className={iconSize[size]} />}
    {children}
    {!isLoading && iconRight && <Icon icon={iconRight} className={iconSize[size]} />}
  </Button>
)
