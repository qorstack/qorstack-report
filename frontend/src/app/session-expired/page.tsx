'use client'

import React from 'react'
import { Button, Card, CardBody } from '@heroui/react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/icon'

export default function SessionExpiredPage() {
  const router = useRouter()

  const handleLogin = () => {
    router.push('/')
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-content2 p-4'>
      <Card className='w-full max-w-md overflow-visible rounded-xl border-none shadow-xl'>
        <div className='absolute -top-10 left-1/2 flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full bg-content1 p-2 shadow-lg'>
          <div className='flex h-full w-full items-center justify-center rounded-full bg-warning-50 text-warning'>
            <Icon icon='lucide:clock' className='h-8 w-8' />
          </div>
        </div>
        <CardBody className='flex flex-col items-center gap-6 p-8 pt-12 text-center'>
          <div className='space-y-2'>
            <h1 className='text-2xl font-bold text-foreground'>Session Expired</h1>
            <p className='text-default-500'>
              Your security is important to us. For your protection, we have expired your session due to inactivity.
            </p>
          </div>

          <Button onPress={handleLogin} color='primary' className='w-full font-medium' size='lg'>
            Log In Again
          </Button>

          <p className='text-xs text-default-400'>You will be redirected to the login page.</p>
        </CardBody>
      </Card>
    </div>
  )
}
