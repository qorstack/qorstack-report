'use client'

import type { JSX } from 'react'
import Icon from '@/components/icon'

type ProRequiredCardProps = {
  featureLabel: string
  description?: string
}

const isSelfhost = process.env.NEXT_PUBLIC_SITE_MODE !== 'cloud'

const CTA_CLASS =
  'inline-flex min-h-10 items-center gap-2 border border-default-300 px-4 text-[14px] font-medium text-foreground transition-colors hover:border-foreground'

export const ProRequiredCard = ({ featureLabel, description }: ProRequiredCardProps): JSX.Element => (
  <div className='flex flex-col items-center gap-4 border border-divider bg-content1 px-6 py-8 text-center'>
    <span className='flex h-11 w-11 items-center justify-center text-default-500'>
      <Icon icon='lucide:lock' width={20} />
    </span>

    <div className='space-y-1'>
      <p className='text-[13px] text-default-500'>Pro feature</p>
      <p className='text-[15px] font-semibold text-foreground'>{featureLabel} requires a Pro license</p>
      {description && <p className='text-[14px] text-default-500'>{description}</p>}
    </div>

    {isSelfhost ? (
      <a href='/self-host#pro' className={CTA_CLASS}>
        <Icon icon='lucide:key-round' width={16} />
        Get Pro license
      </a>
    ) : (
      <a href='https://qorstack.com/pricing' target='_blank' rel='noopener noreferrer' className={CTA_CLASS}>
        Upgrade to Pro
        <Icon icon='lucide:arrow-up-right' width={16} />
      </a>
    )}
  </div>
)
