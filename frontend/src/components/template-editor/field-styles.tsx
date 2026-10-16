import React from 'react'
import { cn } from '@heroui/react'
import Icon from '@/components/icon'

/**
 * Press field styles shared by the Word and Excel template builders.
 * Square, bordered inputs on `content2`, `default-300` border, foreground border on focus (calm app mode: no red).
 */

const wrapperBase =
  'border border-default-300 bg-content2 shadow-none transition-colors data-[hover=true]:border-default-400 data-[hover=true]:bg-content2 group-data-[focus=true]:border-foreground group-data-[focus=true]:bg-content2'

const labelBase = '!text-default-500 text-[13px] font-medium'

/** Full-size field (detail forms, output settings). */
export const fieldClasses = {
  inputWrapper: cn(wrapperBase, 'h-10 min-h-10'),
  input: 'text-[14px] text-foreground placeholder:text-default-400',
  label: labelBase,
  description: 'text-[12px] text-default-500',
  errorMessage: 'text-[12px]'
}

/** Compact field used inside list rows. */
export const rowFieldClasses = {
  inputWrapper: cn(wrapperBase, 'h-9 min-h-9 px-2.5'),
  input: 'text-[13px] text-foreground placeholder:text-default-400',
  errorMessage: 'text-[12px]'
}

/** Variable-name field: neutral mono `{{name}}`. */
export const keyFieldClasses = {
  inputWrapper: cn(wrapperBase, 'h-9 min-h-9 px-2.5'),
  input: 'font-mono text-[13px] text-foreground placeholder:font-normal placeholder:text-default-400',
  errorMessage: 'text-[12px]'
}

const triggerBase =
  'border border-default-300 bg-content2 shadow-none transition-colors data-[hover=true]:border-default-400 data-[hover=true]:bg-content2 data-[open=true]:border-foreground data-[focus=true]:border-foreground'

export const selectClasses = {
  trigger: cn(triggerBase, 'h-10 min-h-10'),
  value: 'text-[14px] !text-foreground',
  label: labelBase,
  description: 'text-[12px] text-default-500',
  popoverContent: 'border border-default-300 bg-content2'
}

export const rowSelectClasses = {
  trigger: cn(triggerBase, 'h-9 min-h-9'),
  value: 'text-[13px] !text-foreground',
  label: labelBase,
  popoverContent: 'border border-default-300 bg-content2'
}

/** Square bordered icon button used for row actions (expand, remove…). */
export const rowIconButton =
  'flex h-9 w-9 shrink-0 items-center justify-center border border-default-300 text-default-500 transition-colors hover:border-foreground hover:text-foreground'

export const rowRemoveButton =
  'flex h-9 w-9 shrink-0 items-center justify-center border border-default-300 text-default-500 transition-colors hover:border-danger hover:text-danger'

/** Dashed square "+ Add …" button. */
export const AddButton: React.FC<{
  onPress: () => void
  children: React.ReactNode
  className?: string
  fullWidth?: boolean
}> = ({ onPress, children, className, fullWidth }) => (
  <button
    type='button'
    data-skip-enter='true'
    onClick={onPress}
    className={cn(
      'inline-flex h-9 items-center justify-center gap-1.5 border border-dashed border-default-300 px-3 text-[13px] font-medium text-default-500 transition-colors hover:border-foreground hover:text-foreground',
      fullWidth && 'w-full',
      className
    )}>
    <Icon icon='lucide:plus' className='h-3.5 w-3.5' />
    {children}
  </button>
)

/** Template variable label: neutral mono `{{name}}` on content2. */
export const VarLabel: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={cn('bg-content2 px-1.5 py-0.5 font-mono text-[12px] text-foreground', className)}>
    {name.startsWith('{{') ? name : `{{${name}}}`}
  </span>
)

/** Small sentence-case label (app mode). */
export const MonoLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={cn('text-[13px] font-medium text-default-500', className)}>
    {children}
  </span>
)

/** Bordered sub-panel used for expanded row details and settings groups. */
export const detailPanel = 'flex flex-col gap-4 border-t border-divider p-4'

export const settingsCard = 'flex flex-col gap-4 border-t border-divider pt-4 first:border-t-0 first:pt-0'
