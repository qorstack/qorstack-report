'use client'

import Icon from '@/components/icon'
import { cn } from '@heroui/react'

export interface CategoryItem<T extends string = string> {
  id: T
  icon: string
  label: string
  count?: number
  /** Short status text shown instead of a count, e.g. "Set". */
  note?: string
  /** Marks the category as containing validation errors. */
  hasError?: boolean
  /** Group bucket. Items without a section default to 'primitives' (shown as "Content"). */
  section?: 'primitives' | 'config'
}

interface CategoryNavProps<T extends string = string> {
  items: readonly CategoryItem<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
  /** Accessible name for the navigation. */
  ariaLabel?: string
  /** `horizontal` keeps the full panel width for the fields (tabs wrap above the content). */
  layout?: 'vertical' | 'horizontal'
}

const SECTION_LABEL: Record<'primitives' | 'config', string> = {
  primitives: 'Content',
  config: 'Output'
}

const Count = ({ value, active }: { value: number; active: boolean }) => (
  <span
    className={cn(
      'shrink-0 font-mono text-[12px] tabular-nums leading-none',
      active ? 'text-foreground' : value > 0 ? 'text-default-500' : 'text-default-400'
    )}>
    {value}
  </span>
)

const Trailing = ({ item, active }: { item: CategoryItem; active: boolean }) => (
  <>
    {item.hasError && <span aria-label='Has errors' className='h-1.5 w-1.5 shrink-0 rounded-full bg-danger' />}
    {item.note ? (
      <span className={cn('shrink-0 text-[12px] leading-none', active ? 'text-foreground' : 'text-default-500')}>
        {item.note}
      </span>
    ) : (
      typeof item.count === 'number' && <Count value={item.count} active={active} />
    )}
  </>
)

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
    type='button'
    onClick={onClick}
    aria-current={active ? 'true' : undefined}
    className={cn(
      'group relative flex h-9 w-full items-center gap-2.5 border-l-2 pl-3 pr-2.5 text-left transition-colors duration-150',
      active
        ? 'border-primary bg-content2 font-medium text-foreground'
        : 'border-transparent text-default-500 hover:bg-content2 hover:text-foreground'
    )}>
    <Icon icon={item.icon} className={cn('h-4 w-4 shrink-0', active && 'text-foreground')} />
    <span className='flex-1 truncate text-[14px] leading-none'>{item.label}</span>
    <Trailing item={item} active={active} />
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
    type='button'
    onClick={onClick}
    aria-current={active ? 'true' : undefined}
    className={cn(
      'flex h-9 shrink-0 items-center gap-2 whitespace-nowrap px-3 text-[13px] font-medium transition-colors duration-150',
      active ? 'bg-content4 text-foreground' : 'text-default-500 hover:bg-content2 hover:text-foreground'
    )}>
    <Icon icon={item.icon} className={cn('h-3.5 w-3.5', active && 'text-foreground')} />
    <span>{item.label}</span>
    <Trailing item={item} active={active} />
  </button>
)

const SectionHead = ({ children }: { children: React.ReactNode }) => (
  <div className='px-3 pb-2 pt-1 text-[12px] font-medium text-default-500'>{children}</div>
)

export const CategoryNav = <T extends string>({
  items,
  active,
  onChange,
  className,
  ariaLabel = 'Field categories',
  layout = 'vertical'
}: CategoryNavProps<T>) => {
  const primitives = items.filter(i => i.section !== 'config')
  const configs = items.filter(i => i.section === 'config')

  if (layout === 'horizontal') {
    return (
      <nav aria-label={ariaLabel} className={cn('flex flex-wrap items-center gap-2', className)}>
        {primitives.map(item => (
          <NavPill key={item.id} item={item} active={active === item.id} onClick={() => onChange(item.id)} />
        ))}
        {configs.length > 0 && <span aria-hidden className='mx-1 h-5 w-px bg-divider' />}
        {configs.map(item => (
          <NavPill key={item.id} item={item} active={active === item.id} onClick={() => onChange(item.id)} />
        ))}
      </nav>
    )
  }

  return (
    <>
      {/* ≥ md: vertical list with "Content" / "Output" groups */}
      <nav aria-label={ariaLabel} className={cn('hidden flex-col gap-4 md:flex md:w-[176px] md:shrink-0', className)}>
        <div className='flex flex-col'>
          {configs.length > 0 && <SectionHead>{SECTION_LABEL.primitives}</SectionHead>}
          {primitives.map(item => (
            <NavRow key={item.id} item={item} active={active === item.id} onClick={() => onChange(item.id)} />
          ))}
        </div>
        {configs.length > 0 && (
          <div className='flex flex-col border-t border-divider pt-3'>
            <SectionHead>{SECTION_LABEL.config}</SectionHead>
            {configs.map(item => (
              <NavRow key={item.id} item={item} active={active === item.id} onClick={() => onChange(item.id)} />
            ))}
          </div>
        )}
      </nav>

      {/* < md: horizontal scrolling strip */}
      <nav aria-label={ariaLabel} className={cn('-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden', className)}>
        {items.map(item => (
          <NavPill key={item.id} item={item} active={active === item.id} onClick={() => onChange(item.id)} />
        ))}
      </nav>
    </>
  )
}
