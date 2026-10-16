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
  /** Accessible name for the tab list. */
  ariaLabel?: string
}

/** Square segmented control (calm app mode): 1px borders, sentence case, selected = raised neutral surface. */
export const SegmentedTabs = <T extends string>({
  items,
  active,
  onChange,
  className,
  size = 'md',
  ariaLabel
}: SegmentedTabsProps<T>) => {
  const padClass = size === 'sm' ? 'h-8 px-3' : 'h-9 px-4'
  return (
    <div role='tablist' aria-label={ariaLabel} className={cn('inline-flex border border-default-300', className)}>
      {items.map((item, i) => {
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            type='button'
            role='tab'
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              'flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-150',
              padClass,
              i > 0 && 'border-l border-default-300',
              isActive ? 'bg-content3 text-foreground' : 'text-default-500 hover:text-foreground'
            )}>
            {item.icon && <Icon icon={item.icon} className='h-3.5 w-3.5' />}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
