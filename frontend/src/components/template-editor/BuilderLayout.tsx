'use client'

import React from 'react'
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Spinner,
  Switch,
  cn
} from '@heroui/react'
import Icon from '@/components/icon'

/* -------------------------------------------------------------------------------------------------
 * Split layout
 * < lg  : one column — fields first, preview opens in a drawer, sticky bottom action bar.
 * ≥ lg  : resizable split — fields panel (clamped so the preview keeps ≥ 360px) | sticky preview.
 * -----------------------------------------------------------------------------------------------*/

interface BuilderSplitProps {
  panelWidth: number
  minWidth: number
  maxWidth: number
  onResizeStart: (e: React.MouseEvent) => void
  onResizeKeyDown: (e: React.KeyboardEvent) => void
  fields: React.ReactNode
  preview: React.ReactNode
  /** Rendered fixed at the bottom of the viewport below lg. */
  mobileBar: React.ReactNode
}

export const BuilderSplit: React.FC<BuilderSplitProps> = ({
  panelWidth,
  minWidth,
  maxWidth,
  onResizeStart,
  onResizeKeyDown,
  fields,
  preview,
  mobileBar
}) => (
  <>
    <div className='flex flex-col pb-24 lg:flex-row lg:items-start lg:pb-0'>
      <div
        style={{ '--builder-panel-w': `${panelWidth}px` } as React.CSSProperties}
        className='w-full min-w-0 lg:w-[min(var(--builder-panel-w),calc(100%_-_380px))] lg:shrink-0'>
        {fields}
      </div>

      {/* Resize handle — mouse drag or arrow keys */}
      <div
        role='separator'
        aria-orientation='vertical'
        aria-label='Resize fields panel'
        aria-valuenow={panelWidth}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        tabIndex={0}
        onMouseDown={onResizeStart}
        onKeyDown={onResizeKeyDown}
        title='Drag or use arrow keys to resize'
        className='group sticky top-0 hidden h-[calc(100vh-110px)] w-3 shrink-0 cursor-col-resize items-center justify-center self-start outline-none lg:flex'>
        <span className='h-full w-px bg-divider transition-colors group-hover:bg-default-400 group-focus-visible:bg-foreground group-active:bg-foreground' />
        <span className='absolute h-10 w-[3px] bg-default-300 transition-colors group-hover:bg-foreground group-focus-visible:bg-foreground group-active:bg-foreground' />
      </div>

      <div className='sticky top-0 hidden h-[calc(100vh-110px)] min-w-0 flex-1 flex-col lg:flex'>{preview}</div>
    </div>

    <div className='fixed inset-x-0 bottom-0 z-40 border-t border-divider bg-content1 px-4 py-3 shadow-[0_-16px_40px_-20px_rgba(20,20,20,.25)] dark:shadow-[0_-24px_60px_-24px_rgba(0,0,0,.8)] lg:hidden'>
      {mobileBar}
    </div>
  </>
)

/** True below lg, where the preview panel is hidden and results show in a drawer instead. */
export const isSingleColumnLayout = () =>
  typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches

/* -------------------------------------------------------------------------------------------------
 * Panels
 * -----------------------------------------------------------------------------------------------*/

export const BuilderPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <section className={cn('flex min-w-0 flex-col border border-divider bg-content1', className)}>{children}</section>
)

/** Panel head bar: 46px, 1px bottom border (mirrors the landing playground head). */
export const PanelHead: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('flex min-h-[46px] flex-wrap items-center gap-2 border-b border-divider', className)}>
    {children}
  </div>
)

/** Calm tabs that sit flush inside a PanelHead (selected = foreground text + 2px foreground underline). */
export const HeadTabs = <T extends string>({
  items,
  active,
  onChange,
  ariaLabel
}: {
  items: readonly { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
  ariaLabel: string
}) => (
  <div role='tablist' aria-label={ariaLabel} className='flex self-stretch'>
    {items.map(item => {
      const selected = item.id === active
      return (
        <button
          key={item.id}
          type='button'
          role='tab'
          aria-selected={selected}
          onClick={() => onChange(item.id)}
          className={cn(
            'min-h-[46px] border-b-2 px-4 text-[14px] font-medium transition-colors sm:px-5',
            selected ? 'border-foreground text-foreground' : 'border-transparent text-default-500 hover:text-foreground'
          )}>
          {item.label}
        </button>
      )
    })}
  </div>
)

/** Endpoint hint in a panel head: "POST /render/word/template". */
export const EndpointHint: React.FC<{ path: string }> = ({ path }) => (
  <span className='ml-auto hidden truncate px-4 font-mono text-[12px] text-default-500 xl:inline'>
    <b className='font-semibold text-default-400'>POST</b> {path}
  </span>
)

/* -------------------------------------------------------------------------------------------------
 * Field sections
 * -----------------------------------------------------------------------------------------------*/

interface BuilderSectionProps {
  title: string
  description?: string
  children: React.ReactNode
}

export const BuilderSection: React.FC<BuilderSectionProps> = ({ title, description, children }) => (
  <div className='flex w-full min-w-0 flex-col'>
    <div className='mb-3 min-w-0'>
      <h2 className='text-[15px] font-semibold leading-tight text-foreground'>{title}</h2>
      {description && <p className='mt-1.5 text-[13px] leading-snug text-default-500'>{description}</p>}
    </div>
    <div>{children}</div>
  </div>
)

/** Top-of-panel note: fields are read from the template file, change them by replacing the file. */
export const FieldsSourceNote: React.FC<{ fileLabel: string; onReplaceFile: () => void }> = ({
  fileLabel,
  onReplaceFile
}) => (
  <p className='flex items-start gap-2 text-[13px] text-default-500'>
    <Icon icon='lucide:info' className='mt-0.5 h-4 w-4 shrink-0' />
    <span>
      Fields come from your {fileLabel} file. To add or rename one, edit the file and use{' '}
      <button
        type='button'
        onClick={onReplaceFile}
        className='text-foreground underline underline-offset-4 transition-colors hover:text-default-600'>
        Replace file
      </button>
      .
    </span>
  </p>
)

export interface FieldChanges {
  added: string[]
  removed: string[]
}

/** Shown after Replace file: which fields the new file added or removed. Test values for kept fields stay. */
export const FieldChangesNotice: React.FC<{ changes: FieldChanges; onDismiss: () => void }> = ({ changes, onDismiss }) => {
  const none = changes.added.length === 0 && changes.removed.length === 0
  return (
    <div role='status' className='flex flex-col gap-2 border border-divider bg-content2 px-3 py-2.5'>
      <div className='flex items-center justify-between gap-2'>
        <span className='flex items-center gap-2 text-[13px] font-medium text-foreground'>
          <Icon icon='lucide:file-check' className='h-4 w-4 text-default-500' />
          {none ? 'File replaced — same fields as before' : 'File replaced — fields changed'}
        </span>
        <button
          type='button'
          onClick={onDismiss}
          aria-label='Dismiss'
          className='text-default-500 transition-colors hover:text-foreground'>
          <Icon icon='lucide:x' className='h-4 w-4' />
        </button>
      </div>
      {changes.added.length > 0 && (
        <p className='text-[13px] text-default-500'>
          <span className='text-success'>Added</span>:{' '}
          <span className='break-all font-mono text-foreground'>{changes.added.join(', ')}</span>
        </p>
      )}
      {changes.removed.length > 0 && (
        <p className='text-[13px] text-default-500'>
          <span className='text-default-600'>Removed</span>:{' '}
          <span className='break-all font-mono text-foreground'>{changes.removed.join(', ')}</span>
        </p>
      )}
      {!none && <p className='text-[12px] text-default-500'>Test values for fields that are still in the file were kept.</p>}
    </div>
  )
}

/** Short list of API validation problems; each entry jumps to the field it belongs to. */
export const ValidationSummary: React.FC<{
  items: readonly { label: string; message: string; onJump?: () => void }[]
  onDismiss: () => void
}> = ({ items, onDismiss }) => {
  if (items.length === 0) return null
  const shown = items.slice(0, 5)
  return (
    <div role='alert' className='mb-4 flex flex-col gap-2 border border-danger/50 px-3 py-2.5'>
      <div className='flex items-center justify-between gap-2'>
        <span className='flex items-center gap-2 text-[13px] font-medium text-danger'>
          <Icon icon='lucide:triangle-alert' className='h-4 w-4' />
          {items.length === 1 ? '1 field needs attention' : `${items.length} fields need attention`}
        </span>
        <button
          type='button'
          onClick={onDismiss}
          aria-label='Dismiss'
          className='text-default-500 transition-colors hover:text-foreground'>
          <Icon icon='lucide:x' className='h-4 w-4' />
        </button>
      </div>
      <ul className='flex flex-col gap-1'>
        {shown.map((e, i) => (
          <li key={i} className='text-[13px] text-default-600'>
            {e.onJump ? (
              <button type='button' onClick={e.onJump} className='text-left hover:text-foreground'>
                <span className='font-mono text-foreground'>{e.label}</span> — {e.message}
              </button>
            ) : (
              <>
                <span className='font-mono text-foreground'>{e.label}</span> — {e.message}
              </>
            )}
          </li>
        ))}
        {items.length > shown.length && (
          <li className='text-[12px] text-default-500'>and {items.length - shown.length} more</li>
        )}
      </ul>
    </div>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Preview pieces
 * -----------------------------------------------------------------------------------------------*/

export const AutoPreviewSwitch: React.FC<{
  isSelected: boolean
  isDisabled?: boolean
  onToggle: () => void
}> = ({ isSelected, isDisabled, onToggle }) => (
  <Switch
    color='default'
    size='sm'
    isSelected={isSelected}
    isDisabled={isDisabled}
    onValueChange={() => onToggle()}
    aria-label='Auto-preview: re-render the preview as you edit'
    classNames={{
      wrapper: 'group-data-[selected=true]:bg-foreground',
      thumb: 'group-data-[selected=true]:bg-background',
      label: 'text-[13px] text-default-500'
    }}>
    Auto-preview
  </Switch>
)

/** One-line status under the preview head. */
export const PreviewNotice: React.FC<{
  tone?: 'info' | 'ok' | 'busy' | 'error'
  children: React.ReactNode
}> = ({ tone = 'info', children }) => {
  const icon =
    tone === 'error' ? 'lucide:triangle-alert' : tone === 'ok' ? 'lucide:check' : tone === 'info' ? 'lucide:info' : ''
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'mb-3 flex items-center gap-2 border px-3 py-2 text-[13px]',
        tone === 'error' ? 'border-danger/50 text-danger' : 'border-divider text-default-500'
      )}>
      {tone === 'busy' ? (
        <Spinner size='sm' color='default' />
      ) : (
        <Icon icon={icon} className={cn('h-4 w-4 shrink-0', tone === 'ok' && 'text-success')} />
      )}
      <span>{children}</span>
    </div>
  )
}

/** Quiet empty state for the preview area. */
export const PreviewEmpty: React.FC<{
  icon: string
  title: string
  hint: string
  action?: React.ReactNode
}> = ({ icon, title, hint, action }) => (
  <div className='m-2 flex min-h-[280px] flex-col items-center justify-center p-8 text-center'>
    <Icon icon={icon} className='mb-3 h-7 w-7 text-default-500' />
    <h3 className='text-[15px] font-semibold text-foreground'>{title}</h3>
    <p className='mt-1.5 max-w-xs text-[14px] text-default-500'>{hint}</p>
    {action && <div className='mt-5'>{action}</div>}
  </div>
)

/** Dark striped surround for the document preview. */
export const PreviewCanvas: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className='no-scrollbar flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-background p-4'>
    <div className='mx-auto w-full max-w-4xl'>{children}</div>
  </div>
)

/* -------------------------------------------------------------------------------------------------
 * Actions
 * -----------------------------------------------------------------------------------------------*/

const primaryBtn = 'h-10 px-4 font-semibold text-[14px]'
const secondaryBtn =
  'h-10 border-1 border-default-300 px-4 font-medium text-[14px] text-foreground hover:border-foreground'

export const GenerateButton: React.FC<{
  label: string
  isLoading?: boolean
  onPress: () => void
  className?: string
}> = ({ label, isLoading, onPress, className }) => (
  <Button
    color='primary'
    radius='none'
    isLoading={isLoading}
    onPress={onPress}
    className={cn(primaryBtn, className)}
    startContent={!isLoading && <Icon icon='lucide:zap' className='h-4 w-4' />}>
    {label}
  </Button>
)

export interface GenerateOption<T extends string> {
  key: T
  label: string
  description: string
  icon: string
}

/** Split button: main part runs the selected format, the chevron picks the format. */
export const GenerateSplitButton = <T extends string>({
  options,
  selected,
  onSelect,
  onGenerate,
  isLoading,
  className
}: {
  options: readonly GenerateOption<T>[]
  selected: T
  onSelect: (key: T) => void
  onGenerate: () => void
  isLoading?: boolean
  className?: string
}) => {
  const current = options.find(o => o.key === selected) ?? options[0]
  return (
    <div className={cn('flex', className)}>
      <Button
        color='primary'
        radius='none'
        isLoading={isLoading}
        onPress={onGenerate}
        className={cn(primaryBtn, 'flex-1 border-r border-primary-foreground/25')}
        startContent={!isLoading && <Icon icon='lucide:zap' className='h-4 w-4' />}>
        Generate {current.label}
      </Button>
      <Dropdown placement='bottom-end' radius='none'>
        <DropdownTrigger>
          <Button
            color='primary'
            radius='none'
            isIconOnly
            isDisabled={isLoading}
            aria-label='Choose output format'
            className='h-10 w-10 min-w-10'>
            <Icon icon='lucide:chevron-down' className='h-4 w-4' />
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label='Output format'
          selectionMode='single'
          disallowEmptySelection
          selectedKeys={[selected]}
          onAction={key => {
            const match = options.find(o => o.key === String(key))
            if (match) onSelect(match.key)
          }}>
          {options.map(o => (
            <DropdownItem
              key={o.key}
              description={o.description}
              startContent={<Icon icon={o.icon} className='h-4 w-4 shrink-0 text-default-500' />}>
              {o.label}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}

export const DownloadResultButton: React.FC<{
  onPress: () => void
  label?: string
  iconOnly?: boolean
  className?: string
}> = ({ onPress, label = 'Download', iconOnly, className }) => (
  <Button
    variant='bordered'
    radius='none'
    isIconOnly={iconOnly}
    aria-label={iconOnly ? label : undefined}
    title={label}
    onPress={onPress}
    className={cn(secondaryBtn, iconOnly && 'w-10 min-w-10 px-0', className)}
    startContent={!iconOnly && <Icon icon='lucide:download' className='h-4 w-4' />}>
    {iconOnly ? <Icon icon='lucide:download' className='h-4 w-4' /> : label}
  </Button>
)

export const PreviewOpenButton: React.FC<{ onPress: () => void; className?: string }> = ({ onPress, className }) => (
  <Button
    variant='bordered'
    radius='none'
    onPress={onPress}
    className={cn(secondaryBtn, className)}
    startContent={<Icon icon='lucide:eye' className='h-4 w-4' />}>
    Preview
  </Button>
)
