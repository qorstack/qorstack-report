'use client'

import { ReactNode } from 'react'
import { cn } from '@heroui/react'

interface SectionHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export const SectionHeader = ({ title, description, action, className }: SectionHeaderProps) => (
  <div className={cn('mb-3 flex flex-wrap items-center justify-between gap-2', className)}>
    <div className='min-w-0'>
      <h3 className='text-[14px] font-semibold text-foreground'>{title}</h3>
      {description && <p className='mt-1 text-[13px] text-default-500'>{description}</p>}
    </div>
    {action && <div className='flex shrink-0 items-center gap-1.5'>{action}</div>}
  </div>
)
