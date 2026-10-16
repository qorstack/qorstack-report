'use client'

import React from 'react'
import { cn } from '@heroui/react'

/**
 * Field name as detected in the template file. Fields come only from the file's markers,
 * so the editor never lets you rename them — long names wrap instead of truncating.
 */
export const ReadOnlyFieldName: React.FC<{ value: string; id?: string; error?: string; className?: string }> = ({
  value,
  id,
  error,
  className
}) => (
  <div id={id} tabIndex={-1} className={cn('flex min-w-0 flex-col justify-center gap-0.5 py-1.5 outline-none', className)}>
    <span className='break-words font-mono text-[13px] leading-snug text-foreground'>
      {/* Allow wrapping after "_" and "." so long names break between words, not mid-word. */}
      {value
        ? value.split(/(?<=[_.])/).map((part, i) => (
            <React.Fragment key={i}>
              {part}
              <wbr />
            </React.Fragment>
          ))
        : <span className='font-sans text-default-400'>Unnamed field</span>}
    </span>
    {error && <span className='text-[12px] text-danger'>{error}</span>}
  </div>
)
