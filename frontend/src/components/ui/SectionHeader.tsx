'use client'

import { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export const SectionHeader = ({ title, description, action, className }: SectionHeaderProps) => (
  <div className={`mb-3 flex flex-wrap items-center justify-between gap-2 ${className ?? ''}`}>
    <div className='min-w-0'>
      <h3 className='font-label text-[10.5px] font-black uppercase tracking-[0.2em] text-default-600'>
        {title}
      </h3>
      {description && <p className='mt-0.5 text-[11px] text-default-500'>{description}</p>}
    </div>
    {action && <div className='flex shrink-0 items-center gap-1.5'>{action}</div>}
  </div>
)
