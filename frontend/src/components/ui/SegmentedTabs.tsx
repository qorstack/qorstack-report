'use client'

import Icon from '@/components/icon'
import { cn } from '@heroui/react'

export interface TabItem<T extends string = string> {
  id: T
  label: string
  icon?: string
}

interface SegmentedTabsProps<T extends string = string> {
  items: readonly TabItem<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
  size?: 'sm' | 'md'
}

export const SegmentedTabs = <T extends string>({
  items,
  active,
  onChange,
  className,
  size = 'md'
}: SegmentedTabsProps<T>) => {
  const padClass = size === 'sm' ? 'px-3 py-1.5 text-[11px]' : 'px-3.5 py-1.5 text-[12px]'
  return (
    <div className={cn('flex items-center gap-1 py-2', className)}>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            'flex items-center gap-1.5 rounded-md transition-colors duration-200',
            padClass,
            active === item.id
              ? 'bg-content3 font-semibold text-foreground ring-1 ring-default-200/70 dark:ring-white/10'
              : 'font-medium text-default-500 hover:bg-content2/70 hover:text-foreground'
          )}>
          {item.icon && <Icon icon={item.icon} className='h-3.5 w-3.5' />}
          {item.label}
        </button>
      ))}
    </div>
  )
}
