import React from 'react'
import { Tooltip } from '@heroui/react'
import Icon from '@/components/icon'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

/**
 * Icon-only copy button with a "Copied" tooltip — for inline use next to keys/IDs.
 * For a labelled variant (used inside code blocks), see `components/docs/CopyButton.tsx`.
 */
export const CopyButton = ({ text, className = '', label = 'Copy' }: { text: string; className?: string; label?: string }) => {
  const { copied, copy } = useCopyToClipboard()

  return (
    <div className={className}>
      <Tooltip
        isOpen={copied}
        content='Copied'
        placement='top'
        classNames={{ content: 'bg-foreground text-background text-[12px] font-medium px-2 py-1' }}>
        <button
          type='button'
          aria-label={copied ? 'Copied' : label}
          onClick={e => {
            e.stopPropagation()
            void copy(text)
          }}
          className='flex h-8 w-8 items-center justify-center border border-transparent text-default-500 transition-colors hover:border-default-300 hover:text-foreground'>
          <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} className={copied ? 'h-3.5 w-3.5 text-success' : 'h-3.5 w-3.5'} />
        </button>
      </Tooltip>
    </div>
  )
}
