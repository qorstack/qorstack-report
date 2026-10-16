import React, { useState } from 'react'
import {
  Input,
  Checkbox,
  Select,
  SelectItem,
  cn,
  Accordion,
  AccordionItem,
  Selection,
  Slider,
  Switch,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody
} from '@heroui/react'
import Icon from '@/components/icon'
import { BrandChip } from '@/components/ui/BrandChip'
import {
  AddButton,
  MonoLabel,
  detailPanel,
  fieldClasses,
  rowFieldClasses,
  rowIconButton,
  rowRemoveButton,
  rowSelectClasses,
  selectClasses,
  settingsCard
} from '@/components/template-editor/field-styles'
import type { BuilderSortDefinition as SortDefinition } from '@/types/pdf-sandbox'
import { ReadOnlyFieldName } from '@/components/template-editor/editor-mode'
import {
  ImageDataRequest,
  QrCodeDataRequest,
  BarcodeDataRequest,
  PdfWatermarkRequest,
  PdfPasswordRequest,
  FontSummaryDto
} from '@/api/generated/main-service/apiGenerated'

// --- Types for UI State ---
export interface ReplaceItem {
  id: string
  key: string // Display key (e.g. {{name}})
  value: string
}

export interface ImageItem {
  id: string
  key: string
  data: ImageDataRequest
}

export interface QrCodeItem {
  id: string
  key: string
  data: QrCodeDataRequest
}

export interface BarcodeItem {
  id: string
  key: string
  data: BarcodeDataRequest
}

export interface TableItem {
  id: string
  columns: string[] // Ordered columns
  rows: Record<string, string>[]
  sort?: SortDefinition[]
  verticalMerge?: string[]
  collapse?: string[]
  repeatHeader?: boolean
}

// --- Helpers ---
export const generateId = () => `id_${Math.random().toString(36).substring(2, 9)}`

export const formatKey = (input: string, type: 'replace' | 'table' | 'image' | 'qrcode' | 'barcode') => {
  if (!input) return ''
  let content = input.trim()

  const match = content.match(/\{\{([^}]+)\}\}/)
  if (match) {
    content = match[1]
  }

  content = content.replace(/[{}]/g, '').trim()
  if (!content) return ''

  if (type === 'replace') {
    return `{{${content}}}`
  } else {
    const prefix = type === 'table' ? 'row:' : `${type}:`
    if (!content.startsWith(prefix)) {
      content = `${prefix}${content}`
    }
    return `{{${content}}}`
  }
}

// --- Handle Enter Key Navigation ---
export const handleEnterKey = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    // Find all focusable inputs
    const focusable = Array.from(
      document.querySelectorAll('input, select, textarea, button, [tabindex]:not([tabindex="-1"])')
    )
    const current = e.target as Element
    let index = focusable.indexOf(current)

    if (index !== -1) {
      let nextIndex = index + 1
      while (nextIndex < focusable.length) {
        const nextElement = focusable[nextIndex] as HTMLElement
        // Skip disabled, hidden, or specifically skipped elements
        if (
          !nextElement.hasAttribute('disabled') &&
          nextElement.getAttribute('aria-hidden') !== 'true' &&
          nextElement.getAttribute('data-skip-enter') !== 'true' &&
          nextElement.offsetParent !== null // Check visibility
        ) {
          nextElement.focus()
          if (nextElement instanceof HTMLInputElement) {
            nextElement.select()
          }
          break
        }
        nextIndex++
      }
    }
  }
}

// --- Number Input Handler ---
const handleNumChange = (val: string, setter: (n: number) => void) => {
  if (val === '') {
    setter(0)
    return
  }
  const n = Number(val)
  if (!isNaN(n)) {
    setter(n)
  }
}

// --- Field rows (read-only structure: fields come from the template file) ---
interface FieldRowProps {
  id: string
  children: React.ReactNode
  className?: string
}

/** Row wrapper with a stable DOM id so validation errors can scroll to it. */
const FieldRow = ({ id, children, className }: FieldRowProps) => (
  <div id={`row-${id}`} className={className}>
    {children}
  </div>
)

const focusField = (...ids: string[]) => {
  for (const id of ids) {
    const el = document.getElementById(id)
    if (el instanceof HTMLElement) {
      el.focus()
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
  }
}

// --- Replaces Section ---
interface ReplacementsSectionProps {
  items: ReplaceItem[]
  onChange: (items: ReplaceItem[]) => void
  errors?: Record<string, string>
  onClearError?: (id: string) => void
  /** "Word" or "Excel" — used in the empty state. */
  fileLabel?: string
}

export const ReplacementsSection: React.FC<ReplacementsSectionProps> = ({
  items,
  onChange,
  errors,
  onClearError,
  fileLabel = 'Word'
}) => {
  const [showEmptyOnly, setShowEmptyOnly] = useState(false)

  const jumpToNextEmpty = () => {
    const nextEmpty = items.find(i => !i.value || i.value === 'null')
    if (nextEmpty) focusField(`value-${nextEmpty.id}`)
  }

  const updateValue = (id: string, value: string) => {
    onChange(items.map(item => (item.id === id ? { ...item, value } : item)))
  }

  if (items.length === 0) {
    return (
      <StepsEmptyState
        icon='lucide:type'
        title='No text fields in this file'
        marker='{{customer}}'
        what='text field'
        fileLabel={fileLabel}
      />
    )
  }

  const emptyCount = items.filter(i => !i.value || i.value === 'null').length

  return (
    <>
      <SummaryBar
        left={`${items.length - emptyCount}/${items.length} filled`}
        missing={emptyCount}
        missingLabel='empty'
        doneLabel='All filled'
        showMissingOnly={showEmptyOnly}
        onToggleMissingOnly={() => setShowEmptyOnly(v => !v)}
        onJumpNext={jumpToNextEmpty}
      />
      <div className='flex flex-col'>
        {items
          .filter(item => !showEmptyOnly || !item.value || item.value === 'null')
          .map(item => {
            const hasValue = !!item.value && item.value !== 'null'
            const rawKey = item.key.replace(/[{}]/g, '').trim() || 'variable'
            return (
              <FieldRow
                key={item.id}
                id={item.id}
                className='flex items-center gap-2 border-b border-divider py-1.5 last:border-b-0'>
                <StatusDot filled={hasValue} />
                <ReadOnlyFieldName
                  value={item.key}
                  error={errors?.[item.id]}
                  className='w-[38%] min-w-[110px] max-w-[260px] shrink-0'
                />
                <Input
                  value={item.value === 'null' ? '' : item.value ?? ''}
                  id={`value-${item.id}`}
                  aria-label={`Value for {{${rawKey}}}`}
                  placeholder='Type a value'
                  onValueChange={v => {
                    updateValue(item.id, v)
                    onClearError?.(item.id)
                  }}
                  variant='bordered'
                  radius='none'
                  size='md'
                  classNames={rowFieldClasses}
                  onKeyDown={handleEnterKey}
                  className='min-w-0 flex-1'
                />
              </FieldRow>
            )
          })}
      </div>
    </>
  )
}

// --- Shared row styling tokens (Press) ---
// Shell = plain row separated by one hairline; configured state is shown by a StatusDot.
const rowShell = (_configured: boolean) => 'group flex flex-col border-b border-divider transition-colors duration-150'

/** Small filled/empty indicator: success dot when set, hollow neutral dot when empty. */
export const StatusDot: React.FC<{ filled: boolean; className?: string }> = ({ filled, className }) => (
  <span
    aria-hidden
    title={filled ? 'Filled' : 'Empty'}
    className={cn(
      'h-1.5 w-1.5 shrink-0 rounded-full',
      filled ? 'bg-success' : 'border border-default-400 bg-transparent',
      className
    )}
  />
)
const rowHeaderStrip = (_configured: boolean) => 'flex items-center gap-2 py-1.5 pl-1.5 pr-1.5'
const rowDeleteBtn = rowRemoveButton
const rowIconBtn = rowIconButton
const rowSummaryChip =
  'hidden sm:flex shrink-0 items-center gap-1.5 whitespace-nowrap px-1 py-1 text-[12px] text-default-500'
const attentionChip = 'flex shrink-0 items-center gap-1 whitespace-nowrap px-1 py-1 text-[12px] text-default-400'

// Detail inputs (used inside expanded state)
const detailInputClasses = fieldClasses
const detailSelectClasses = selectClasses

// --- Summary bar (shared — filled / missing + filter + jump) ---
export const SummaryBar: React.FC<{
  left: string
  missing: number
  missingLabel: string
  doneLabel: string
  showMissingOnly: boolean
  onToggleMissingOnly: () => void
  onJumpNext?: () => void
}> = ({ left, missing, missingLabel, doneLabel, showMissingOnly, onToggleMissingOnly, onJumpNext }) => (
  <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
    <div className='flex items-center gap-2 text-[13px]'>
      <span className='text-default-500'>{left}</span>
      <span aria-hidden className='text-default-400'>
        ·
      </span>
      {missing > 0 ? (
        <button
          type='button'
          onClick={onToggleMissingOnly}
          aria-pressed={showMissingOnly}
          className={cn(
            'flex items-center gap-1.5 border px-1.5 py-0.5 transition-colors duration-150',
            showMissingOnly
              ? 'border-default-300 text-foreground'
              : 'border-transparent text-default-500 hover:border-default-300 hover:text-foreground'
          )}
          title={showMissingOnly ? 'Show all' : `Show ${missingLabel} only`}>
          <StatusDot filled={false} />
          {missing} {missingLabel}
          {showMissingOnly && <Icon icon='lucide:x' className='h-3 w-3' />}
        </button>
      ) : (
        <span className='flex items-center gap-1.5 text-default-500'>
          <StatusDot filled />
          {doneLabel}
        </span>
      )}
    </div>
    {missing > 0 && onJumpNext && (
      <button
        type='button'
        onClick={onJumpNext}
        className='flex items-center gap-1 px-1 py-0.5 text-[13px] text-default-500 transition-colors duration-150 hover:text-foreground'
        title={`Go to next ${missingLabel}`}>
        Next {missingLabel}
        <Icon icon='lucide:arrow-down' className='h-3.5 w-3.5' />
      </button>
    )}
  </div>
)

interface SectionSummaryProps {
  total: number
  missing: number
  missingLabel: string
  onJumpNext?: () => void
  showMissingOnly: boolean
  onToggleMissingOnly: () => void
}
const SectionSummary: React.FC<SectionSummaryProps> = ({
  total,
  missing,
  missingLabel,
  onJumpNext,
  showMissingOnly,
  onToggleMissingOnly
}) => (
  <SummaryBar
    left={`${total - missing}/${total} ready`}
    missing={missing}
    missingLabel={missingLabel}
    doneLabel='All ready'
    showMissingOnly={showMissingOnly}
    onToggleMissingOnly={onToggleMissingOnly}
    onJumpNext={onJumpNext}
  />
)

// --- Expand chevron button (shared) ---
export const ExpandToggle = ({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) => (
  <button
    type='button'
    data-skip-enter='true'
    onClick={onToggle}
    title={expanded ? 'Hide details' : 'Show details'}
    aria-label={expanded ? 'Hide details' : 'Show details'}
    aria-expanded={expanded}
    className={cn(rowIconBtn, expanded && 'border-foreground text-foreground')}>
    <Icon icon={expanded ? 'lucide:chevron-up' : 'lucide:chevron-down'} className='h-4 w-4' />
  </button>
)

// --- Shared CheckboxCard ---
export const CheckboxCard: React.FC<{
  checked: boolean
  onChange: (v: boolean) => void
  icon?: string
  label: string
  className?: string
}> = ({ checked, onChange, icon, label, className }) => (
  <label
    className={cn(
      'flex cursor-pointer items-center gap-2.5 border px-3 py-2.5 transition-colors duration-150',
      checked ? 'border-default-500 bg-content2' : 'border-divider hover:border-default-300',
      className
    )}>
    <Checkbox color='default' radius='none' isSelected={checked} onValueChange={onChange} size='sm' />
    {icon && <Icon icon={icon} className={cn('h-4 w-4 shrink-0', checked ? 'text-foreground' : 'text-default-500')} />}
    <span className='text-[13px] font-medium text-foreground'>{label}</span>
  </label>
)

// --- Empty state (shared) ---
export const EmptyState: React.FC<{ icon: string; title: string; hint?: string }> = ({ icon, title, hint }) => (
  <div className='mx-1.5 my-2 flex flex-col items-center justify-center px-6 py-10 text-center'>
    <Icon icon={icon} className='mb-3 h-6 w-6 text-default-500' />
    <p className='text-[15px] font-semibold text-foreground'>{title}</p>
    {hint && <p className='mt-1.5 max-w-xs text-[13px] text-default-500'>{hint}</p>}
  </div>
)

export { AddButton, MonoLabel }

// --- Fit picker (plain words + a tiny visual of each mode) ---
type ImageFit = 'cover' | 'contain' | 'fill'
const FIT_OPTIONS: readonly { id: ImageFit; label: string; hint: string }[] = [
  { id: 'contain', label: 'Fit inside', hint: 'Whole image visible, keeps proportions' },
  { id: 'cover', label: 'Fill & crop', hint: 'Fills the box, edges may be cut off' },
  { id: 'fill', label: 'Stretch', hint: 'Fills the box exactly, may distort' }
]

/** A round picture in a wide box: fits inside, gets cropped, or gets stretched into an oval. */
const FitGlyph: React.FC<{ fit: ImageFit }> = ({ fit }) => (
  <span aria-hidden className='relative flex h-6 w-9 shrink-0 items-center justify-center overflow-hidden border border-default-400'>
    <span
      className={cn(
        'block shrink-0 rounded-full bg-default-500',
        fit === 'contain' && 'h-[18px] w-[18px]',
        fit === 'cover' && 'h-9 w-9',
        fit === 'fill' && 'h-full w-full'
      )}
    />
  </span>
)

const FitPicker: React.FC<{ value: ImageFit; onChange: (fit: ImageFit) => void; error?: string }> = ({
  value,
  onChange,
  error
}) => (
  <div className='flex flex-col gap-1.5'>
    <span className='text-[12px] font-medium text-default-600'>How the image fills its box</span>
    <div role='radiogroup' aria-label='Image fit' className='grid grid-cols-1 gap-1.5 sm:grid-cols-3'>
      {FIT_OPTIONS.map(o => {
        const selected = o.id === value
        return (
          <button
            key={o.id}
            type='button'
            role='radio'
            aria-checked={selected}
            onClick={() => onChange(o.id)}
            className={cn(
              'flex items-center gap-2.5 border px-2.5 py-2 text-left transition-colors duration-150',
              selected ? 'border-foreground bg-content2' : 'border-divider hover:border-default-400'
            )}>
            <FitGlyph fit={o.id} />
            <span className='flex min-w-0 flex-col'>
              <span className='text-[13px] font-medium text-foreground'>{o.label}</span>
              <span className='text-[12px] leading-snug text-default-500'>{o.hint}</span>
            </span>
          </button>
        )
      })}
    </div>
    {error && <span className='text-[12px] text-danger'>{error}</span>}
  </div>
)

/** Empty state for marker-based fields: fields come only from markers in the template file. */
const StepsEmptyState: React.FC<{ icon: string; title: string; marker: string; what: string; fileLabel?: string }> = ({
  icon,
  title,
  marker,
  what,
  fileLabel = 'Word'
}) => (
  <div className='mx-1.5 my-2 flex flex-col items-center px-6 py-8 text-center'>
    <Icon icon={icon} className='mb-3 h-6 w-6 text-default-500' />
    <p className='text-[15px] font-semibold text-foreground'>{title}</p>
    <ol className='mt-3 flex max-w-sm flex-col gap-2 text-left text-[13px] text-default-500'>
      <li className='flex gap-2'>
        <span className='font-mono text-default-400'>1</span>
        <span>
          In your {fileLabel} file, type <code className='bg-content2 px-1 font-mono text-foreground'>{marker}</code> where
          the {what} should appear.
        </span>
      </li>
      <li className='flex gap-2'>
        <span className='font-mono text-default-400'>2</span>
        <span>Use Replace file. The {what} then shows up here so you can fill in a test value.</span>
      </li>
    </ol>
  </div>
)

// --- Images Section ---
interface ImagesSectionProps {
  /** "Word" or "Excel" — used in the empty state. */
  fileLabel?: string
  items: ImageItem[]
  onChange: (items: ImageItem[]) => void
  errors?: Record<string, string>
  onClearError?: (id: string) => void
}

interface ImageRowProps {
  item: ImageItem
  items: ImageItem[]
  onChange: (items: ImageItem[]) => void
  errors?: Record<string, string>
  onClearError?: (id: string) => void
}

const ImageRow: React.FC<ImageRowProps> = ({ item, items, onChange, errors, onClearError }) => {
  const [expanded, setExpanded] = useState(true)
  const hasSrc = !!item.data.src
  const configured = hasSrc

  const updateItem = (updates: Partial<ImageItem['data']>) => {
    onChange(items.map(i => (i.id === item.id ? { ...i, data: { ...i.data, ...updates } } : i)))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      updateItem({ src: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  return (
    <FieldRow id={item.id} className={rowShell(configured)}>
      {/* Header: name + status only. Size / fit live in the options row below. */}
      <div className={rowHeaderStrip(configured)}>
        <StatusDot filled={configured} />
        <ReadOnlyFieldName value={item.key} error={errors?.[item.id]} className='min-w-0 flex-1' />
        <div className='flex shrink-0 items-center gap-1'>
          {!hasSrc && (
            <span className={attentionChip} title='No image chosen yet'>
              <Icon icon='lucide:image-off' className='h-3 w-3' />
              No image
            </span>
          )}
          <ExpandToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} />
        </div>
      </div>

      {/* Expanded detail form — neutral bg (no amber bleed) */}
      {expanded && (
        <div className={detailPanel}>
          {/* Preview thumbnail */}
          <div className='relative flex h-28 w-full items-center justify-center overflow-hidden border border-dashed border-default-300 bg-content2 transition-colors hover:border-default-500'>
            {item.data.src ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={item.data.src}
                alt='Preview'
                className='h-full w-full'
                style={{ objectFit: (item.data.fit as any) || 'cover' }}
              />
            ) : (
              <div className='flex flex-col items-center gap-1 text-default-500'>
                <Icon icon='lucide:upload' className='h-5 w-5' />
                <span className='text-[13px]'>Upload image</span>
              </div>
            )}
            <label className='absolute inset-0 cursor-pointer'>
              <span className='sr-only'>Upload image</span>
              <input type='file' className='hidden' accept='image/*' onChange={handleFileUpload} />
            </label>
          </div>

          {/* URL + folder picker */}
          <Input
            label='Image URL'
            labelPlacement='outside'
            placeholder='https://...'
            value={item.data.src || ''}
            id={`input-${item.id}-src`}
            isInvalid={!!errors?.[`${item.id}-src`]}
            errorMessage={errors?.[`${item.id}-src`]}
            onValueChange={v => {
              updateItem({ src: v })
              onClearError?.(`${item.id}-src`)
            }}
            size='sm'
            variant='bordered'
            classNames={detailInputClasses}
            onKeyDown={handleEnterKey}
            startContent={<Icon icon='lucide:link' className='h-3.5 w-3.5 shrink-0 text-default-400' />}
            endContent={
              <label className='cursor-pointer text-default-500 hover:text-foreground' title='Choose a file'>
                <span className='sr-only'>Choose an image file</span>
                <Icon icon='lucide:folder-open' className='h-4 w-4' />
                <input type='file' className='hidden' accept='image/*' onChange={handleFileUpload} />
              </label>
            }
          />

          <div className='grid grid-cols-2 gap-2'>
            <Input
              type='number'
              label='Width (px)'
              labelPlacement='outside'
              placeholder='Auto'
              value={item.data.width === 0 ? '' : item.data.width?.toString() || ''}
              onValueChange={v => {
                handleNumChange(v, n => updateItem({ width: n }))
                onClearError?.(`${item.id}-width`)
              }}
              size='sm'
              variant='bordered'
              classNames={detailInputClasses}
              onKeyDown={handleEnterKey}
            />
            <Input
              type='number'
              label='Height (px)'
              labelPlacement='outside'
              placeholder='Auto'
              value={item.data.height === 0 ? '' : item.data.height?.toString() || ''}
              onValueChange={v => {
                handleNumChange(v, n => updateItem({ height: n }))
                onClearError?.(`${item.id}-height`)
              }}
              size='sm'
              variant='bordered'
              classNames={detailInputClasses}
              onKeyDown={handleEnterKey}
            />
          </div>
          <FitPicker
            value={(item.data.fit as ImageFit) || 'cover'}
            error={errors?.[`${item.id}-fit`]}
            onChange={fit => {
              updateItem({ fit })
              onClearError?.(`${item.id}-fit`)
            }}
          />
        </div>
      )}
    </FieldRow>
  )
}

export const ImagesSection: React.FC<ImagesSectionProps> = ({ items, onChange, errors, onClearError, fileLabel }) => {
  const [showMissingOnly, setShowMissingOnly] = useState(false)

  const jumpNext = () => {
    const next = items.find(i => !i.data.src)
    if (next) {
      const el = document.getElementById(`input-${next.id}`)
      if (el instanceof HTMLElement) {
        el.focus()
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const missing = items.filter(i => !i.data.src).length
  const visible = showMissingOnly ? items.filter(i => !i.data.src) : items

  return (
    <>
        {items.length > 0 ? (
          <>
            <SectionSummary
              total={items.length}
              missing={missing}
              missingLabel='no source'
              onJumpNext={jumpNext}
              showMissingOnly={showMissingOnly}
              onToggleMissingOnly={() => setShowMissingOnly(v => !v)}
            />
            <div className='flex flex-col gap-2'>
              {visible.map(item => (
                <ImageRow
                  key={item.id}
                  item={item}
                  items={items}
                  onChange={onChange}
                  errors={errors}
                  onClearError={onClearError}
                />
              ))}
            </div>
          </>
        ) : (
          <StepsEmptyState
            icon='lucide:image'
            title='No images in this file'
            marker='{{image:logo}}'
            what='image' fileLabel={fileLabel}
          />
        )}
      </>
  )
}
// --- QR Codes Section ---
interface QrCodesSectionProps {
  /** "Word" or "Excel" — used in the empty state. */
  fileLabel?: string
  items: QrCodeItem[]
  onChange: (items: QrCodeItem[]) => void
  errors?: Record<string, string>
  onClearError?: (id: string) => void
}

interface QrRowProps {
  item: QrCodeItem
  items: QrCodeItem[]
  onChange: (items: QrCodeItem[]) => void
  errors?: Record<string, string>
  onClearError?: (id: string) => void
}

const QrRow: React.FC<QrRowProps> = ({ item, items, onChange, errors, onClearError }) => {
  const [expanded, setExpanded] = useState(true)
  const configured = !!item.data.text

  const updateData = (patch: Partial<QrCodeDataRequest>) => {
    onChange(items.map(i => (i.id === item.id ? { ...i, data: { ...i.data, ...patch } } : i)))
  }

  return (
    <FieldRow id={item.id} className={rowShell(configured)}>
      <div className={rowHeaderStrip(configured)}>
        <StatusDot filled={configured} />
        <ReadOnlyFieldName value={item.key} error={errors?.[item.id]} className='min-w-0 flex-1' />
        <div className='flex shrink-0 items-center gap-1'>
          {!configured && (
            <span className={attentionChip} title='No value set'>
              <Icon icon='lucide:circle-dashed' className='h-3 w-3' />
              No value
            </span>
          )}
          <ExpandToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} />
        </div>
      </div>

      {/* Expanded detail form */}
      {expanded && (
        <div className={detailPanel}>
          <Input
            label='Value'
            labelPlacement='outside'
            placeholder='Type value...'
            value={item.data.text ?? ''}
            id={`input-${item.id}-text`}
            isInvalid={!!errors?.[`${item.id}-text`]}
            errorMessage={errors?.[`${item.id}-text`]}
            onValueChange={v => {
              updateData({ text: v })
              onClearError?.(`${item.id}-text`)
            }}
            size='sm'
            variant='bordered'
            classNames={detailInputClasses}
            onKeyDown={handleEnterKey}
          />

          <div className='grid grid-cols-2 gap-2'>
            <Input
              label='Size (px)'
              labelPlacement='outside'
              placeholder='200'
              type='number'
              value={item.data.size === 0 ? '' : item.data.size?.toString() || ''}
              onValueChange={v => {
                handleNumChange(v, val => updateData({ size: val }))
                onClearError?.(`${item.id}-size`)
              }}
              size='sm'
              variant='bordered'
              classNames={detailInputClasses}
              description='Rendered as square (1:1)'
              onKeyDown={handleEnterKey}
            />
            <Input
              label='Color'
              labelPlacement='outside'
              placeholder='#000000'
              value={item.data.color || '#000000'}
              onValueChange={v => {
                updateData({ color: v })
                onClearError?.(`${item.id}-color`)
              }}
              size='sm'
              variant='bordered'
              classNames={detailInputClasses}
              onKeyDown={handleEnterKey}
            />
          </div>
        </div>
      )}
    </FieldRow>
  )
}

export const QrCodesSection: React.FC<QrCodesSectionProps> = ({ items, onChange, errors, onClearError, fileLabel }) => {
  const [showMissingOnly, setShowMissingOnly] = useState(false)


  const jumpNext = () => {
    const next = items.find(i => !i.data.text)
    if (next) {
      const el = document.getElementById(`input-${next.id}`)
      if (el instanceof HTMLElement) {
        el.focus()
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const missing = items.filter(i => !i.data.text).length
  const visible = showMissingOnly ? items.filter(i => !i.data.text) : items

  return (
    <>
        {items.length > 0 ? (
          <>
            <SectionSummary
              total={items.length}
              missing={missing}
              missingLabel='no value'
              onJumpNext={jumpNext}
              showMissingOnly={showMissingOnly}
              onToggleMissingOnly={() => setShowMissingOnly(v => !v)}
            />
            <div className='flex flex-col gap-2'>
              {visible.map(item => (
                <QrRow
                  key={item.id}
                  item={item}
                  items={items}
                  onChange={onChange}
                  errors={errors}
                  onClearError={onClearError}
                />
              ))}
            </div>
          </>
        ) : (
          <StepsEmptyState icon='lucide:qr-code' title='No QR codes in this file' marker='{{qrcode:link}}' what='QR code' fileLabel={fileLabel} />
        )}
      </>
  )
}

// --- Barcodes Section ---
interface BarcodesSectionProps {
  /** "Word" or "Excel" — used in the empty state. */
  fileLabel?: string
  items: BarcodeItem[]
  onChange: (items: BarcodeItem[]) => void
  errors?: Record<string, string>
  onClearError?: (id: string) => void
}

interface BarcodeRowProps {
  item: BarcodeItem
  items: BarcodeItem[]
  onChange: (items: BarcodeItem[]) => void
  errors?: Record<string, string>
  onClearError?: (id: string) => void
}

const BarcodeRow: React.FC<BarcodeRowProps> = ({ item, items, onChange, errors, onClearError }) => {
  const [expanded, setExpanded] = useState(true)
  const configured = !!item.data.text

  const updateData = (patch: Partial<BarcodeDataRequest>) => {
    onChange(items.map(i => (i.id === item.id ? { ...i, data: { ...i.data, ...patch } } : i)))
  }

  return (
    <FieldRow id={item.id} className={rowShell(configured)}>
      <div className={rowHeaderStrip(configured)}>
        <StatusDot filled={configured} />
        <ReadOnlyFieldName value={item.key} error={errors?.[item.id]} className='min-w-0 flex-1' />
        <div className='flex shrink-0 items-center gap-1'>
          {!configured && (
            <span className={attentionChip} title='No value set'>
              <Icon icon='lucide:circle-dashed' className='h-3 w-3' />
              No value
            </span>
          )}
          <ExpandToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} />
        </div>
      </div>

      {/* Expanded detail form */}
      {expanded && (
        <div className={detailPanel}>
          <Input
            label='Value'
            labelPlacement='outside'
            placeholder='Type value...'
            value={item.data.text ?? ''}
            id={`input-${item.id}-text`}
            isInvalid={!!errors?.[`${item.id}-text`]}
            errorMessage={errors?.[`${item.id}-text`]}
            onValueChange={v => {
              updateData({ text: v })
              onClearError?.(`${item.id}-text`)
            }}
            size='sm'
            variant='bordered'
            classNames={detailInputClasses}
            onKeyDown={handleEnterKey}
          />

          <div className='grid grid-cols-2 gap-2'>
            <Select
              label='Format'
              labelPlacement='outside'
              selectedKeys={[item.data.format || 'Code128']}
              onChange={e => {
                updateData({ format: e.target.value as BarcodeDataRequest['format'] })
                onClearError?.(`${item.id}-format`)
              }}
              size='sm'
              variant='bordered'
              classNames={detailSelectClasses}>
              {['Code128', 'EAN13'].map(k => (
                <SelectItem key={k}>{k}</SelectItem>
              ))}
            </Select>
            <div className='flex items-end pb-1.5'>
              <Checkbox
                color='default'
                size='sm'
                isSelected={item.data.includeText}
                classNames={{ label: 'text-[12px] text-default-600' }}
                onValueChange={v => {
                  updateData({ includeText: v })
                  onClearError?.(`${item.id}-includeText`)
                }}>
                Show text under barcode
              </Checkbox>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-2'>
            <Input
              label='Width (px)'
              labelPlacement='outside'
              placeholder='200'
              type='number'
              value={item.data.width === 0 ? '' : item.data.width?.toString() || ''}
              onValueChange={v => handleNumChange(v, val => updateData({ width: val }))}
              size='sm'
              variant='bordered'
              classNames={detailInputClasses}
              onKeyDown={handleEnterKey}
            />
            <Input
              label='Height (px)'
              labelPlacement='outside'
              placeholder='50'
              type='number'
              value={item.data.height === 0 ? '' : item.data.height?.toString() || ''}
              onValueChange={v => handleNumChange(v, val => updateData({ height: val }))}
              size='sm'
              variant='bordered'
              classNames={detailInputClasses}
              onKeyDown={handleEnterKey}
            />
          </div>
        </div>
      )}
    </FieldRow>
  )
}

export const BarcodesSection: React.FC<BarcodesSectionProps> = ({ items, onChange, errors, onClearError, fileLabel }) => {
  const [showMissingOnly, setShowMissingOnly] = useState(false)


  const jumpNext = () => {
    const next = items.find(i => !i.data.text)
    if (next) {
      const el = document.getElementById(`input-${next.id}`)
      if (el instanceof HTMLElement) {
        el.focus()
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const missing = items.filter(i => !i.data.text).length
  const visible = showMissingOnly ? items.filter(i => !i.data.text) : items

  return (
    <>
        {items.length > 0 ? (
          <>
            <SectionSummary
              total={items.length}
              missing={missing}
              missingLabel='no value'
              onJumpNext={jumpNext}
              showMissingOnly={showMissingOnly}
              onToggleMissingOnly={() => setShowMissingOnly(v => !v)}
            />
            <div className='flex flex-col gap-2'>
              {visible.map(item => (
                <BarcodeRow
                  key={item.id}
                  item={item}
                  items={items}
                  onChange={onChange}
                  errors={errors}
                  onClearError={onClearError}
                />
              ))}
            </div>
          </>
        ) : (
          <StepsEmptyState icon='lucide:barcode' title='No barcodes in this file' marker='{{barcode:sku}}' what='barcode' fileLabel={fileLabel} />
        )}
      </>
  )
}

// --- Tables Section (Complex DnD) ---
interface TablesSectionProps {
  items: TableItem[]
  onChange: (items: TableItem[]) => void
  errors?: Record<string, string>
  onClearError?: (id: string) => void
}

const MARKERS = [
  {
    label: 'Structure & Counts',
    items: [
      { code: '{{group:field}}', desc: 'Header row' },
      { code: '{{table_count}}', desc: 'Total rows' },
      { code: '{{group_count}}', desc: 'Group rows' }
    ]
  },
  {
    label: 'Sums',
    items: [
      { code: '{{table_sum:field}}', desc: 'Grand total' },
      { code: '{{group_sum:field}}', desc: 'Group total' },
      { code: '{{row_sum:a,b}}', desc: 'Row total' }
    ]
  },
  {
    label: 'Averages',
    items: [
      { code: '{{table_avg:field}}', desc: 'Table avg' },
      { code: '{{group_avg:field}}', desc: 'Group avg' },
      { code: '{{row_avg:a,b}}', desc: 'Row avg' }
    ]
  }
]

const MarkersModal = ({ tableName }: { tableName: string }) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        title='Table markers you can use in Word'
        aria-label='Table markers you can use in Word'
        className={rowIconBtn}>
        <Icon icon='lucide:braces' className='h-4 w-4' />
      </button>
      <Modal isOpen={open} onOpenChange={setOpen} size='2xl' radius='none'>
        <ModalContent className='border border-divider bg-content1'>
          {() => (
            <>
              <ModalHeader className='flex flex-col gap-1'>
                <MonoLabel>{tableName}</MonoLabel>
                <span className='text-[16px] font-semibold'>Table markers</span>
              </ModalHeader>
              <ModalBody className='pb-6'>
                <p className='text-[13px] text-default-500'>
                  Type these markers in your Word table. They are filled in when the document is generated.
                </p>
                <div className='grid grid-cols-1 border-l border-t border-divider sm:grid-cols-3'>
                  {MARKERS.map(group => (
                    <div key={group.label} className='flex flex-col gap-3 border-b border-r border-divider p-3'>
                      <MonoLabel>{group.label}</MonoLabel>
                      {group.items.map(m => (
                        <div key={m.code} className='flex flex-col gap-1'>
                          <code className='w-fit bg-content2 px-1.5 py-0.5 font-mono text-[12px] text-foreground'>
                            {m.code}
                          </code>
                          <span className='text-[12px] text-default-500'>{m.desc}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}

/** Column name from the template's {{row:name}} marker — read-only. */
export const ColumnHeader: React.FC<{ col: string }> = ({ col }) => {
  const clean = col.replace(/^\{\{row:/, '').replace(/\}\}$/, '')
  return (
    <span className='block min-w-0 break-all px-1 py-1 font-mono text-[12px] font-medium text-foreground' title={clean}>
      {clean}
    </span>
  )
}

// TableEditorBody — the editable content (columns/rows/advanced).
// Header is handled by the parent row shell, not here.
const TableEditorBody = ({
  item,
  onUpdate,
  tableName,
  fullscreen = false,
  rowErrors
}: {
  item: TableItem
  onUpdate: (i: TableItem) => void
  tableName: string
  /** In the expanded view the grid uses the full height of the dialog. */
  fullscreen?: boolean
  /** Row index → message, from API validation errors. */
  rowErrors?: Record<number, string>
}) => {
  const [advancedKeys, setAdvancedKeys] = useState<Selection>(new Set())

  const addRow = () => onUpdate({ ...item, rows: [...item.rows, {}] })
  const updateRow = (idx: number, col: string, val: string) => {
    const newRows = [...item.rows]
    newRows[idx] = { ...newRows[idx], [col]: val }
    onUpdate({ ...item, rows: newRows })
  }
  const deleteRow = (idx: number) => {
    onUpdate({ ...item, rows: item.rows.filter((_, i) => i !== idx) })
  }

  return (
    <div className='flex w-full flex-col gap-3'>
      <div className='flex items-center justify-between gap-2'>
        <MonoLabel>
          {item.columns.length} {item.columns.length === 1 ? 'column' : 'columns'} · {item.rows.length}{' '}
          {item.rows.length === 1 ? 'row' : 'rows'}
        </MonoLabel>
        <MarkersModal tableName={tableName} />
      </div>
      {item.columns.length === 0 && (
        <p className='text-[13px] text-default-500'>
          This table has no columns. Put <code className='font-mono text-foreground'>{'{{row:name}}'}</code> markers in a
          table row of your file, then use Replace file.
        </p>
      )}

      {/* Table Grid */}
      <div
        className={cn(
          'overflow-auto border border-divider bg-content1',
          fullscreen ? 'max-h-[calc(100vh-240px)]' : 'max-h-80'
        )}>
        <div>
          <table className='w-full text-left text-sm'>
            <thead className='sticky top-0 z-10 border-b border-divider bg-content2'>
              <tr>
                {item.columns.map(col => (
                  <th key={col} className='min-w-[140px] border-l border-divider p-1.5 first:border-l-0'>
                    <ColumnHeader col={col} />
                  </th>
                ))}
                <th className='w-11 border-l border-divider p-2'>
                  <span className='sr-only'>Row actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {item.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  id={`table-${item.id}-row-${rIdx}`}
                  title={rowErrors?.[rIdx]}
                  className={cn(
                    'border-b border-divider hover:bg-content2',
                    rowErrors?.[rIdx] && 'bg-danger/10 outline outline-1 -outline-offset-1 outline-danger'
                  )}>
                  {item.columns.map(col => {
                    const cleanCol = col.replace(/^\{\{row:/, '').replace(/\}\}$/, '')
                    return (
                      <td key={col} className='min-w-[120px] border-l border-divider p-0 first:border-l-0'>
                        <input
                          aria-label={`Row ${rIdx + 1} ${cleanCol}`}
                          className='h-9 w-full bg-transparent px-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-default-400 focus:bg-content2 focus:shadow-[inset_0_0_0_1px_hsl(var(--heroui-default-500))]'
                          value={row[col] ?? ''}
                          placeholder={cleanCol}
                          onChange={e => updateRow(rIdx, col, e.target.value)}
                          onKeyDown={handleEnterKey}
                        />
                      </td>
                    )
                  })}
                  <td className='w-11 border-l border-divider p-0 text-center'>
                    <button
                      type='button'
                      data-skip-enter='true'
                      title='Remove row'
                      aria-label={`Remove row ${rIdx + 1}`}
                      onClick={() => deleteRow(rIdx)}
                      className='flex h-9 w-full items-center justify-center text-default-500 transition-colors hover:text-danger'>
                      <Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />
                    </button>
                  </td>
                </tr>
              ))}
              {item.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={item.columns.length + 1}
                    className='py-5 text-center text-[13px] text-default-500'>
                    No rows yet
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={item.columns.length + 1} className='p-1.5'>
                  <AddButton onPress={addRow} fullWidth>
                    Add row
                  </AddButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Repeat Header */}
      <CheckboxCard
        checked={item.repeatHeader ?? false}
        onChange={v => onUpdate({ ...item, repeatHeader: v })}
        icon='lucide:repeat'
        label='Repeat header on every page'
      />

      {/* Advanced Settings */}
      <Accordion
        selectedKeys={advancedKeys}
        onSelectionChange={setAdvancedKeys}
        variant='light'
        className='px-0'
        isCompact>
        <AccordionItem
          key='advanced'
          aria-label='Advanced Settings'
          title={
            <div className='flex items-center gap-2 text-[13px] font-medium text-default-500'>
              <Icon icon='lucide:settings-2' className='h-4 w-4' />
              More table options
            </div>
          }
          className='px-0'
          classNames={{ trigger: 'py-2', content: 'pt-1 pb-2' }}>
          <div className='flex flex-col gap-4 pt-1'>
            {/* Sort */}
            <div className='flex flex-col gap-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-1.5'>
                  <Icon icon='lucide:arrow-up-down' className='h-4 w-4 text-default-500' />
                  <MonoLabel>Sort rows</MonoLabel>
                </div>
                <AddButton
                  onPress={() =>
                    onUpdate({
                      ...item,
                      sort: [...(item.sort ?? []), { field: '', direction: '' }]
                    })
                  }>
                  Add sort
                </AddButton>
              </div>
              <div className='flex flex-col gap-2'>
                {!item.sort?.length && (
                  <p className='text-[13px] text-default-500'>Rows keep the order you enter them.</p>
                )}
                {(item.sort ?? []).map((rule, idx) => (
                  <div key={idx} className='flex items-center gap-2'>
                    <Select
                      aria-label='Sort Column'
                      placeholder='Column'
                      selectedKeys={rule.field ? [rule.field] : []}
                      onChange={e => {
                        const s = [...(item.sort ?? [])]
                        s[idx] = { ...s[idx], field: e.target.value }
                        onUpdate({ ...item, sort: s })
                      }}
                      size='sm'
                      variant='bordered'
                      className='flex-1'
                      classNames={rowSelectClasses}>
                      {item.columns.map(col => {
                        const clean = col.replace('{{row:', '').replace('}}', '')
                        return (
                          <SelectItem key={clean} textValue={clean}>
                            {clean}
                          </SelectItem>
                        )
                      })}
                    </Select>
                    <Select
                      aria-label='Sort Order'
                      placeholder='Order'
                      selectedKeys={rule.direction ? [rule.direction] : []}
                      onChange={e => {
                        const s = [...(item.sort ?? [])]
                        s[idx] = { ...s[idx], direction: e.target.value }
                        onUpdate({ ...item, sort: s })
                      }}
                      size='sm'
                      variant='bordered'
                      className='w-32'
                      classNames={rowSelectClasses}>
                      <SelectItem key='asc' textValue='Ascending'>
                        Ascending
                      </SelectItem>
                      <SelectItem key='desc' textValue='Descending'>
                        Descending
                      </SelectItem>
                    </Select>
                    <button
                      type='button'
                      title='Remove sort'
                      aria-label='Remove sort'
                      onClick={() => onUpdate({ ...item, sort: (item.sort ?? []).filter((_, i) => i !== idx) })}
                      className={rowDeleteBtn}>
                      <Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Vertical Merge & Collapse */}
            <div className='flex flex-col gap-3 border-t border-divider pt-4'>
              <div className='flex items-center gap-1.5'>
                <Icon icon='lucide:network' className='h-4 w-4 text-default-500' />
                <MonoLabel>Merge & group</MonoLabel>
              </div>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <Select
                  label='Merge same values'
                  placeholder='Choose columns'
                  selectionMode='multiple'
                  selectedKeys={new Set(item.verticalMerge || [])}
                  onSelectionChange={keys => onUpdate({ ...item, verticalMerge: Array.from(keys) as string[] })}
                  size='sm'
                  variant='bordered'
                  isMultiline
                  renderValue={vals => (
                    <div className='flex flex-wrap gap-1 py-0.5'>
                      {vals.map(v => (
                        <BrandChip key={v.key} tone='neutral' size='xs'>
                          {v.textValue}
                        </BrandChip>
                      ))}
                    </div>
                  )}
                  classNames={rowSelectClasses}>
                  {item.columns.map(col => {
                    const clean = col.replace('{{row:', '').replace('}}', '')
                    return (
                      <SelectItem key={clean} textValue={clean}>
                        {clean}
                      </SelectItem>
                    )
                  })}
                </Select>
                <Select
                  label='Group rows by'
                  placeholder='Choose columns'
                  selectionMode='multiple'
                  selectedKeys={new Set(item.collapse || [])}
                  onSelectionChange={keys => onUpdate({ ...item, collapse: Array.from(keys) as string[] })}
                  size='sm'
                  variant='bordered'
                  isMultiline
                  renderValue={vals => (
                    <div className='flex flex-wrap gap-1 py-0.5'>
                      {vals.map(v => (
                        <BrandChip key={v.key} tone='neutral' size='xs'>
                          {v.textValue}
                        </BrandChip>
                      ))}
                    </div>
                  )}
                  classNames={rowSelectClasses}>
                  {item.columns.map(col => {
                    const clean = col.replace('{{row:', '').replace('}}', '')
                    return (
                      <SelectItem key={clean} textValue={clean}>
                        {clean}
                      </SelectItem>
                    )
                  })}
                </Select>
              </div>
            </div>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

interface TableRowProps {
  item: TableItem
  index: number
  items: TableItem[]
  onChange: (items: TableItem[]) => void
  errors?: Record<string, string>
}

/** Structure = the table has columns. Test data = it has rows and no empty cells. */
export const tableReadiness = (t: { columns: string[]; rows: Record<string, string>[] }) => {
  const cells = t.rows.length * t.columns.length
  const emptyCells = t.rows.reduce(
    (n, row) => n + t.columns.filter(c => !row[c] || row[c] === 'null').length,
    0
  )
  return {
    structureOk: t.columns.length > 0,
    dataFilled: t.columns.length > 0 && t.rows.length > 0 && emptyCells === 0,
    emptyCells,
    cells
  }
}

/** Row index → message for this table, from errors keyed `${tableId}-row-${n}`. */
const rowErrorsFor = (tableId: string, errors?: Record<string, string>) => {
  const out: Record<number, string> = {}
  if (!errors) return out
  const prefix = `${tableId}-row-`
  Object.entries(errors).forEach(([k, v]) => {
    if (k.startsWith(prefix)) out[Number(k.slice(prefix.length))] = v
  })
  return out
}

const TableRow: React.FC<TableRowProps> = ({ item, index, items, onChange, errors }) => {
  const [expanded, setExpanded] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const readiness = tableReadiness(item)
  const tableName = `Table ${index + 1}`
  const rowErrors = rowErrorsFor(item.id, errors)
  const tableError = errors?.[item.id]

  const onUpdate = (u: TableItem) => onChange(items.map(x => (x.id === item.id ? u : x)))

  const colCount = item.columns.length
  const rowCount = item.rows.length
  const columnNames = item.columns.map(c => c.replace(/^\{\{row:/, '').replace(/\}\}$/, '')).join(', ')

  const dataLabel =
    rowCount === 0
      ? 'No test rows'
      : readiness.emptyCells > 0
        ? `${readiness.emptyCells} empty ${readiness.emptyCells === 1 ? 'cell' : 'cells'}`
        : 'Test data filled'

  return (
    <FieldRow id={item.id} className={rowShell(readiness.dataFilled)}>
      <div className={rowHeaderStrip(readiness.dataFilled)}>
        <StatusDot filled={readiness.dataFilled} />
        <span className='min-w-0 flex-1 truncate text-[13px] text-foreground' title={columnNames || tableName}>
          <span className='font-medium'>{tableName}</span>
          {columnNames && <span className='ml-2 font-mono text-[12px] text-default-500'>{columnNames}</span>}
        </span>
        <div className='flex shrink-0 items-center gap-1'>
          <span className={readiness.structureOk ? rowSummaryChip.replace('hidden sm:flex', 'flex') : attentionChip}>
            <Icon icon='lucide:columns-3' className='h-3 w-3' />
            {readiness.structureOk ? `${colCount} ${colCount === 1 ? 'column' : 'columns'}` : 'No columns'}
          </span>
          <span className={readiness.dataFilled ? rowSummaryChip.replace('hidden sm:flex', 'flex') : attentionChip}>
            <Icon icon='lucide:rows-3' className='h-3 w-3' />
            {dataLabel}
          </span>
          <button
            type='button'
            data-skip-enter='true'
            onClick={() => setFullscreen(true)}
            title='Open the table in a large view'
            aria-label={`Expand ${tableName}`}
            className={rowIconBtn}>
            <Icon icon='lucide:maximize-2' className='h-4 w-4' />
          </button>
          <ExpandToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} />
        </div>
      </div>
      {tableError && <p className='px-2 pb-2 text-[12px] text-danger'>{tableError}</p>}

      {expanded && !fullscreen && (
        <div className='border-t border-divider p-4'>
          <TableEditorBody item={item} onUpdate={onUpdate} tableName={tableName} rowErrors={rowErrors} />
        </div>
      )}

      <Modal isOpen={fullscreen} onOpenChange={setFullscreen} size='full' radius='none' scrollBehavior='inside'>
        <ModalContent className='border border-divider bg-content1'>
          {() => (
            <>
              <ModalHeader className='flex items-center gap-3 border-b border-divider'>
                <span className='text-[14px] font-medium text-foreground'>{tableName}</span>
                <span className='text-[13px] font-normal text-default-500'>{dataLabel}</span>
              </ModalHeader>
              <ModalBody className='py-4'>
                <TableEditorBody item={item} onUpdate={onUpdate} tableName={tableName} fullscreen rowErrors={rowErrors} />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </FieldRow>
  )
}

export const TablesSection: React.FC<TablesSectionProps> = ({ items, onChange, errors }) => {
  const [showMissingOnly, setShowMissingOnly] = useState(false)

  const isMissing = (t: TableItem) => !tableReadiness(t).dataFilled
  const missing = items.filter(isMissing).length
  const noStructure = items.filter(t => !tableReadiness(t).structureOk).length
  const visible = showMissingOnly ? items.filter(isMissing) : items

  return (
    <>
      {items.length > 0 ? (
        <>
          <SummaryBar
            left={
              noStructure > 0
                ? `${items.length - noStructure}/${items.length} with columns`
                : `${items.length - missing}/${items.length} with test data`
            }
            missing={missing}
            missingLabel='need test data'
            doneLabel='All tables have test data'
            showMissingOnly={showMissingOnly}
            onToggleMissingOnly={() => setShowMissingOnly(v => !v)}
          />
          <div className='flex flex-col gap-2'>
            {visible.map(item => {
              const idx = items.findIndex(x => x.id === item.id)
              return <TableRow key={item.id} item={item} index={idx} items={items} onChange={onChange} errors={errors} />
            })}
          </div>
        </>
      ) : (
        <StepsEmptyState icon='lucide:table' title='No tables in this file' marker='{{row:item}}' what='table' />
      )}
    </>
  )
}

export interface FileSettingsSectionProps {
  fileName?: string
  pdfPassword?: PdfPasswordRequest
  watermark?: PdfWatermarkRequest
  zipOutput?: boolean
  fonts?: FontSummaryDto[]
  showPdfOptions?: boolean
  onChange: (updates: {
    fileName?: string
    pdfPassword?: PdfPasswordRequest
    watermark?: PdfWatermarkRequest
    zipOutput?: boolean
  }) => void
  /**
   * Gate Pro-only switches behind an upgrade modal.
   * Return `true` to allow the toggle to proceed, `false` to abort.
   * If omitted, all switches behave as enabled.
   */
  requireFeature?: (key: 'pdfPasswordProtection' | 'pdfWatermark' | 'downloadAsZip') => boolean
}

const POSITION_X_OPTIONS = ['left', 'center', 'right']
const POSITION_Y_OPTIONS = ['top', 'middle', 'bottom']
const FALLBACK_FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Tahoma']

// Strip trailing style suffix so legacy rows (e.g. "SarabunBold") group under the same
// family as "Sarabun". Longest suffix wins so "BoldItalic" is matched before "Bold".
const FONT_STYLE_SUFFIXES = [
  'ExtraLightItalic',
  'ExtraBoldItalic',
  'SemiBoldItalic',
  'MediumItalic',
  'ThinItalic',
  'LightItalic',
  'BoldItalic',
  'BlackItalic',
  'ExtraLight',
  'ExtraBold',
  'SemiBold',
  'Medium',
  'Regular',
  'Italic',
  'Thin',
  'Light',
  'Bold',
  'Black'
]

const normalizeFamilyName = (raw: string): string => {
  if (!raw) return raw
  for (const suffix of FONT_STYLE_SUFFIXES) {
    if (raw.endsWith(suffix) && raw.length > suffix.length) {
      return raw.slice(0, raw.length - suffix.length).trim()
    }
    const spaced = ` ${suffix}`
    if (raw.endsWith(spaced) && raw.length > spaced.length) {
      return raw.slice(0, raw.length - spaced.length).trim()
    }
  }
  return raw
}

/**
 * Derive a correct variant label even when the DB row has a legacy/incorrect subFamilyName.
 * Checks font.name, then font.familyName for a trailing style suffix.
 */
const deriveVariantLabel = (font: FontSummaryDto): string => {
  for (const source of [font.name, font.familyName]) {
    if (!source) continue
    for (const suffix of FONT_STYLE_SUFFIXES) {
      if (source.endsWith(suffix) && source.length > suffix.length) return suffix
      const spaced = ` ${suffix}`
      if (source.endsWith(spaced) && source.length > spaced.length) return suffix
    }
  }
  return font.subFamilyName || 'Regular'
}

const WEIGHT_LABELS: Record<string, number> = {
  thin: 100,
  extralight: 200,
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
  heavy: 900
}

/**
 * Legacy DB rows may have weight=400/isItalic=false for all variants.
 * Derive the real values from the font name (via deriveVariantLabel).
 */
const inferFontWeight = (font: FontSummaryDto): number => {
  const label =
    deriveVariantLabel(font)
      .toLowerCase()
      .replace(/italic|oblique/g, '')
      .trim() || 'regular'
  return WEIGHT_LABELS[label] ?? Number(font.weight) ?? 400
}

const inferFontItalic = (font: FontSummaryDto): boolean =>
  /italic|oblique/i.test(deriveVariantLabel(font)) || font.isItalic

export const FileSettingsSection: React.FC<FileSettingsSectionProps> = ({
  requireFeature,
  fileName,
  pdfPassword,
  watermark,
  zipOutput,
  fonts,
  showPdfOptions = true,
  onChange
}) => {
  const fontFamilies = React.useMemo(() => {
    if (fonts && fonts.length > 0) {
      const families = [
        ...new Set(fonts.map(f => normalizeFamilyName(f.familyName)).filter(Boolean))
      ].sort() as string[]
      return families
    }
    return FALLBACK_FONTS
  }, [fonts])

  const hasFontData = !!(fonts && fonts.length > 0)

  const currentFont = React.useMemo(() => {
    if (!fonts?.length || !watermark?.fontFamily) return null
    return fonts.find(f => f.name === watermark.fontFamily) ?? null
  }, [fonts, watermark?.fontFamily])

  const currentFamily =
    (currentFont ? normalizeFamilyName(currentFont.familyName) : null) ?? (hasFontData ? fontFamilies[0] ?? null : null)

  const familyVariants = React.useMemo(() => {
    if (!fonts?.length || !currentFamily) return []

    // Dedupe by (weight, italic) — legacy rows may collide on 400:false if parser was buggy
    const seen = new Set<string>()
    const deduped: (FontSummaryDto & { _weight: number; _italic: boolean })[] = []

    for (const f of fonts.filter(f => normalizeFamilyName(f.familyName) === currentFamily)) {
      const w = inferFontWeight(f)
      const i = inferFontItalic(f)
      const key = `${w}:${i ? 1 : 0}`
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push({ ...f, _weight: w, _italic: i })
    }

    // Sort by weight ascending, upright before italic within the same weight
    return deduped.sort((a, b) =>
      a._weight !== b._weight ? a._weight - b._weight : Number(a._italic) - Number(b._italic)
    )
  }, [fonts, currentFamily])

  const passwordEnabled = !!pdfPassword
  const watermarkEnabled = !!watermark

  const [pagesRaw, setPagesRaw] = useState(() => watermark?.pages?.join(', ') ?? '')

  React.useEffect(() => {
    if (!watermark) setPagesRaw('')
  }, [watermark])

  const updatePassword = (updates: Partial<PdfPasswordRequest>) => {
    onChange({ pdfPassword: { ...(pdfPassword || {}), ...updates } })
  }

  const updateWatermark = (updates: Partial<PdfWatermarkRequest>) => {
    onChange({ watermark: { ...(watermark || {}), ...updates } })
  }

  const parsePagesInput = (val: string): number[] | undefined => {
    const nums = val
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n))
    return nums.length > 0 ? nums : undefined
  }

  return (
    <div className='flex flex-col gap-3'>
      {/* Output File Name */}
      <div className={settingsCard}>
        <div className='flex items-center gap-2'>
          <Icon icon='lucide:file-output' className='h-4 w-4 text-default-500' aria-hidden />
          <span className='text-[14px] font-semibold text-foreground'>File name</span>
        </div>
        <Input
          aria-label='Output file name'
          placeholder='My_Generated_Report'
          description='Used when the file is downloaded. The extension is added for you.'
          value={fileName ?? ''}
          onValueChange={v => onChange({ fileName: v })}
          variant='bordered'
          classNames={fieldClasses}
          size='sm'
        />
      </div>

      {showPdfOptions && (
        <>
          {/* Password Section */}
          <div className={settingsCard}>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Icon icon='lucide:lock' className='h-4 w-4 text-default-500' />
                <span className='text-[14px] font-semibold text-foreground'>Password-protect PDF</span>
              </div>
              <Switch
                color='default'
                aria-label='Password-protect PDF'
                size='sm'
                isSelected={passwordEnabled}
                onValueChange={v => {
                  if (v && requireFeature && !requireFeature('pdfPasswordProtection')) return
                  onChange({ pdfPassword: v ? {} : undefined })
                }}
              />
            </div>

            {passwordEnabled && (
              <div className='flex flex-col gap-4'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <Input
                    label='Open password'
                    description='Required to open the file'
                    placeholder='Optional'
                    value={pdfPassword?.userPassword || ''}
                    onChange={e => updatePassword({ userPassword: e.target.value || undefined })}
                    labelPlacement='outside'
                    variant='bordered'
                    classNames={fieldClasses}
                    type='text'
                  />
                  <Input
                    label='Permissions password'
                    description='Required to change restrictions'
                    placeholder='Optional'
                    value={pdfPassword?.ownerPassword || ''}
                    onChange={e => updatePassword({ ownerPassword: e.target.value || undefined })}
                    labelPlacement='outside'
                    variant='bordered'
                    classNames={fieldClasses}
                    type='text'
                  />
                </div>
                <div className='flex flex-col gap-2'>
                  <MonoLabel>Restrictions</MonoLabel>
                  <div className='flex flex-wrap gap-4'>
                    <Checkbox
                      color='default'
                      isSelected={pdfPassword?.restrictPrinting ?? false}
                      onValueChange={v => updatePassword({ restrictPrinting: v })}
                      size='sm'>
                      <span className='text-[14px] text-foreground'>Restrict Printing</span>
                    </Checkbox>
                    <Checkbox
                      color='default'
                      isSelected={pdfPassword?.restrictCopying ?? false}
                      onValueChange={v => updatePassword({ restrictCopying: v })}
                      size='sm'>
                      <span className='text-[14px] text-foreground'>Restrict Copying</span>
                    </Checkbox>
                    <Checkbox
                      color='default'
                      isSelected={pdfPassword?.restrictModifying ?? false}
                      onValueChange={v => updatePassword({ restrictModifying: v })}
                      size='sm'>
                      <span className='text-[14px] text-foreground'>Restrict Modifying</span>
                    </Checkbox>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Watermark Section */}
          <div className={settingsCard}>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Icon icon='lucide:droplets' className='h-4 w-4 text-default-500' />
                <span className='text-[14px] font-semibold text-foreground'>Watermark</span>
              </div>
              <Switch
                color='default'
                aria-label='Add watermark'
                size='sm'
                isSelected={watermarkEnabled}
                onValueChange={v => {
                  if (!v) {
                    onChange({ watermark: undefined })
                    return
                  }
                  if (requireFeature && !requireFeature('pdfWatermark')) return
                  const defaultFamily = hasFontData ? fontFamilies[0] : undefined
                  const variants =
                    defaultFamily && fonts ? fonts.filter(f => normalizeFamilyName(f.familyName) === defaultFamily) : []
                  const preferred = variants.find(f => /^regular$/i.test(deriveVariantLabel(f))) ?? variants[0]
                  onChange({
                    watermark: {
                      text: 'CONFIDENTIAL',
                      opacity: 0.3,
                      rotation: -45,
                      positionX: 'center',
                      positionY: 'middle',
                      fontFamily: defaultFamily ?? 'Arial',
                      fontWeight: preferred ? inferFontWeight(preferred) : 400,
                      fontItalic: preferred ? inferFontItalic(preferred) : false
                    } as PdfWatermarkRequest
                  })
                }}
              />
            </div>

            {watermarkEnabled && (
              <div className='flex flex-col gap-4'>
                {/* Text + Font */}
                {hasFontData ? (
                  <>
                    <Input
                      label='Text'
                      placeholder='e.g. CONFIDENTIAL'
                      value={watermark?.text || ''}
                      onChange={e => updateWatermark({ text: e.target.value })}
                      labelPlacement='outside'
                      variant='bordered'
                      classNames={fieldClasses}
                      size='sm'
                    />
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                      <Select
                        label='Font'
                        selectedKeys={currentFamily ? [currentFamily] : []}
                        onChange={e => {
                          const family = e.target.value
                          const variants = fonts!.filter(f => normalizeFamilyName(f.familyName) === family)
                          const preferred = variants.find(f => /^regular$/i.test(deriveVariantLabel(f))) ?? variants[0]
                          if (preferred) {
                            updateWatermark({
                              fontFamily: family,
                              fontWeight: inferFontWeight(preferred),
                              fontItalic: inferFontItalic(preferred)
                            } as Partial<PdfWatermarkRequest>)
                          }
                        }}
                        labelPlacement='outside'
                        variant='bordered'
                        size='sm'
                        classNames={selectClasses}>
                        {fontFamilies.map(f => (
                          <SelectItem key={f}>{f}</SelectItem>
                        ))}
                      </Select>
                      <Select
                        label='Style'
                        selectedKeys={(() => {
                          const w = Number(watermark?.fontWeight ?? 400)
                          const i = watermark?.fontItalic ? 1 : 0
                          const key = `${w}:${i}`
                          const match = familyVariants.find(v => `${v._weight}:${v._italic ? 1 : 0}` === key)
                          if (match) return [key]
                          return familyVariants.length > 0
                            ? [`${familyVariants[0]._weight}:${familyVariants[0]._italic ? 1 : 0}`]
                            : []
                        })()}
                        onChange={e => {
                          const [w, i] = e.target.value.split(':')
                          updateWatermark({
                            fontWeight: Number(w),
                            fontItalic: i === '1'
                          } as Partial<PdfWatermarkRequest>)
                        }}
                        labelPlacement='outside'
                        variant='bordered'
                        size='sm'
                        classNames={selectClasses}
                        renderValue={items => {
                          const sel = items[0]
                          if (!sel) return null
                          const [w, i] = String(sel.key).split(':')
                          const font = familyVariants.find(v => v._weight === Number(w) && v._italic === (i === '1'))
                          const label = font ? deriveVariantLabel(font) : sel.textValue ?? ''
                          return <span>{label}</span>
                        }}>
                        {familyVariants.map(v => {
                          const label = deriveVariantLabel(v)
                          const key = `${v._weight}:${v._italic ? 1 : 0}`
                          return (
                            <SelectItem key={key} textValue={label}>
                              {label}
                            </SelectItem>
                          )
                        })}
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <Input
                      label='Text'
                      placeholder='e.g. CONFIDENTIAL'
                      value={watermark?.text || ''}
                      onChange={e => updateWatermark({ text: e.target.value })}
                      labelPlacement='outside'
                      variant='bordered'
                      classNames={fieldClasses}
                      size='sm'
                    />
                    <Select
                      label='Font'
                      selectedKeys={watermark?.fontFamily ? [watermark.fontFamily] : [fontFamilies[0] ?? 'Arial']}
                      onChange={e => updateWatermark({ fontFamily: e.target.value })}
                      labelPlacement='outside'
                      variant='bordered'
                      size='sm'
                      classNames={selectClasses}>
                      {fontFamilies.map(f => (
                        <SelectItem key={f}>{f}</SelectItem>
                      ))}
                    </Select>
                  </div>
                )}

                {/* Font Size + Color */}
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <Input
                    label='Size'
                    type='number'
                    placeholder='48'
                    value={watermark?.fontSize?.toString() || ''}
                    onChange={e => updateWatermark({ fontSize: e.target.value ? Number(e.target.value) : undefined })}
                    labelPlacement='outside'
                    variant='bordered'
                    classNames={fieldClasses}
                    size='sm'
                  />
                  <Input
                    label='Color'
                    type='color'
                    value={watermark?.color || '#000000'}
                    onChange={e => updateWatermark({ color: e.target.value })}
                    labelPlacement='outside'
                    variant='bordered'
                    classNames={fieldClasses}
                    size='sm'
                  />
                </div>

                {/* Opacity & Rotation */}
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='flex flex-col gap-1'>
                    <span className='text-[13px] font-medium text-default-500'>
                      Opacity: {Math.round((Number(watermark?.opacity) || 0.3) * 100)}%
                    </span>
                    <Slider
                      minValue={0}
                      maxValue={1}
                      step={0.05}
                      value={Number(watermark?.opacity) || 0.3}
                      onChange={v => updateWatermark({ opacity: v as number })}
                      size='sm'
                      color='foreground'
                    />
                  </div>
                  <Input
                    label='Rotation (°)'
                    type='number'
                    placeholder='-45'
                    value={watermark?.rotation?.toString() || ''}
                    onChange={e => updateWatermark({ rotation: e.target.value ? Number(e.target.value) : undefined })}
                    labelPlacement='outside'
                    variant='bordered'
                    classNames={fieldClasses}
                    size='sm'
                  />
                </div>

                {/* Position */}
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <Select
                    label='Horizontal'
                    selectedKeys={watermark?.positionX ? [watermark.positionX] : ['center']}
                    onChange={e => updateWatermark({ positionX: e.target.value })}
                    labelPlacement='outside'
                    variant='bordered'
                    size='sm'
                    classNames={selectClasses}>
                    {POSITION_X_OPTIONS.map(p => (
                      <SelectItem key={p}>{p}</SelectItem>
                    ))}
                  </Select>
                  <Select
                    label='Vertical'
                    selectedKeys={watermark?.positionY ? [watermark.positionY] : ['middle']}
                    onChange={e => updateWatermark({ positionY: e.target.value })}
                    labelPlacement='outside'
                    variant='bordered'
                    size='sm'
                    classNames={selectClasses}>
                    {POSITION_Y_OPTIONS.map(p => (
                      <SelectItem key={p}>{p}</SelectItem>
                    ))}
                  </Select>
                </div>

                {/* Pages */}
                <Input
                  label='Pages (optional)'
                  description='Page numbers separated by commas, e.g. 1, 2, 3'
                  placeholder='All pages'
                  value={pagesRaw}
                  onChange={e => {
                    setPagesRaw(e.target.value)
                    updateWatermark({ pages: parsePagesInput(e.target.value) })
                  }}
                  onBlur={() => {
                    const parsed = parsePagesInput(pagesRaw)
                    setPagesRaw(parsed ? parsed.join(', ') : '')
                  }}
                  labelPlacement='outside'
                  variant='bordered'
                  classNames={fieldClasses}
                  size='sm'
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* ZIP Output */}
      <div className={settingsCard}>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <p className='text-[14px] font-semibold text-foreground'>Download as ZIP</p>
            <p className='mt-0.5 text-[13px] text-default-500'>
              Put the generated file inside a <code className='font-mono'>.zip</code> archive.
            </p>
          </div>
          <Switch
                color='default'
                aria-label='Download as ZIP'
            isSelected={!!zipOutput}
            onValueChange={v => {
              if (v && requireFeature && !requireFeature('downloadAsZip')) return
              onChange({ zipOutput: v })
            }}
            size='sm'
          />
        </div>
      </div>
    </div>
  )
}
