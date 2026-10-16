'use client'

import React, { Suspense, useCallback, useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/icon'
import { Logo } from '@/components/brand/Logo'
import { checkServerHealth } from '@/api/health'

type Probe = 'idle' | 'checking' | 'down' | 'up'

const AUTO_RETRY_SECONDS = 15

const ServiceUnavailable = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [probe, setProbe] = useState<Probe>('idle')
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState(AUTO_RETRY_SECONDS)

  // Only same-site paths are followed back after the API is reachable again.
  const target = (() => {
    const raw = searchParams.get('redirectUrl') || '/'
    try {
      const decoded = decodeURIComponent(raw)
      if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded
      const url = new URL(decoded)
      return url.origin === window.location.origin ? `${url.pathname}${url.search}` : '/'
    } catch {
      return '/'
    }
  })()

  const safeTarget = target.startsWith('/close-server') ? '/' : target

  const tryAgain = useCallback(async () => {
    setProbe('checking')
    try {
      await checkServerHealth()
      setProbe('up')
      router.replace(safeTarget)
    } catch {
      setProbe('down')
    } finally {
      setLastChecked(new Date())
      setCountdown(AUTO_RETRY_SECONDS)
    }
  }, [router, safeTarget])

  // Check once on arrival, then every 15 s while the page is open.
  useEffect(() => {
    void tryAgain()
  }, [tryAgain])

  useEffect(() => {
    if (probe !== 'down') return
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          void tryAgain()
          return AUTO_RETRY_SECONDS
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [probe, tryAgain])

  const status =
    probe === 'checking'
      ? { icon: 'lucide:loader-circle', text: 'Checking the API…', spin: true, tone: 'text-default-500' }
      : probe === 'up'
        ? { icon: 'lucide:check-circle-2', text: 'The API is back. Returning you…', spin: false, tone: 'text-success' }
        : { icon: 'lucide:circle-alert', text: 'The API is not responding.', spin: false, tone: 'text-danger' }

  return (
    <div className='flex min-h-screen flex-col bg-background text-foreground'>
      <header className='flex items-center border-b border-divider px-4 py-4 sm:px-6'>
        <Logo size={26} />
      </header>

      <main className='flex flex-1 items-center justify-center px-4 py-16 sm:px-6'>
        <div className='flex w-full max-w-md flex-col gap-6 border border-divider bg-content1 p-8'>
          <div className='flex flex-col gap-3'>
            <h1 className='text-[24px] font-semibold text-foreground'>Can’t reach the server</h1>
            <p className='text-[15px] leading-relaxed text-default-500'>
              The web app could not connect to the Qorstack API. It may be restarting, under maintenance, or your network
              may be offline. Nothing you saved is lost.
            </p>
          </div>

          <div role='status' aria-live='polite' className='flex flex-col gap-1 border border-divider bg-content2 px-4 py-3'>
            <span className={`flex items-center gap-2 text-[14px] font-medium ${status.tone}`}>
              <Icon icon={status.icon} className={`h-4 w-4 ${status.spin ? 'animate-spin' : ''}`} aria-hidden />
              {status.text}
            </span>
            {probe === 'down' && (
              <span className='text-[13px] text-default-500'>
                {lastChecked ? `Last checked ${lastChecked.toLocaleTimeString()}. ` : ''}Retrying in {countdown} s.
              </span>
            )}
          </div>

          <Button
            color='primary'
            className='h-11 font-semibold'
            isLoading={probe === 'checking'}
            onPress={() => void tryAgain()}
            startContent={probe !== 'checking' && <Icon icon='lucide:refresh-cw' className='h-4 w-4' />}>
            Try again
          </Button>

          <p className='text-[13px] text-default-500'>
            Running it yourself? Check that the backend container is up: <code className='font-mono'>docker compose ps</code>
          </p>
        </div>
      </main>
    </div>
  )
}

export default function CloseServerPage() {
  return (
    <Suspense>
      <ServiceUnavailable />
    </Suspense>
  )
}
