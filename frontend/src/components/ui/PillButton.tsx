'use client'

import { Button } from '@heroui/react'
import { cn } from '@heroui/react'
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
  primary: 'bg-primary text-primary-foreground hover:brightness-110',
  accent: 'bg-primary/15 text-primary-700 hover:bg-primary/25 ring-hairline',
  ghost: 'bg-content3 text-default-700 hover:bg-content4 ring-hairline',
  danger: 'bg-danger-50 text-danger hover:bg-danger-100 dark:bg-danger/15 dark:hover:bg-danger/25'
}

const sizeClass: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-[10.5px] font-black uppercase tracking-wider gap-1.5',
  sm: 'h-8 px-3.5 text-[11.5px] font-bold gap-1.5',
  md: 'h-9 px-4 text-[12px] font-bold gap-2'
}

const iconSize: Record<Size, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4'
}

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
    radius='md'
    className={cn(
      'min-w-0 shrink-0 rounded-lg transition-all',
      variantClass[variant],
      sizeClass[size],
      className
    )}>
    {!isLoading && icon && <Icon icon={icon} className={iconSize[size]} />}
    {children}
    {!isLoading && iconRight && <Icon icon={iconRight} className={iconSize[size]} />}
  </Button>
)
