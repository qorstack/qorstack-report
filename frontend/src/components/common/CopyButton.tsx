import React, { useState } from 'react'
import { Tooltip } from '@heroui/react'
import Icon from '@/components/icon'

export const CopyButton = ({ text, className = '' }: { text: string; className?: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={className}>
      <Tooltip
        isOpen={copied}
        content='Copied!'
        placement='top'
        showArrow
        classNames={{
          base: 'before:bg-black after:bg-black',
          content: 'bg-black text-white font-bold text-[10px] px-2 py-1'
        }}>
        <button
          onClick={handleCopy}
          className='flex h-6 w-6 items-center justify-center rounded text-default-400 transition-colors hover:text-primary active:scale-95'>
          <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} className='h-3 w-3' />
        </button>
      </Tooltip>
    </div>
  )
}
