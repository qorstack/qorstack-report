'use client'

import { Card, CardBody } from '@heroui/react'
import Icon from '@/components/icon'
import { useFeatures } from '@/hooks/use-features'

type ProRequiredCardProps = {
  featureLabel: string
  description?: string
}

export const ProRequiredCard = ({ featureLabel, description }: ProRequiredCardProps) => {
  const { features } = useFeatures()
  const isSelfhost = features?.isSelfhost ?? true

  return (
    <Card className='border border-default-200 bg-default-50'>
      <CardBody className='flex flex-col items-center gap-4 py-8 text-center'>
        <div className='flex h-12 w-12 items-center justify-center rounded-full bg-warning-100 text-warning-600'>
          <Icon icon='solar:lock-bold' width={24} />
        </div>

        <div className='space-y-1'>
          <p className='text-sm font-semibold text-foreground'>
            {featureLabel} requires a Pro license
          </p>
          {description && (
            <p className='text-xs text-default-500'>{description}</p>
          )}
        </div>

        {isSelfhost ? (
          <a
            href='/self-host#pro'
            className='inline-flex items-center gap-1.5 rounded-lg bg-warning-100 px-4 py-2 text-sm font-semibold text-warning-700 transition-colors hover:bg-warning-200'>
            <Icon icon='lucide:key' width={14} />
            Get Pro License
          </a>
        ) : (
          <a
            href='https://qorstack.com/pricing'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1.5 rounded-lg bg-warning-100 px-4 py-2 text-sm font-semibold text-warning-700 transition-colors hover:bg-warning-200'>
            <Icon icon='solar:arrow-right-linear' width={14} />
            Upgrade to Pro
          </a>
        )}
      </CardBody>
    </Card>
  )
}
