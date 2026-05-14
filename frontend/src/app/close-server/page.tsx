'use client'

import React from 'react'
import { Button } from '@heroui/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Icon from '@/components/icon'
import SwitchTheme from '@/components/switch-theme'

export default function CloseServerPage() {
  const router = useRouter()

  return (
    <div className='relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground selection:bg-primary-100 selection:text-primary-900'>
      {/* Dot grid texture — light mode only */}
      <div className='pointer-events-none absolute inset-0 bg-dots opacity-20 dark:hidden' />

      {/* Soft primary glow — light mode only */}
      <div className='pointer-events-none absolute -left-48 -top-48 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px] dark:hidden' />

      {/* Vertical grid lines */}
      <div className='pointer-events-none absolute inset-y-0 right-[8%] hidden w-px bg-gradient-to-b from-transparent via-default-300/25 to-transparent dark:via-default-500/10 lg:block' />
      <div className='pointer-events-none absolute inset-y-0 left-[8%] hidden w-px bg-gradient-to-b from-transparent via-default-300/15 to-transparent dark:via-default-500/6 lg:block' />

      {/* Top bar */}
      <div className='relative z-10 flex items-center justify-between border-b border-default-200/70 px-6 py-3.5'>
        <div className='flex items-center gap-2.5'>
          <Image src='/images/logo/logo.png' alt='Qorstack Report' width={26} height={26} className='rounded-lg' />
          <span className='font-headline text-sm font-bold tracking-tight text-foreground'>Qorstack Report</span>
        </div>
        <div className='flex items-center gap-3'>
          <span className='flex items-center gap-2 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-danger'>
            <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-danger' />
            <span>Service Unavailable</span>
          </span>
          <SwitchTheme />
        </div>
      </div>

      {/* Main content */}
      <div className='relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16'>
        {/* Ghost 503 */}
        <div
          aria-hidden
          className='pointer-events-none absolute select-none font-headline font-black text-content3 dark:opacity-30'
          style={{ fontSize: 'clamp(8rem, 30vw, 22rem)', lineHeight: 1 }}>
          503
        </div>

        <div className='relative z-10 flex max-w-md flex-col items-center gap-8 text-center'>
          {/* Logo focal point */}
          <div className='flex flex-col items-center gap-3'>
            <div className='flex h-16 w-16 items-center justify-center rounded-2xl border border-default-200 bg-content1 shadow-sm'>
              <Image src='/images/logo/logo.png' alt='Qorstack Report' width={40} height={40} className='rounded-xl' />
            </div>
            <span className='font-label text-[10px] font-bold uppercase tracking-[0.1em] text-default-400'>
              Qorstack Report
            </span>
          </div>

          {/* Heading */}
          <div className='space-y-3'>
            <h1
              className='font-headline font-bold leading-[1.02] tracking-[-0.028em] text-foreground'
              style={{ fontSize: 'clamp(2.25rem, 1.6rem + 3vw, 3.5rem)' }}>
              System{' '}
              <span className='italic text-primary'>Maintenance</span>
            </h1>
            <p className='font-mono text-sm leading-relaxed text-default-500'>
              Our servers are currently undergoing scheduled maintenance
              <br className='hidden sm:block' />
              or are temporarily unavailable.
            </p>
          </div>

          {/* Terminal status */}
          <div className='w-full overflow-hidden rounded-lg border border-default-200 bg-content2 font-mono text-xs'>
            <div className='flex items-center gap-1.5 border-b border-default-200 bg-content3 px-4 py-2.5'>
              <span className='h-2.5 w-2.5 rounded-full bg-[#ff5f57]' />
              <span className='h-2.5 w-2.5 rounded-full bg-[#febc2e]' />
              <span className='h-2.5 w-2.5 rounded-full bg-[#28c840]' />
              <span className='ml-2 text-[10px] tracking-wide text-default-500'>system.log</span>
            </div>
            <div className='flex items-center gap-3 px-4 py-3'>
              <span className='w-28 shrink-0 text-default-500'>STATUS</span>
              <span className='text-default-400'>→</span>
              <span className='rounded bg-danger-100 px-2 py-0.5 font-semibold text-danger dark:bg-danger-100/20'>
                503 SERVICE UNAVAILABLE
              </span>
            </div>
          </div>

          {/* Action */}
          <Button
            onPress={() => router.push('/')}
            className='w-full font-medium'
            variant='flat'
            size='lg'
            radius='md'
            startContent={<Icon icon='lucide:arrow-left' className='h-4 w-4' />}>
            Back to Login
          </Button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className='relative z-10 flex items-center justify-center border-t border-default-200/70 px-6 py-3'>
        <span className='font-label text-[10px] text-default-400'>
          If this persists, please contact support.
        </span>
      </div>
    </div>
  )
}
