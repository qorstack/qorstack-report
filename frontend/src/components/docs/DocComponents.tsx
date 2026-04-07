import Icon from '@/components/icon'
import { Chip } from '@heroui/react'
import React from 'react'

export const ProChip = () => (
  <Chip
    size='sm'
    color='secondary'
    variant='flat'
    startContent={<Icon icon='solar:star-bold' className='h-3 w-3' />}
    className='h-5 min-h-0 px-2 text-[10px] font-bold uppercase'>
    PRO
  </Chip>
)

export const FreeChip = () => (
  <Chip size='sm' color='default' variant='flat' className='h-5 min-h-0 px-2 text-[10px] font-bold uppercase'>
    FREE
  </Chip>
)

export const VersionChip = () => (
  <span className='inline-flex items-center rounded bg-primary px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-primary-foreground'>
    Beta
  </span>
)

export const Highlight = ({ children }: { children: React.ReactNode }) => (
  <code className='rounded-md bg-primary/5 px-1.5 py-0.5 font-mono text-sm font-medium text-primary'>{children}</code>
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
}) => (
  <div
    onClick={onClick}
    className={`flex items-start gap-3 rounded-xl border border-default-200 bg-content1 p-5 transition-colors hover:border-primary/30 hover:shadow-sm ${onClick ? 'cursor-pointer' : ''}`}>
    <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary'>
      <Icon icon={icon} className='text-xl' />
    </div>
    <div>
      <h4 className='mb-1 text-sm font-bold text-foreground'>{title}</h4>
      <p className='text-xs leading-relaxed text-default-500'>{description}</p>
    </div>
  </div>
)

export const MockImage = ({ label, height = 200 }: { label: string; height?: number }) => (
  <div
    className='my-6 flex w-full flex-col items-center justify-center border-2 border-dashed border-default-300 bg-content2 text-default-400'
    style={{ height: `${height}px` }}>
    <Icon icon='solar:gallery-wide-outline' className='mb-2 h-12 w-12 opacity-50' />
    <span className='text-sm font-medium'>{label}</span>
    <span className='mt-1 text-xs text-default-400'>(Mock Image Placeholder)</span>
  </div>
)

export interface PropertyRow {
  name: string | React.ReactNode
  type: string
  required: boolean
  desc: string | React.ReactNode
  plan?: 'free' | 'pro'
}

export const PropertyTable = ({ data }: { data: PropertyRow[] }) => (
  <div className='mb-6 mt-4 overflow-hidden rounded-xl border border-default-200'>
    <table className='min-w-full divide-y divide-default-200'>
      <thead className='bg-content2'>
        <tr>
          <th className='px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-default-400'>
            Property
          </th>
          <th className='px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-default-400'>
            Type
          </th>
          <th className='px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-default-400'>
            Required
          </th>
          <th className='px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-default-400'>
            Plan
          </th>
          <th className='px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-default-400'>
            Description
          </th>
        </tr>
      </thead>
      <tbody className='divide-y divide-default-100 bg-content1'>
        {data.map(row => (
          <tr key={`${row.name}-${row.type}`} className='hover:bg-content2/50'>
            <td className='whitespace-nowrap px-4 py-3 font-mono text-[13px] font-medium text-primary'>{row.name}</td>
            <td className='whitespace-nowrap px-4 py-3 font-mono text-[13px] text-default-400'>{row.type}</td>
            <td className='whitespace-nowrap px-4 py-3 text-sm'>
              {row.required ? (
                <span className='inline-flex items-center rounded-md bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger'>
                  Yes
                </span>
              ) : (
                <span className='inline-flex items-center rounded-md bg-content3 px-2 py-0.5 text-[11px] font-semibold text-default-500'>
                  No
                </span>
              )}
            </td>
            <td className='whitespace-nowrap px-4 py-3 text-sm'>{row.plan === 'pro' ? <ProChip /> : <FreeChip />}</td>
            <td className='px-4 py-3 text-[13px] text-default-600'>{row.desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export const SubSection = ({ title, children }: { title: string | React.ReactNode; children: React.ReactNode }) => (
  <div className='mb-8'>
    <h3 className='mb-4 flex items-center gap-2 text-lg font-semibold text-foreground'>
      <span className='h-5 w-1 rounded-full bg-primary'></span>
      {title}
    </h3>
    {children}
  </div>
)
