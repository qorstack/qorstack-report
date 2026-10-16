'use client'

import React from 'react'
import { Button } from '@heroui/react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/icon'
import { Logo } from '@/components/brand/Logo'

export default function SessionExpiredPage() {
  const router = useRouter()

  const handleLogin = () => {
    router.push('/login')
  }

  return (
    <main className='flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10'>
      <div className='mb-10'>
        <Logo />
      </div>

      <div className='crop w-full max-w-md border border-divider bg-content1 p-8 text-center'>
        <span className='crop-cm' />
        <div className='mx-auto mb-6 flex h-12 w-12 items-center justify-center border border-warning text-warning'>
          <Icon icon='lucide:clock' aria-hidden='true' className='h-6 w-6' />
        </div>
        <p className='press-label mb-3'>Signed out</p>
        <h1 className='press-display text-[clamp(2rem,1.6rem+1.6vw,2.5rem)] text-foreground'>
          Session <span className='text-primary'>expired</span>
        </h1>
        <p className='mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-default-500'>
          You were signed out after a period of inactivity. Sign in again to continue. Changes that were not saved
          before this happened may need to be entered again.
        </p>

        <Button
          onPress={handleLogin}
          color='primary'
          size='lg'
          className='mt-8 w-full font-bold uppercase tracking-[0.04em]'>
          Sign in again
        </Button>

      </div>
    </main>
  )
}
