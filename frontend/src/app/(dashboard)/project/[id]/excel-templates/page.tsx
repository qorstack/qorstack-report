'use client'

import React from 'react'
import { Card, CardBody, Button } from '@heroui/react'
import Icon from '@/components/icon'

export default function ExcelTemplates() {
  return (
    <div className='min-h-screen space-y-6 pb-10 pt-4'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='flex items-center gap-2 text-sm text-default-500'>
            <span>Projects</span>
            <Icon icon='lucide:chevron-right' className='h-3 w-3' />
            <span className='font-medium text-foreground'>My Awesome App</span>
          </div>
          <h1 className='mt-1 text-2xl font-bold text-foreground'>Excel Templates</h1>
        </div>
      </div>

      <Card className='border border-dashed border-default-200 shadow-none'>
        <CardBody className='flex flex-col items-center justify-center py-20 text-center'>
          <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success'>
            <Icon icon='lucide:file-spreadsheet' className='h-8 w-8' />
          </div>
          <h3 className='text-lg font-bold text-foreground'>Coming Soon</h3>
          <p className='max-w-md text-sm text-default-500'>
            We are working hard to bring Excel generation capabilities to Qorstack Report. Stay tuned for updates!
          </p>
          <Button className='mt-6' variant='flat' color='primary'>
            Notify Me
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
