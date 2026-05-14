'use client'

import Icon from '@/components/icon'
import { cn } from '@heroui/react'

export interface CategoryItem<T extends string = string> {
  id: T
  icon: string
  label: string
  count?: number
  /** Group bucket. Items without a section default to 'primitives'. */
  section?: 'primitives' | 'config'
}

interface CategoryNavProps<T extends string = string> {
  items: readonly CategoryItem<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
}

const NavRow = <T extends string>({
  item,
  active,
  onClick
}: {
  item: CategoryItem<T>
  active: boolean
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className={cn(
      'group relative flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors duration-150',
      active
        ? 'font-semibold text-foreground'
        : 'text-default-600 hover:bg-content2/60 hover:text-foreground'
    )}>
    {active && (
      <span
        aria-hidden
        className='absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-foreground'
      />
    )}
    <Icon icon={item.icon} className='h-4 w-4 shrink-0' />
    <span className='flex-1 truncate text-[13px] leading-none'>{item.label}</span>
    {typeof item.count === 'number' && (
      <span
        className={cn(
          'shrink-0 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums leading-none',
          active
            ? 'bg-foreground/10 text-foreground'
            : 'bg-content2 text-default-500 group-hover:bg-content3'
        )}>
        {item.count}
      </span>
    )}
  </button>
)

const NavPill = <T extends string>({
  item,
  active,
  onClick
}: {
  item: CategoryItem<T>
  active: boolean
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150',
      active
        ? 'bg-foreground text-background'
        : 'bg-content2 text-default-600 hover:bg-content3 hover:text-foreground'
    )}>
    <Icon icon={item.icon} className='h-3.5 w-3.5' />
    <span>{item.label}</span>
    {typeof item.count === 'number' && (
      <span
        className={cn(
          'text-[10.5px] tabular-nums leading-none',
          active ? 'opacity-70' : 'text-default-500'
        )}>
        {item.count}
      </span>
    )}
  </button>
)

const SectionHead = ({ children }: { children: React.ReactNode }) => (
  <div className='px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-default-500'>
    {children}
  </div>
)

export const CategoryNav = <T extends string>({
  items,
  active,
  onChange,
  className
}: CategoryNavProps<T>) => {
  const primitives = items.filter(i => i.section !== 'config')
  const configs = items.filter(i => i.section === 'config')

  return (
    <>
      {/* Desktop: vertical sidebar with section split */}
      <nav className={cn('hidden flex-col gap-3 md:flex md:w-[160px] md:shrink-0', className)}>
        <div className='flex flex-col gap-0.5'>
          {configs.length > 0 && <SectionHead>Primitives</SectionHead>}
          {primitives.map(item => (
            <NavRow
              key={item.id}
              item={item}
              active={active === item.id}
              onClick={() => onChange(item.id)}
            />
          ))}
        </div>
        {configs.length > 0 && (
          <>
            <div className='mx-3 border-t border-divider' />
            <div className='flex flex-col gap-0.5'>
              <SectionHead>Config</SectionHead>
              {configs.map(item => (
                <NavRow
                  key={item.id}
                  item={item}
                  active={active === item.id}
                  onClick={() => onChange(item.id)}
                />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Mobile: horizontal scroll pill strip */}
      <div className={cn('-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:hidden', className)}>
        {items.map(item => (
          <NavPill
            key={item.id}
            item={item}
            active={active === item.id}
            onClick={() => onChange(item.id)}
          />
        ))}
      </div>
    </>
  )
}
