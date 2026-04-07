import React, { useState } from 'react'
import Icon from '@/components/icon'

interface CopyButtonProps {
  text: string
  variant?: 'light' | 'dark'
}

export const CopyButton = ({ text, variant = 'light' }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const isDark = variant === 'dark'

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
        isDark
          ? 'text-default-400 hover:bg-default-700/50 hover:text-white'
          : 'text-default-400 hover:bg-content3 hover:text-foreground'
      }`}
      title='Copy to clipboard'>
      {copied ? (
        <>
          <Icon icon='solar:check-circle-bold' className='text-success' />
          <span className='text-success'>Copied!</span>
        </>
      ) : (
        <>
          <Icon icon='solar:copy-outline' />
          <span>Copy</span>
        </>
      )}
    </button>
  )
}
