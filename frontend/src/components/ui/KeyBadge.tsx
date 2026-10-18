'use client'

import Icon from '@/components/icon'
import { cn } from '@heroui/react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

interface KeyBadgeProps {
  value: string
  label?: string
  className?: string
}

export const KeyBadge = ({ value, label = 'Key', className }: KeyBadgeProps) => {
  const { copied, copy } = useCopyToClipboard()
  const copyLabel = copied ? 'Copied' : `Copy ${label.toLowerCase()}`

  return (
    <div
      className={cn(
        'flex h-7 max-w-[220px] items-center gap-1.5 bg-content3 pl-2 text-[12px] sm:max-w-none',
        className
      )}>
      <span className='shrink-0 text-default-500'>{label}</span>
      <span className='truncate font-mono text-foreground'>{value}</span>
      <button
        type='button'
        onClick={e => {
          e.stopPropagation()
          void copy(value)
        }}
        title={copyLabel}
        aria-label={copyLabel}
        className='flex h-full w-7 shrink-0 items-center justify-center text-default-500 transition-colors hover:bg-content4 hover:text-foreground'>
        <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} className='h-3.5 w-3.5' />
      </button>
    </div>
  )
}
