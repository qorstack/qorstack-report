import React from 'react'
import Icon from '@/components/icon'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

interface CopyButtonProps {
  text: string
  /** Kept for API compatibility — rendered inside dark-scoped code blocks, both render the same. */
  variant?: 'light' | 'dark'
}

/**
 * Labelled "Copy" / "Copied" button — for code blocks and docs.
 * For an icon-only inline variant, see `components/common/CopyButton.tsx`.
 */
export const CopyButton = ({ text }: CopyButtonProps) => {
  const { copied, copy } = useCopyToClipboard({
    onError: err => console.error('Failed to copy text:', err)
  })

  return (
    <button
      type='button'
      onClick={() => void copy(text)}
      aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
      className='inline-flex h-7 items-center gap-1.5 border border-default-300 px-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-default-500 transition-colors hover:border-foreground hover:text-foreground'>
      {copied ? (
        <>
          <Icon icon='lucide:check' className='h-3.5 w-3.5 text-success' />
          <span className='text-success'>Copied</span>
        </>
      ) : (
        <>
          <Icon icon='lucide:copy' className='h-3.5 w-3.5' />
          <span>Copy</span>
        </>
      )}
    </button>
  )
}
