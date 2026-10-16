import Icon from '@/components/icon'
import React from 'react'
import { planForField } from './plans'

export const ProChip = () => (
  <span className='inline-flex h-5 items-center gap-1 bg-primary px-1.5 font-mono text-[11px] font-bold uppercase leading-none tracking-[0.12em] text-primary-foreground'>
    <Icon icon='lucide:star' className='h-3 w-3' />
    Pro
  </span>
)

export const FreeChip = () => (
  <span className='inline-flex h-5 items-center border border-default-300 px-1.5 font-mono text-[11px] font-bold uppercase leading-none tracking-[0.12em] text-default-500'>
    Free
  </span>
)

export const VersionChip = () => (
  <span className='inline-flex h-5 items-center border border-primary px-1.5 font-mono text-[11px] font-bold uppercase leading-none tracking-[0.12em] text-primary'>
    Beta
  </span>
)

export const Highlight = ({ children }: { children: React.ReactNode }) => (
  <code className='border border-divider bg-content2 px-1.5 py-0.5 font-mono text-[13px] font-medium text-primary-600 dark:text-[#FFB4AC]'>
    {children}
  </code>
)

export const FeatureCard = ({
  icon,
  title,
  description,
  onClick
}: {
  icon: string
  title: string
  description: string
  onClick?: () => void
}) => {
  const body = (
    <>
      <div className='flex h-10 w-10 shrink-0 items-center justify-center border border-divider bg-content2 text-primary'>
        <Icon icon={icon} className='text-xl' />
      </div>
      <div>
        <h4 className='mb-1 text-sm font-bold uppercase tracking-[0.02em] text-foreground'>{title}</h4>
        <p className='text-[13px] leading-relaxed text-default-500'>{description}</p>
      </div>
    </>
  )
  const base =
    'relative flex items-start gap-3 border border-divider bg-content1 p-5 text-left transition-colors before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-primary before:opacity-0 before:transition-opacity hover:border-default-300 hover:before:opacity-100'

  if (!onClick) return <div className={base}>{body}</div>
  return (
    <button type='button' onClick={onClick} className={`${base} w-full`}>
      {body}
    </button>
  )
}

export const MockImage = ({ label, height = 200 }: { label: string; height?: number }) => (
  <div
    className='my-6 flex w-full flex-col items-center justify-center border border-dashed border-default-300 bg-content1 text-default-500'
    style={{ height: `${height}px` }}>
    <Icon icon='solar:gallery-wide-outline' className='mb-2 h-12 w-12 opacity-50' />
    <span className='text-sm font-medium'>{label}</span>
    <span className='mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-default-500'>
      (Mock Image Placeholder)
    </span>
  </div>
)

export interface PropertyRow {
  name: string | React.ReactNode
  type: string
  required: boolean
  desc: string | React.ReactNode
  plan?: 'free' | 'pro'
}

const TH = 'px-4 py-2.5 text-left font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-default-500'

export const PropertyTable = ({ data }: { data: PropertyRow[] }) => (
  <div className='mb-6 mt-4 overflow-x-auto border border-divider'>
    <table className='min-w-full divide-y divide-divider'>
      <thead className='bg-content1'>
        <tr>
          <th scope='col' className={TH}>
            Property
          </th>
          <th scope='col' className={TH}>
            Type
          </th>
          <th scope='col' className={TH}>
            Required
          </th>
          <th scope='col' className={TH}>
            Plan
          </th>
          <th scope='col' className={TH}>
            Description
          </th>
        </tr>
      </thead>
      <tbody className='divide-y divide-divider bg-background'>
        {data.map(row => (
          <tr key={`${row.name}-${row.type}`} className='transition-colors hover:bg-content2'>
            <td className='whitespace-nowrap px-4 py-3 font-mono text-[13px] font-medium text-primary-600 dark:text-[#FFB4AC]'>{row.name}</td>
            <td className='whitespace-nowrap px-4 py-3 font-mono text-[13px] text-default-500'>{row.type}</td>
            <td className='whitespace-nowrap px-4 py-3 text-sm'>
              {row.required ? (
                <span className='inline-flex items-center border border-primary px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-primary'>
                  Yes
                </span>
              ) : (
                <span className='inline-flex items-center border border-default-300 px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-default-500'>
                  No
                </span>
              )}
            </td>
            <td className='whitespace-nowrap px-4 py-3 text-sm'>
              {(row.plan ?? (typeof row.name === 'string' ? planForField(row.name) : 'free')) === 'pro' ? <ProChip /> : <FreeChip />}
            </td>
            <td className='px-4 py-3 text-[13px] text-default-600'>{row.desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export const SubSection = ({
  title,
  id,
  children
}: {
  title: string | React.ReactNode
  /** Anchor for the right-hand TOC. */
  id?: string
  children: React.ReactNode
}) => (
  <div className='mb-8'>
    <h3 id={id} className='mb-4 flex scroll-mt-24 items-center gap-3 text-lg font-bold uppercase tracking-[0.01em] text-foreground [font-variation-settings:"wdth"_88]'>
      <span aria-hidden='true' className='h-2 w-2 shrink-0 bg-primary' />
      {title}
    </h3>
    {children}
  </div>
)
