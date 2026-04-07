'use client'

import React from 'react'
import { Button, Card, CardBody } from '@heroui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/icon'
import { api } from '@/api/generated/main-service'

export default function CloseServerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirectUrl')

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleRefresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const { checkServerHealth } = await import('@/api/health')
      await checkServerHealth()

      try {
        await api.auth.refreshTokenCreate()
        if (typeof redirectUrl === 'string') {
          window.location.href = redirectUrl
        } else {
          window.location.reload()
        }
      } catch (refreshError) {
        console.warn('Server is up but session expired:', refreshError)
        router.push('/')
      }
    } catch (err) {
      console.error('Health check failed:', err)
      setError('System is still under maintenance. Please try again later.')
      setLoading(false)
    }
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-content2 p-4'>
      <Card className='w-full max-w-md rounded-xl border-primary bg-content1 shadow-[8px_8px_0px_0px_var(--heroui-primary)]'>
        <CardBody className='flex flex-col items-center gap-6 p-8 text-center'>
          <div className='flex h-20 w-20 items-center justify-center rounded-xl border-primary bg-primary-50 text-primary'>
            <Icon icon='lucide:server-crash' className='h-10 w-10' />
          </div>

          <div className='space-y-2'>
            <h1 className='text-3xl font-black uppercase tracking-tight text-foreground'>System Maintenance</h1>
            <p className='font-mono text-sm text-default-600'>
              Our servers are currently undergoing scheduled maintenance or are temporarily unavailable.
            </p>
          </div>

          <div className='w-full bg-content3 p-4 font-mono text-xs text-default-500'>
            STATUS: 503 SERVICE UNAVAILABLE
            <br />
            RETRY_AFTER: 300s
          </div>

          {error && <div className='w-full bg-danger-50 p-3 text-xs font-medium text-danger'>{error}</div>}

          <Button
            onPress={handleRefresh}
            isLoading={loading}
            className='w-full rounded-xl border-2 border-primary bg-primary font-bold uppercase text-primary-foreground shadow-[4px_4px_0px_0px_rgba(184,197,247,0.3)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none data-[hover=true]:translate-x-[1px] data-[hover=true]:translate-y-[1px] data-[hover=true]:shadow-none'
            size='lg'
            radius='md'>
            {loading ? 'Checking...' : 'Try Again'}
          </Button>

          <Button
            onPress={() => router.push('/')}
            className='icon-btn-hover w-full font-medium text-default-500 hover:text-foreground'
            variant='light'
            radius='none'
            startContent={<Icon icon='lucide:arrow-left' className='h-4 w-4' />}>
            Back to Login
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
