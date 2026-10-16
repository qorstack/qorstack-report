import type { JSX, ReactNode } from 'react'
import { Fragment } from 'react'
import Link from 'next/link'
import { cn } from '@/utils/cn'

export interface PageHeaderCrumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  breadcrumb?: PageHeaderCrumb[]
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

/**
 * Dashboard page header (Press, app mode — calm):
 * sentence-case breadcrumb → uppercase condensed title (~28px) → one-line description → actions on the right.
 */
export const PageHeader = ({ breadcrumb, title, description, actions, className }: PageHeaderProps): JSX.Element => (
  <header className={cn('flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between', className)}>
    <div className='min-w-0'>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label='Breadcrumb' className='mb-2'>
          <ol className='flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-default-500'>
            {breadcrumb.map((crumb, index) => {
              const isLast = index === breadcrumb.length - 1
              return (
                <Fragment key={`${crumb.label}-${index}`}>
                  {index > 0 && (
                    <li aria-hidden className='text-default-400'>
                      /
                    </li>
                  )}
                  <li className='min-w-0 max-w-[16rem] truncate'>
                    {crumb.href && !isLast ? (
                      <Link href={crumb.href} className='transition-colors hover:text-foreground'>
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={isLast ? 'text-foreground' : undefined} aria-current={isLast ? 'page' : undefined}>
                        {crumb.label}
                      </span>
                    )}
                  </li>
                </Fragment>
              )
            })}
          </ol>
        </nav>
      )}
      <h1 className='break-words text-[26px] font-extrabold uppercase leading-tight tracking-[-0.01em] text-foreground [font-variation-settings:"wdth"_72] sm:text-[28px]'>
        {title}
      </h1>
      {description && <p className='mt-1.5 max-w-2xl text-[14px] leading-relaxed text-default-500'>{description}</p>}
    </div>
    {actions && <div className='flex shrink-0 flex-wrap items-center gap-2 lg:justify-end'>{actions}</div>}
  </header>
)

export default PageHeader

interface PanelHeaderProps {
  /** Sentence-case panel title. */
  title: string
  description?: string
  actions?: ReactNode
  className?: string
  /** Use danger colours (danger zone). */
  tone?: 'default' | 'danger'
}

/** Header row for a `bg-content1 border-divider` panel: sentence-case title, description, actions. */
export const PanelHeader = ({ title, description, actions, className, tone = 'default' }: PanelHeaderProps): JSX.Element => (
  <div className={cn('flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-4', className)}>
    <div className='min-w-0'>
      <h2 className={cn('text-[15px] font-semibold', tone === 'danger' ? 'text-danger' : 'text-foreground')}>{title}</h2>
      {description && <p className='mt-1 text-[14px] text-default-500'>{description}</p>}
    </div>
    {actions && <div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div>}
  </div>
)
