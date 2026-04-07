'use client'

import { Button, Card, CardBody } from '@heroui/react'
import Icon from '@/components/icon'

type ProRequiredCardProps = {
  featureLabel: string
  description?: string
}

/**
 * Shown in place of a Pro-only feature when no valid Pro license is active.
 * Does not navigate anywhere — just informs the user and links to upgrade info.
 */
export const ProRequiredCard = ({ featureLabel, description }: ProRequiredCardProps) => {
  return (
    <Card className='border border-default-200 bg-default-50'>
      <CardBody className='flex flex-col items-center gap-4 py-8 text-center'>
        <div className='flex h-12 w-12 items-center justify-center rounded-full bg-warning-100 text-warning-600'>
          <Icon icon='solar:lock-bold' width={24} />
        </div>

        <div className='space-y-1'>
          <p className='text-sm font-semibold text-foreground'>
            {featureLabel} requires Pro
          </p>
          {description && (
            <p className='text-xs text-default-500'>{description}</p>
          )}
        </div>

        <Button
          size='sm'
          variant='flat'
          color='warning'
          as='a'
          href='https://qorstack.com/pricing'
          target='_blank'
          rel='noopener noreferrer'
          endContent={<Icon icon='solar:arrow-right-linear' width={14} />}
        >
          Upgrade to Pro
        </Button>
      </CardBody>
    </Card>
  )
}
