'use client'

import { useFeatures } from '@/hooks/use-features'
import Icon from '@/components/icon'

export const DemoBanner = () => {
  const { features } = useFeatures()

  if (!features?.isDemo) return null

  return (
    <div className='flex items-center gap-2 border-b border-warning-200 bg-warning-50 px-4 py-2 text-sm text-warning-800'>
      <Icon icon='lucide:flask-conical' className='h-4 w-4 shrink-0 text-warning-600' />
      <span>
        <strong>Demo mode</strong> — exports include a &quot;Qorstack Report Demo&quot; watermark.{' '}
        <a
          href='https://github.com/qorstack/qorstack-report'
          target='_blank'
          rel='noopener noreferrer'
          className='font-semibold underline underline-offset-2 hover:text-warning-900'>
          Deploy selfhost →
        </a>
      </span>
    </div>
  )
}
