import React, { useState } from 'react'
import {
  Button,
  Input,
  Checkbox,
  Select,
  SelectItem,
  cn,
  Accordion,
  AccordionItem,
  Chip,
  Selection,
  Slider,
  Switch,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody
} from '@heroui/react'
import Icon from '@/components/icon'
import {
  ImageDataRequest,
  QrCodeDataRequest,
  BarcodeDataRequest,
  SortDefinition,
  PdfWatermarkRequest,
  PdfPasswordRequest,
  FontSummaryDto
} from '@/api/generated/main-service/apiGenerated'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { classNames } from '@react-pdf-viewer/core'

// --- Types for UI State (Array-based for DnD) ---
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

// --- Sortable Item Context & Components ---
export const SortableItemContext = React.createContext<{
  attributes: any
  listeners: any
  isDragging: boolean
} | null>(null)

const DragHandle = ({ className }: { className?: string }) => {
  const context = React.useContext(SortableItemContext)
  if (!context) return null
  const { attributes, listeners } = context
  return (
    <div
      {...attributes}
      {...listeners}
      className={cn('cursor-grab text-default-400 hover:text-default-600 active:cursor-grabbing', className)}>
      <Icon icon='lucide:grip-vertical' className='h-4 w-4' />
    </div>
  )
}

// --- Sortable Item Wrapper ---
interface SortableItemProps {
  id: string
  children: React.ReactNode
  className?: string
}

const SortableItem = ({ id, children, className }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
    position: 'relative' as const,
    touchAction: 'none'
  }

  return (
    <div ref={setNodeRef} style={style} className={cn(className, isDragging && 'ring-2 ring-primary ring-opacity-50')}>
      <SortableItemContext.Provider value={{ attributes, listeners, isDragging }}>
        {children}
      </SortableItemContext.Provider>
    </div>
  )
}

// --- Horizontal Sortable Item (Table Headers) ---
const SortableHeaderItem = ({ id, children, className }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }
  return (
    <th ref={setNodeRef} style={style} className={cn(className, 'group relative min-w-[120px]')}>
      <div className='flex items-center justify-between gap-1'>
        <div
          {...attributes}
          {...listeners}
          className='cursor-grab text-default-400 hover:text-default-600 active:cursor-grabbing'>
          <Icon icon='lucide:grip-vertical' className='h-3 w-3' />
        </div>
        {children}
      </div>
    </th>
  )
}

// --- Replaces Section ---
interface ReplacementsSectionProps {
  items: ReplaceItem[]
  onChange: (items: ReplaceItem[]) => void
  errors?: Record<string, string>
  onClearError?: (id: string) => void
}

export const ReplacementsSection: React.FC<ReplacementsSectionProps> = ({ items, onChange, errors, onClearError }) => {
  const [showEmptyOnly, setShowEmptyOnly] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const jumpToNextEmpty = () => {
    const nextEmpty = items.find(i => !i.value || i.value === 'null')
    if (nextEmpty) {
      const el = document.getElementById(`input-${nextEmpty.id}`)
      if (el instanceof HTMLElement) {
        el.focus()
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id)
      const newIndex = items.findIndex(i => i.id === over.id)
      onChange(arrayMove(items, oldIndex, newIndex))
    }
  }

  const updateItem = (id: string, field: 'key' | 'value', val: string) => {
    onChange(items.map(item => (item.id === id ? { ...item, [field]: val } : item)))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
        {items.length > 0 ? (
          <>
            {/* Summary — total · interactive filter/jump */}
            {(() => {
              const emptyCount = items.filter(i => !i.value || i.value === 'null').length
              const filledCount = items.length - emptyCount
              const pct = Math.round((filledCount / items.length) * 100)
              return (
                <div className='mb-2.5 flex items-center justify-between gap-2 px-1'>
                  <div className='flex items-center gap-2 text-[11px] font-semibold'>
                    <span className='text-default-600'>
                      {filledCount}/{items.length} filled
                    </span>
                    <span className='text-default-400/40'>·</span>
                    {emptyCount > 0 ? (
                      <button
                        type='button'
                        onClick={() => setShowEmptyOnly(v => !v)}
                        className={cn(
                          'flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors duration-200',
                          showEmptyOnly
                            ? 'builder-attention-chip'
                            : 'builder-attention-text hover:bg-[var(--builder-attention-chip-bg)]'
                        )}
                        title={showEmptyOnly ? 'Show all' : 'Filter empty only'}>
                        <span className='builder-attention-dot h-1.5 w-1.5 rounded-full' />
                        {emptyCount} empty
                        {showEmptyOnly && <Icon icon='lucide:x' className='h-3 w-3' />}
                      </button>
                    ) : (
                      <span className='flex items-center gap-1 text-primary'>
                        <Icon icon='lucide:check' className='h-3 w-3' />
                        All filled
                      </span>
                    )}
                  </div>
                  {emptyCount > 0 && (
                    <button
                      type='button'
                      onClick={jumpToNextEmpty}
                      className='flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold text-default-500 transition-colors duration-200 hover:bg-content2 hover:text-foreground'
                      title='Focus next empty variable'>
                      Next empty
                      <Icon icon='lucide:arrow-down' className='h-3 w-3' />
                    </button>
                  )}
                </div>
              )
            })()}
            <div className='flex flex-col gap-0.5'>
              {items
                .filter(item => !showEmptyOnly || !item.value || item.value === 'null')
                .map(item => {
                  const hasValue = !!item.value && item.value !== 'null'
                  const rawKey = item.key.replace(/[{}]/g, '').trim() || 'variable'
                  const tokenPlaceholder = `{{${rawKey}}}`
                  return (
                    <SortableItem
                      key={item.id}
                      id={item.id}
                      className={cn(
                        'group flex items-center gap-1.5 rounded-lg border-l-[3px] px-1.5 py-1 transition-colors duration-200',
                        // Filled = complete (brand-tint). Empty = neutral gray (clearly distinct).
                        hasValue
                          ? 'builder-complete-row hover:bg-content2/60'
                          : 'builder-empty-row border-l-transparent'
                      )}>
                      <DragHandle className='shrink-0 text-default-400/70 transition-colors duration-200 hover:text-default-700' />

                      <Input
                        value={item.key}
                        id={`input-${item.id}`}
                        isInvalid={!!errors?.[item.id]}
                        errorMessage={errors?.[item.id]}
                        variant='flat'
                        placeholder='{{mapping_key}}'
                        size='sm'
                        classNames={{
                          inputWrapper:
                            'builder-field border h-8 min-h-0 px-2.5 rounded-md transition-all duration-200',
                          input: 'var-token-text placeholder:text-default-500/40'
                        }}
                        onValueChange={v => {
                          updateItem(item.id, 'key', v)
                          onClearError?.(item.id)
                        }}
                        onBlur={() => updateItem(item.id, 'key', formatKey(item.key, 'replace'))}
                        onKeyDown={handleEnterKey}
                        className='w-[180px] shrink-0'
                      />

                      <Input
                        value={item.value === 'null' ? '' : item.value ?? ''}
                        placeholder={hasValue ? tokenPlaceholder : 'Type value...'}
                        onValueChange={v => {
                          updateItem(item.id, 'value', v)
                          onClearError?.(item.id)
                        }}
                        variant='flat'
                        size='sm'
                        classNames={{
                          inputWrapper:
                            'builder-field border h-8 min-h-0 px-2.5 rounded-md transition-all duration-200',
                          input: cn(
                            'text-[12px]',
                            hasValue
                              ? 'text-token-filled font-semibold'
                              : 'text-default-700 placeholder:text-default-400 placeholder:italic'
                          )
                        }}
                        onKeyDown={handleEnterKey}
                        className='flex-1'
                      />

                      <button
                        data-skip-enter='true'
                        onClick={() => onChange(items.filter(x => x.id !== item.id))}
                        title='Remove'
                        className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-default-300/45 opacity-70 transition-all duration-200 hover:bg-danger/10 hover:text-danger-500 hover:opacity-100'>
                        <Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />
                      </button>
                    </SortableItem>
                  )
                })}
            </div>
          </>
        ) : (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <div className='mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-content2'>
              <Icon icon='lucide:type' className='h-5 w-5 text-default-500' />
            </div>
            <p className='text-[13px] font-medium text-foreground'>No variables added yet</p>
            <p className='mt-0.5 text-[11.5px] text-default-600'>Add variables to replace text in your PDF.</p>
          </div>
        )}
      </SortableContext>
    </DndContext>
  )
}

// --- Shared row styling tokens (matches ReplacementsSection) ---
// Shell = left border only. Amber bg tint lives on the HEADER strip, not the whole shell,
// so expanded bodies don't drown in yellow.
const rowShell = (configured: boolean) =>
  cn(
    'group flex flex-col rounded-lg border-l-[3px] transition-colors duration-200',
    // Configured = complete-row (brand tint). Unconfigured = neutral gray.
    configured ? 'builder-complete-row' : 'builder-empty-row border-l-transparent'
  )
const rowHeaderStrip = (configured: boolean) =>
  cn(
    'flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 transition-colors duration-200',
    configured ? 'hover:bg-content2/60' : 'hover:bg-content2/40'
  )
const rowInputWrapper = 'builder-field border h-8 min-h-0 px-2.5 rounded-md transition-all duration-200'
const rowKeyInput = 'var-token-text placeholder:text-default-500/40'
const rowDeleteBtn =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-default-300/45 opacity-70 transition-all duration-200 hover:bg-danger/10 hover:text-danger-500 hover:opacity-100'
const rowIconBtn =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-default-400/70 transition-colors duration-200 hover:bg-content2 hover:text-foreground'
const rowSummaryChip =
  'hidden sm:flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-content2/30 px-2 py-1 text-[10.5px] font-medium text-default-500'

// Compact detail inputs (used inside expanded state)
const detailInputClasses = {
  inputWrapper: 'builder-field border h-9 min-h-0 rounded-md transition-all duration-200',
  input: 'text-[12.5px] text-foreground font-medium',
  label: 'text-[11px] font-semibold text-default-600'
}
const detailSelectClasses = {
  trigger: 'builder-field border h-9 min-h-0 rounded-md transition-all duration-200',
  value: 'text-[12.5px] text-foreground font-medium',
  label: 'text-[11px] font-semibold text-default-600'
}

// --- Section summary bar (shared — total / configured / missing + jump) ---
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
}) => {
  const configured = total - missing
  return (
    <div className='mb-2.5 flex items-center justify-between gap-2 px-1'>
      <div className='flex items-center gap-2 text-[11px] font-semibold'>
        <span className='text-default-600'>
          {configured}/{total} configured
        </span>
        <span className='text-default-400/40'>·</span>
        {missing > 0 ? (
          <button
            type='button'
            onClick={onToggleMissingOnly}
            className={cn(
              'flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors duration-200',
              showMissingOnly
                ? 'builder-attention-chip'
                : 'builder-attention-text hover:bg-[var(--builder-attention-chip-bg)]'
            )}
            title={showMissingOnly ? 'Show all' : `Filter ${missingLabel} only`}>
            <span className='builder-attention-dot h-1.5 w-1.5 rounded-full' />
            {missing} {missingLabel}
            {showMissingOnly && <Icon icon='lucide:x' className='h-3 w-3' />}
          </button>
        ) : (
          <span className='flex items-center gap-1 text-primary'>
            <Icon icon='lucide:check' className='h-3 w-3' />
            All configured
          </span>
        )}
      </div>
      {missing > 0 && onJumpNext && (
        <button
          type='button'
          onClick={onJumpNext}
          className='flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold text-default-500 transition-colors duration-200 hover:bg-content2 hover:text-foreground'
          title={`Focus next ${missingLabel}`}>
          Next {missingLabel}
          <Icon icon='lucide:arrow-down' className='h-3 w-3' />
        </button>
      )}
    </div>
  )
}

// --- Expand chevron button (shared) ---
const ExpandToggle = ({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) => (
  <button
    type='button'
    data-skip-enter='true'
    onClick={onToggle}
    title={expanded ? 'Collapse' : 'Expand'}
    className={rowIconBtn}>
    <Icon icon={expanded ? 'lucide:chevron-up' : 'lucide:chevron-down'} className='h-3.5 w-3.5' />
  </button>
)

// --- Empty state (shared) ---
const EmptyState: React.FC<{ icon: string; title: string; hint?: string }> = ({ icon, title, hint }) => (
  <div className='flex flex-col items-center justify-center py-12 text-center'>
    <div className='mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-content2'>
      <Icon icon={icon} className='h-5 w-5 text-default-500' />
    </div>
    <p className='text-[13px] font-medium text-foreground'>{title}</p>
    {hint && <p className='mt-0.5 text-[11.5px] text-default-600'>{hint}</p>}
  </div>
)

// --- Images Section ---
interface ImagesSectionProps {
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
  const [expanded, setExpanded] = useState(false)
  const hasSrc = !!item.data.src
  const configured = hasSrc

  const updateItem = (updates: Partial<ImageItem['data']> | { key: string }) => {
    onChange(
      items.map(i => {
        if (i.id !== item.id) return i
        if ('key' in updates) return { ...i, key: updates.key as string }
        return { ...i, data: { ...i.data, ...updates } }
      })
    )
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

  const dimensionSummary = `${item.data.width || 'auto'}×${item.data.height || 'auto'} · ${item.data.fit || 'cover'}`

  return (
    <SortableItem id={item.id} className={rowShell(configured)}>
      {/* Collapsed row header — only here carries the amber/neutral bg */}
      <div className={rowHeaderStrip(configured)}>
        <DragHandle className='shrink-0 text-default-400/70 transition-colors duration-200 hover:text-default-700' />
        <Input
          value={item.key}
          id={`input-${item.id}`}
          isInvalid={!!errors?.[item.id]}
          errorMessage={errors?.[item.id]}
          variant='flat'
          placeholder='{{image:variable}}'
          size='sm'
          classNames={{ inputWrapper: rowInputWrapper, input: rowKeyInput }}
          onValueChange={v => {
            updateItem({ key: v })
            onClearError?.(item.id)
          }}
          onBlur={() => updateItem({ key: formatKey(item.key, 'image') })}
          onKeyDown={handleEnterKey}
          className='w-[200px] shrink-0'
        />
        <div className='flex flex-1 items-center justify-end gap-2'>
          <div className='hidden items-center gap-1.5 sm:flex'>
            {/* Status chip — only visible when missing (left border conveys configured state) */}
            {!hasSrc && (
              <span
                className='builder-attention-chip flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[10.5px] font-medium'
                title='No source set'>
                <Icon icon='lucide:image-off' className='h-3 w-3' />
                no source
              </span>
            )}
            {/* Dimensions chip — informational */}
            <span className={rowSummaryChip}>
              <Icon icon='lucide:ruler' className='h-3 w-3' />
              {dimensionSummary}
            </span>
          </div>
          <div className='flex items-center gap-0.5'>
            <ExpandToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} />
            <button
              data-skip-enter='true'
              onClick={() => onChange(items.filter(x => x.id !== item.id))}
              title='Remove'
              className={rowDeleteBtn}>
              <Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail form — neutral bg (no amber bleed) */}
      {expanded && (
        <div className='builder-detail-panel mb-1.5 ml-[22px] mr-1.5 mt-0.5 flex flex-col gap-3 rounded-md p-3'>
          {/* Preview thumbnail */}
          <div className='relative flex h-24 w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-default-300/50 bg-content1/70 transition-colors hover:bg-content2/70'>
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
                <span className='text-[11px] font-medium'>Upload image</span>
              </div>
            )}
            <label className='absolute inset-0 cursor-pointer'>
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
            variant='flat'
            classNames={detailInputClasses}
            onKeyDown={handleEnterKey}
            startContent={<Icon icon='lucide:link' className='h-3.5 w-3.5 shrink-0 text-default-400' />}
            endContent={
              <label className='cursor-pointer text-default-400 hover:text-primary'>
                <Icon icon='lucide:folder-open' className='h-4 w-4' />
                <input type='file' className='hidden' accept='image/*' onChange={handleFileUpload} />
              </label>
            }
          />

          <div className='grid grid-cols-3 gap-2'>
            <Input
              type='number'
              label='Width'
              labelPlacement='outside'
              placeholder='Auto'
              value={item.data.width === 0 ? '' : item.data.width?.toString() || ''}
              onValueChange={v => {
                handleNumChange(v, n => updateItem({ width: n }))
                onClearError?.(`${item.id}-width`)
              }}
              size='sm'
              variant='flat'
              classNames={detailInputClasses}
              onKeyDown={handleEnterKey}
            />
            <Input
              type='number'
              label='Height'
              labelPlacement='outside'
              placeholder='Auto'
              value={item.data.height === 0 ? '' : item.data.height?.toString() || ''}
              onValueChange={v => {
                handleNumChange(v, n => updateItem({ height: n }))
                onClearError?.(`${item.id}-height`)
              }}
              size='sm'
              variant='flat'
              classNames={detailInputClasses}
              onKeyDown={handleEnterKey}
            />
            <Select
              label='Fit'
              labelPlacement='outside'
              selectedKeys={[item.data.fit || 'cover']}
              onChange={e => {
                updateItem({ fit: e.target.value })
                onClearError?.(`${item.id}-fit`)
              }}
              size='sm'
              variant='flat'
              classNames={detailSelectClasses}>
              {['cover', 'contain', 'fill'].map(k => (
                <SelectItem key={k}>{k}</SelectItem>
              ))}
            </Select>
          </div>
        </div>
      )}
    </SortableItem>
  )
}

export const ImagesSection: React.FC<ImagesSectionProps> = ({ items, onChange, errors, onClearError }) => {
  const [showMissingOnly, setShowMissingOnly] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id)
      const newIndex = items.findIndex(i => i.id === over.id)
      onChange(arrayMove(items, oldIndex, newIndex))
    }
  }

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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
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
            <div className='flex flex-col gap-0.5'>
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
          <EmptyState icon='lucide:image' title='No images added yet' hint='Add images to embed in your PDF.' />
        )}
      </SortableContext>
    </DndContext>
  )
}
// --- QR Codes Section ---
interface QrCodesSectionProps {
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
  const [expanded, setExpanded] = useState(false)
  const configured = !!item.data.text

  const updateData = (patch: Partial<QrCodeDataRequest>) => {
    onChange(items.map(i => (i.id === item.id ? { ...i, data: { ...i.data, ...patch } } : i)))
  }
  const updateKey = (v: string) => {
    onChange(items.map(i => (i.id === item.id ? { ...i, key: v } : i)))
  }

  const sizeSummary = `${item.data.size || 200}px · ${item.data.color || '#000000'}`

  return (
    <SortableItem id={item.id} className={rowShell(configured)}>
      {/* Collapsed row header */}
      <div className={rowHeaderStrip(configured)}>
        <DragHandle className='shrink-0 text-default-400/70 transition-colors duration-200 hover:text-default-700' />
        <Input
          value={item.key}
          id={`input-${item.id}`}
          isInvalid={!!errors?.[item.id]}
          errorMessage={errors?.[item.id]}
          variant='flat'
          placeholder='{{qrcode:variable}}'
          size='sm'
          classNames={{ inputWrapper: rowInputWrapper, input: rowKeyInput }}
          onValueChange={v => {
            updateKey(v)
            onClearError?.(item.id)
          }}
          onBlur={() => updateKey(formatKey(item.key, 'qrcode'))}
          onKeyDown={handleEnterKey}
          className='w-[200px] shrink-0'
        />
        <div className='flex flex-1 items-center justify-end gap-2'>
          <div className='hidden items-center gap-1.5 sm:flex'>
            {/* Status chip — only visible when missing */}
            {!configured && (
              <span
                className='builder-attention-chip flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[10.5px] font-medium'
                title='No value set'>
                <Icon icon='lucide:circle-dashed' className='h-3 w-3' />
                no value
              </span>
            )}
            {/* Size + color chip — informational */}
            <span className={rowSummaryChip}>
              <Icon icon='lucide:qr-code' className='h-3 w-3' />
              {sizeSummary}
            </span>
          </div>
          <div className='flex items-center gap-0.5'>
            <ExpandToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} />
            <button
              data-skip-enter='true'
              onClick={() => onChange(items.filter(x => x.id !== item.id))}
              title='Remove'
              className={rowDeleteBtn}>
              <Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail form */}
      {expanded && (
        <div className='builder-detail-panel mb-1.5 ml-[22px] mr-1.5 mt-0.5 flex flex-col gap-3 rounded-md p-3'>
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
            variant='flat'
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
              variant='flat'
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
              variant='flat'
              classNames={detailInputClasses}
              onKeyDown={handleEnterKey}
            />
          </div>
        </div>
      )}
    </SortableItem>
  )
}

export const QrCodesSection: React.FC<QrCodesSectionProps> = ({ items, onChange, errors, onClearError }) => {
  const [showMissingOnly, setShowMissingOnly] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onChange(
        arrayMove(
          items,
          items.findIndex(i => i.id === active.id),
          items.findIndex(i => i.id === over.id)
        )
      )
    }
  }

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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
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
            <div className='flex flex-col gap-0.5'>
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
          <EmptyState icon='lucide:qr-code' title='No QR codes added yet' hint='Add a QR code to generate from text.' />
        )}
      </SortableContext>
    </DndContext>
  )
}

// --- Barcodes Section ---
interface BarcodesSectionProps {
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
  const [expanded, setExpanded] = useState(false)
  const configured = !!item.data.text

  const updateData = (patch: Partial<BarcodeDataRequest>) => {
    onChange(items.map(i => (i.id === item.id ? { ...i, data: { ...i.data, ...patch } } : i)))
  }
  const updateKey = (v: string) => {
    onChange(items.map(i => (i.id === item.id ? { ...i, key: v } : i)))
  }

  const formatSummary = `${item.data.format || 'Code128'} · ${item.data.width || 200}×${item.data.height || 50}`

  return (
    <SortableItem id={item.id} className={rowShell(configured)}>
      {/* Collapsed row header */}
      <div className={rowHeaderStrip(configured)}>
        <DragHandle className='shrink-0 text-default-400/70 transition-colors duration-200 hover:text-default-700' />
        <Input
          value={item.key}
          id={`input-${item.id}`}
          isInvalid={!!errors?.[item.id]}
          errorMessage={errors?.[item.id]}
          variant='flat'
          placeholder='{{barcode:variable}}'
          size='sm'
          classNames={{ inputWrapper: rowInputWrapper, input: rowKeyInput }}
          onValueChange={v => {
            updateKey(v)
            onClearError?.(item.id)
          }}
          onBlur={() => updateKey(formatKey(item.key, 'barcode'))}
          onKeyDown={handleEnterKey}
          className='w-[200px] shrink-0'
        />
        <div className='flex flex-1 items-center justify-end gap-2'>
          <div className='hidden items-center gap-1.5 sm:flex'>
            {/* Status chip — only visible when missing */}
            {!configured && (
              <span
                className='builder-attention-chip flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[10.5px] font-medium'
                title='No value set'>
                <Icon icon='lucide:circle-dashed' className='h-3 w-3' />
                no value
              </span>
            )}
            {/* Format + dimensions chip — informational */}
            <span className={rowSummaryChip}>
              <Icon icon='lucide:barcode' className='h-3 w-3' />
              {formatSummary}
            </span>
          </div>
          <div className='flex items-center gap-0.5'>
            <ExpandToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} />
            <button
              data-skip-enter='true'
              onClick={() => onChange(items.filter(x => x.id !== item.id))}
              title='Remove'
              className={rowDeleteBtn}>
              <Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail form */}
      {expanded && (
        <div className='builder-detail-panel mb-1.5 ml-[22px] mr-1.5 mt-0.5 flex flex-col gap-3 rounded-md p-3'>
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
            variant='flat'
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
              variant='flat'
              classNames={detailSelectClasses}>
              {['Code128', 'EAN13'].map(k => (
                <SelectItem key={k}>{k}</SelectItem>
              ))}
            </Select>
            <div className='flex items-end pb-1.5'>
              <Checkbox
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
              label='Width'
              labelPlacement='outside'
              placeholder='200'
              type='number'
              value={item.data.width === 0 ? '' : item.data.width?.toString() || ''}
              onValueChange={v => handleNumChange(v, val => updateData({ width: val }))}
              size='sm'
              variant='flat'
              classNames={detailInputClasses}
              onKeyDown={handleEnterKey}
            />
            <Input
              label='Height'
              labelPlacement='outside'
              placeholder='50'
              type='number'
              value={item.data.height === 0 ? '' : item.data.height?.toString() || ''}
              onValueChange={v => handleNumChange(v, val => updateData({ height: val }))}
              size='sm'
              variant='flat'
              classNames={detailInputClasses}
              onKeyDown={handleEnterKey}
            />
          </div>
        </div>
      )}
    </SortableItem>
  )
}

export const BarcodesSection: React.FC<BarcodesSectionProps> = ({ items, onChange, errors, onClearError }) => {
  const [showMissingOnly, setShowMissingOnly] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id)
      onChange(
        arrayMove(
          items,
          items.findIndex(i => i.id === active.id),
          items.findIndex(i => i.id === over.id)
        )
      )
  }

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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
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
            <div className='flex flex-col gap-0.5'>
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
          <EmptyState icon='lucide:barcode' title='No barcodes added yet' hint='Add Code128 / EAN13 barcodes.' />
        )}
      </SortableContext>
    </DndContext>
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
        title='Word template markers'
        className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-default-400/70 transition-colors duration-200 hover:bg-content2 hover:text-foreground'>
        <Icon icon='lucide:braces' className='h-3.5 w-3.5' />
      </button>
      <Modal isOpen={open} onOpenChange={setOpen} size='2xl'>
        <ModalContent>
          {() => (
            <>
              <ModalHeader className='text-sm font-semibold'>Word Template Markers — {tableName}</ModalHeader>
              <ModalBody className='pb-6'>
                <div className='grid grid-cols-3 gap-3'>
                  {MARKERS.map(group => (
                    <div key={group.label} className='flex flex-col gap-1.5'>
                      <span className='text-[10px] font-bold uppercase tracking-wider text-default-400'>
                        {group.label}
                      </span>
                      <div className='flex flex-col gap-2 rounded border border-default-200 bg-content2 p-2.5'>
                        {group.items.map(m => (
                          <div key={m.code} className='flex flex-col gap-0.5'>
                            <code className='rounded border border-default-200 bg-content1 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground'>
                              {m.code}
                            </code>
                            <span className='text-[10px] text-default-500'>{m.desc}</span>
                          </div>
                        ))}
                      </div>
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

// Editable column header — user clicks "Add Column", new col appears with default name,
// then they rename inline in the table header. Uses local draft state so typing doesn't
// wipe row data on every keystroke.
const ColumnHeader: React.FC<{
  col: string
  itemId: string
  columns: string[]
  onRename: (oldCol: string, newCol: string) => void
  onDelete: (col: string) => void
  autoFocus?: boolean
}> = ({ col, itemId, columns, onRename, onDelete, autoFocus }) => {
  const clean = col.replace(/^\{\{row:/, '').replace(/\}\}$/, '')
  const isDefault = /^column_\d+$/.test(clean)
  const [draft, setDraft] = useState(isDefault ? '' : clean)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Keep draft synced when the source col changes (e.g. after reorder)
  React.useEffect(() => {
    setDraft(isDefault ? '' : clean)
  }, [clean, isDefault])

  React.useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const commit = () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      setDraft(isDefault ? '' : clean)
      return
    }
    if (trimmed === clean) {
      setDraft(clean)
      return
    }
    let formatted = formatKey(trimmed, 'table')
    // Avoid collisions with other columns
    const others = columns.filter(c => c !== col)
    if (others.includes(formatted)) {
      formatted = formatted.replace('}}', `_${Math.floor(Math.random() * 1000)}}`)
    }
    onRename(col, formatted)
  }

  return (
    <div className='flex w-full items-center gap-1'>
      <div className='flex min-w-0 flex-1 items-center rounded bg-content2/60 px-1 ring-1 ring-default-200/40 transition-all focus-within:bg-content1 focus-within:ring-2 focus-within:ring-primary/35'>
        <span className='shrink-0 select-none font-mono text-[11px] font-semibold text-default-400/80'>{'{{row:'}</span>
        <input
          ref={inputRef}
          id={`col-input-${itemId}-${col}`}
          className='var-token-text min-w-0 flex-1 bg-transparent px-0.5 outline-none'
          value={draft}
          placeholder={clean}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
              ;(e.target as HTMLInputElement).blur()
            } else if (e.key === 'Escape') {
              setDraft(clean)
              ;(e.target as HTMLInputElement).blur()
            }
          }}
        />
        <span className='shrink-0 select-none font-mono text-[11px] font-semibold text-default-400/80'>{'}}'}</span>
      </div>
      <button
        onClick={() => onDelete(col)}
        title='Remove column'
        className='shrink-0 rounded p-0.5 text-default-300 transition-colors hover:bg-danger/10 hover:text-danger'>
        <Icon icon='lucide:x' className='h-3 w-3' />
      </button>
    </div>
  )
}

// TableEditorBody — the editable content (columns/rows/advanced).
// Header is handled by the parent row shell, not here.
const TableEditorBody = ({
  item,
  onUpdate,
  tableName
}: {
  item: TableItem
  onUpdate: (i: TableItem) => void
  tableName: string
}) => {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))
  const [advancedKeys, setAdvancedKeys] = useState<Selection>(new Set((item.sort?.length || 0) > 0 ? ['advanced'] : []))
  // Track last-added column so we auto-focus its header input for rename
  const [lastAddedCol, setLastAddedCol] = useState<string | null>(null)

  const handleAddCol = () => {
    // Generate next available default name: column_1, column_2, ...
    let n = item.columns.length + 1
    let formatted = formatKey(`column_${n}`, 'table')
    while (item.columns.includes(formatted)) {
      n++
      formatted = formatKey(`column_${n}`, 'table')
    }
    onUpdate({ ...item, columns: [...item.columns, formatted] })
    setLastAddedCol(formatted)
  }

  const handleDeleteCol = (colName: string) => {
    // Also strip the data from existing rows for consistency
    const newRows = item.rows.map(row => {
      if (!(colName in row)) return row
      const { [colName]: _removed, ...rest } = row
      return rest
    })
    onUpdate({ ...item, columns: item.columns.filter(c => c !== colName), rows: newRows })
  }

  const handleRenameCol = (oldCol: string, newCol: string) => {
    if (oldCol === newCol) return
    const newColumns = item.columns.map(c => (c === oldCol ? newCol : c))
    const newRows = item.rows.map(row => {
      if (!(oldCol in row)) return row
      const { [oldCol]: val, ...rest } = row
      return { ...rest, [newCol]: val }
    })
    onUpdate({ ...item, columns: newColumns, rows: newRows })
    // Keep auto-focus on the renamed column so user can keep tabbing
    setLastAddedCol(newCol)
  }

  const handleColDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = item.columns.indexOf(active.id as string)
      const newIndex = item.columns.indexOf(over.id as string)
      onUpdate({ ...item, columns: arrayMove(item.columns, oldIndex, newIndex) })
    }
  }

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
      {/* Quick Add Column — one-click adds default-named column, user renames at the table header */}
      <div className='flex items-center justify-between gap-2'>
        <span className='text-[10.5px] font-semibold uppercase tracking-widest text-default-500/70'>
          Columns · {item.columns.length}
        </span>
        <div className='flex items-center gap-1'>
          <MarkersModal tableName={tableName} />
          <Button
            size='sm'
            variant='flat'
            radius='md'
            onPress={handleAddCol}
            className='h-7 gap-1 bg-content2 px-2.5 text-[11px] font-semibold text-default-700 hover:bg-content3'
            startContent={<Icon icon='lucide:plus' className='h-3.5 w-3.5' strokeWidth={2.5} />}>
            Add Column
          </Button>
        </div>
      </div>

      {/* Table Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColDragEnd}>
        <SortableContext items={item.columns} strategy={horizontalListSortingStrategy}>
          <div className='overflow-x-auto rounded-lg border border-default-200/70 bg-content1'>
            <div className='max-h-48 overflow-y-auto'>
              <table className='w-full text-left text-sm'>
                <thead className='sticky top-0 z-10 border-b border-default-200 bg-content2/80 font-medium text-default-600'>
                  <tr>
                    {item.columns.map(col => (
                      <SortableHeaderItem key={col} id={col} className='min-w-[120px] border-l p-1.5'>
                        <ColumnHeader
                          col={col}
                          itemId={item.id}
                          columns={item.columns}
                          onRename={handleRenameCol}
                          onDelete={handleDeleteCol}
                          autoFocus={lastAddedCol === col}
                        />
                      </SortableHeaderItem>
                    ))}
                    <th className='w-10 border-l p-2' />
                  </tr>
                </thead>
                <tbody>
                  {item.rows.map((row, rIdx) => (
                    <tr key={rIdx} className='border-b border-default-200/70 hover:bg-content2/70'>
                      {item.columns.map(col => {
                        const cleanCol = col.replace(/^\{\{row:/, '').replace(/\}\}$/, '')
                        return (
                          <td key={col} className='min-w-[100px] border-l p-1'>
                            <input
                              className='w-full rounded bg-transparent px-2 py-1 text-[12px] text-foreground outline-none transition-colors placeholder:italic placeholder:text-default-400/50 focus:bg-content2/70'
                              value={row[col] ?? ''}
                              placeholder={cleanCol}
                              onChange={e => updateRow(rIdx, col, e.target.value)}
                              onKeyDown={handleEnterKey}
                            />
                          </td>
                        )
                      })}
                      <td className='w-10 border-l p-1 text-center'>
                        <Button
                          isIconOnly
                          size='sm'
                          color='danger'
                          variant='flat'
                          radius='sm'
                          className='h-6 w-6 min-w-0'
                          data-skip-enter='true'
                          onPress={() => deleteRow(rIdx)}>
                          <Icon icon='lucide:trash-2' className='h-3 w-3' />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {item.rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={item.columns.length + 1}
                        className='py-5 text-center text-xs italic text-default-400'>
                        No data rows yet
                      </td>
                    </tr>
                  )}
                  <tr className='border-t border-default-200'>
                    <td colSpan={item.columns.length + 1} className='p-1'>
                      <Button
                        size='sm'
                        variant='flat'
                        onPress={addRow}
                        className='w-full bg-content1 text-xs text-default-500 hover:bg-content2'>
                        <Icon icon='lucide:plus' className='h-3.5 w-3.5' />
                        Add Row
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </SortableContext>
      </DndContext>

      {/* Repeat Header */}
      <Checkbox
        isSelected={item.repeatHeader ?? false}
        onValueChange={v => onUpdate({ ...item, repeatHeader: v })}
        size='sm'
        classNames={{ label: 'text-xs text-default-600' }}>
        Repeat header
      </Checkbox>

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
            <div className='flex items-center gap-2 text-xs font-medium text-default-500'>
              <Icon icon='lucide:settings-2' className='h-3.5 w-3.5' />
              Advanced Table Settings
            </div>
          }
          className='px-0'
          classNames={{ title: 'text-xs', content: 'pt-2 pb-2' }}>
          <div className='builder-detail-panel flex flex-col gap-4 rounded-lg p-3'>
            {/* Sort */}
            <div className='flex flex-col gap-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-1.5'>
                  <Icon icon='lucide:arrow-up-down' className='h-3.5 w-3.5 text-primary' />
                  <span className='text-xs font-semibold text-default-700'>Sort</span>
                </div>
                <Button
                  size='sm'
                  color='primary'
                  variant='flat'
                  onPress={() =>
                    onUpdate({
                      ...item,
                      sort: [
                        ...(item.sort?.length ? item.sort : [{ field: '', direction: '' }]),
                        { field: '', direction: '' }
                      ]
                    })
                  }
                  className='h-6 min-w-0 px-2 text-xs'>
                  + Add
                </Button>
              </div>
              <div className='flex flex-col gap-2'>
                {(item.sort?.length ? item.sort : [{ field: '', direction: '' }]).map((rule, idx) => (
                  <div key={idx} className='flex items-center gap-2'>
                    <Select
                      aria-label='Sort Column'
                      placeholder='Column...'
                      selectedKeys={rule.field ? [rule.field] : []}
                      onChange={e => {
                        const s = [...(item.sort?.length ? item.sort : [{ field: '', direction: '' }])]
                        s[idx] = { ...s[idx], field: e.target.value }
                        onUpdate({ ...item, sort: s })
                      }}
                      size='sm'
                      variant='flat'
                      className='flex-1'
                      classNames={{ trigger: rowInputWrapper }}>
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
                        const s = [...(item.sort?.length ? item.sort : [{ field: '', direction: '' }])]
                        s[idx] = { ...s[idx], direction: e.target.value }
                        onUpdate({ ...item, sort: s })
                      }}
                      size='sm'
                      variant='flat'
                      className='w-32'
                      classNames={{ trigger: rowInputWrapper }}>
                      <SelectItem key='asc' textValue='Ascending'>
                        Ascending
                      </SelectItem>
                      <SelectItem key='desc' textValue='Descending'>
                        Descending
                      </SelectItem>
                    </Select>
                    {(item.sort?.length ?? 0) > 1 && (
                      <Button
                        isIconOnly
                        size='sm'
                        color='danger'
                        variant='flat'
                        onPress={() => {
                          const s = [...item.sort!]
                          s.splice(idx, 1)
                          onUpdate({ ...item, sort: s })
                        }}
                        className='h-8 w-8 min-w-0'>
                        <Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Vertical Merge & Collapse */}
            <div className='flex flex-col gap-2 border-t border-default-100 pt-3'>
              <div className='flex items-center gap-1.5'>
                <Icon icon='lucide:network' className='h-3.5 w-3.5 text-primary' />
                <span className='text-xs font-semibold text-default-700'>Vertical Merge & Collapse</span>
              </div>
              <div className='grid grid-cols-2 gap-2'>
                <Select
                  label='Vertical Merge'
                  placeholder='Select columns...'
                  selectionMode='multiple'
                  selectedKeys={new Set(item.verticalMerge || [])}
                  onSelectionChange={keys => onUpdate({ ...item, verticalMerge: Array.from(keys) as string[] })}
                  size='sm'
                  variant='flat'
                  isMultiline
                  renderValue={vals => (
                    <div className='flex flex-wrap gap-1 py-0.5'>
                      {vals.map(v => (
                        <Chip key={v.key} size='sm' variant='flat' color='primary' className='h-4 text-[10px]'>
                          {v.textValue}
                        </Chip>
                      ))}
                    </div>
                  )}
                  classNames={{ trigger: rowInputWrapper }}>
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
                  label='Data Collapsing'
                  placeholder='Select columns...'
                  selectionMode='multiple'
                  selectedKeys={new Set(item.collapse || [])}
                  onSelectionChange={keys => onUpdate({ ...item, collapse: Array.from(keys) as string[] })}
                  size='sm'
                  variant='flat'
                  isMultiline
                  renderValue={vals => (
                    <div className='flex flex-wrap gap-1 py-0.5'>
                      {vals.map(v => (
                        <Chip key={v.key} size='sm' variant='flat' color='primary' className='h-4 text-[10px]'>
                          {v.textValue}
                        </Chip>
                      ))}
                    </div>
                  )}
                  classNames={{ trigger: rowInputWrapper }}>
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
}

const TableRow: React.FC<TableRowProps> = ({ item, index, items, onChange }) => {
  const [expanded, setExpanded] = useState(false)
  const configured = item.columns.length > 0 && item.rows.length > 0
  const tableName = `Table ${index + 1}`

  const onUpdate = (u: TableItem) => onChange(items.map(x => (x.id === item.id ? u : x)))
  const onDelete = () => onChange(items.filter(x => x.id !== item.id))

  const colCount = item.columns.length
  const rowCount = item.rows.length

  // Table "key" is synthesized (tables aren't named by user yet). Show as {{table:N}} for
  // visual parity with Variables/Images/QR/Barcodes mapping-key inputs.
  const tableKey = `{{table:${index + 1}}}`

  return (
    <SortableItem id={item.id} className={rowShell(configured)}>
      {/* Collapsed row header */}
      <div className={rowHeaderStrip(configured)}>
        <DragHandle className='shrink-0 text-default-400/70 transition-colors duration-200 hover:text-default-700' />
        {/* Read-only key display — input-styled for pattern parity, not editable (yet) */}
        <div
          className='builder-field var-token-text flex h-8 w-[200px] shrink-0 cursor-default items-center rounded-md border px-2.5'
          title={tableName}>
          <span className='truncate'>{tableKey}</span>
        </div>
        <div className='flex flex-1 items-center justify-end gap-2'>
          {/* Separate col/row counters — each in its own chip so empty state is visible per metric */}
          <div className='hidden items-center gap-1.5 sm:flex'>
            <span
              className={cn(
                'flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[10.5px] font-medium',
                colCount > 0 ? 'bg-content2/30 text-default-500' : 'builder-attention-chip'
              )}
              title={colCount === 0 ? 'Needs at least one column' : undefined}>
              <Icon icon='lucide:columns-3' className='h-3 w-3' />
              {colCount} {colCount === 1 ? 'col' : 'cols'}
            </span>
            <span
              className={cn(
                'flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[10.5px] font-medium',
                rowCount > 0 ? 'bg-content2/30 text-default-500' : 'builder-attention-chip'
              )}
              title={rowCount === 0 ? 'Needs at least one row' : undefined}>
              <Icon icon='lucide:rows-3' className='h-3 w-3' />
              {rowCount} {rowCount === 1 ? 'row' : 'rows'}
            </span>
          </div>
          <div className='flex items-center gap-0.5'>
            <ExpandToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} />
            <button data-skip-enter='true' onClick={onDelete} title='Remove' className={rowDeleteBtn}>
              <Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded body — neutral bg (no amber bleed) */}
      {expanded && (
        <div className='builder-detail-panel mb-1.5 ml-[22px] mr-1.5 mt-0.5 rounded-md p-3'>
          <TableEditorBody item={item} onUpdate={onUpdate} tableName={tableName} />
        </div>
      )}
    </SortableItem>
  )
}

export const TablesSection: React.FC<TablesSectionProps> = ({ items, onChange }) => {
  const [showMissingOnly, setShowMissingOnly] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id)
      const newIndex = items.findIndex(i => i.id === over.id)
      onChange(arrayMove(items, oldIndex, newIndex))
    }
  }

  const isMissing = (t: TableItem) => t.columns.length === 0 || t.rows.length === 0
  const missing = items.filter(isMissing).length
  const visible = showMissingOnly ? items.filter(isMissing) : items

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
        {items.length > 0 ? (
          <>
            <SectionSummary
              total={items.length}
              missing={missing}
              missingLabel='incomplete'
              showMissingOnly={showMissingOnly}
              onToggleMissingOnly={() => setShowMissingOnly(v => !v)}
            />
            <div className='flex flex-col gap-0.5'>
              {visible.map(item => {
                const idx = items.findIndex(x => x.id === item.id)
                return <TableRow key={item.id} item={item} index={idx} items={items} onChange={onChange} />
              })}
            </div>
          </>
        ) : (
          <EmptyState
            icon='lucide:table'
            title='No tables added yet'
            hint='Add a data table to populate from structured data.'
          />
        )}
      </SortableContext>
    </DndContext>
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
    <div className='flex flex-col gap-2'>
      {showPdfOptions && (
        <>
          {/* Password Section */}
          <div className='flex flex-col gap-4 rounded-2xl border border-content3 bg-content1 p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Icon icon='lucide:lock' className='h-4 w-4 text-default-500' />
                <span className='text-sm font-semibold text-foreground'>PDF Password Protection</span>
              </div>
              <Switch
                size='sm'
                isSelected={passwordEnabled}
                onValueChange={v => onChange({ pdfPassword: v ? {} : undefined })}
              />
            </div>

            {passwordEnabled && (
              <div className='flex flex-col gap-4'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <Input
                    label='User Password'
                    description='Required to open the file'
                    placeholder='Optional'
                    value={pdfPassword?.userPassword || ''}
                    onChange={e => updatePassword({ userPassword: e.target.value || undefined })}
                    labelPlacement='outside'
                    variant='bordered'
                    radius='sm'
                    type='text'
                  />
                  <Input
                    label='Owner Password'
                    description='Required to change restrictions'
                    placeholder='Optional'
                    value={pdfPassword?.ownerPassword || ''}
                    onChange={e => updatePassword({ ownerPassword: e.target.value || undefined })}
                    labelPlacement='outside'
                    variant='bordered'
                    radius='sm'
                    type='text'
                  />
                </div>
                <div className='flex flex-col gap-2'>
                  <span className='text-xs font-semibold text-default-600'>Restrictions</span>
                  <div className='flex flex-wrap gap-4'>
                    <Checkbox
                      isSelected={pdfPassword?.restrictPrinting ?? false}
                      onValueChange={v => updatePassword({ restrictPrinting: v })}
                      size='sm'>
                      <span className='text-sm text-default-700'>Restrict Printing</span>
                    </Checkbox>
                    <Checkbox
                      isSelected={pdfPassword?.restrictCopying ?? false}
                      onValueChange={v => updatePassword({ restrictCopying: v })}
                      size='sm'>
                      <span className='text-sm text-default-700'>Restrict Copying</span>
                    </Checkbox>
                    <Checkbox
                      isSelected={pdfPassword?.restrictModifying ?? false}
                      onValueChange={v => updatePassword({ restrictModifying: v })}
                      size='sm'>
                      <span className='text-sm text-default-700'>Restrict Modifying</span>
                    </Checkbox>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Watermark Section */}
          <div className='flex flex-col gap-4 rounded-2xl border border-content3 bg-content1 p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Icon icon='lucide:droplets' className='h-4 w-4 text-default-500' />
                <span className='text-sm font-semibold text-foreground'>Watermark</span>
              </div>
              <Switch
                size='sm'
                isSelected={watermarkEnabled}
                onValueChange={v => {
                  if (!v) {
                    onChange({ watermark: undefined })
                    return
                  }
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
                      label='Watermark Text'
                      placeholder='e.g. CONFIDENTIAL'
                      value={watermark?.text || ''}
                      onChange={e => updateWatermark({ text: e.target.value })}
                      labelPlacement='outside'
                      variant='bordered'
                      radius='sm'
                      size='sm'
                    />
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                      <Select
                        label='Font Family'
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
                        classNames={{ trigger: 'shadow-none' }}>
                        {fontFamilies.map(f => (
                          <SelectItem key={f}>{f}</SelectItem>
                        ))}
                      </Select>
                      <Select
                        label='Font Variant'
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
                        classNames={{ trigger: 'shadow-none' }}
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
                      label='Watermark Text'
                      placeholder='e.g. CONFIDENTIAL'
                      value={watermark?.text || ''}
                      onChange={e => updateWatermark({ text: e.target.value })}
                      labelPlacement='outside'
                      variant='bordered'
                      radius='sm'
                      size='sm'
                    />
                    <Select
                      label='Font Family'
                      selectedKeys={watermark?.fontFamily ? [watermark.fontFamily] : [fontFamilies[0] ?? 'Arial']}
                      onChange={e => updateWatermark({ fontFamily: e.target.value })}
                      labelPlacement='outside'
                      variant='bordered'
                      size='sm'>
                      {fontFamilies.map(f => (
                        <SelectItem key={f}>{f}</SelectItem>
                      ))}
                    </Select>
                  </div>
                )}

                {/* Font Size + Color */}
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <Input
                    label='Font Size'
                    type='number'
                    placeholder='48'
                    value={watermark?.fontSize?.toString() || ''}
                    onChange={e => updateWatermark({ fontSize: e.target.value ? Number(e.target.value) : undefined })}
                    labelPlacement='outside'
                    variant='bordered'
                    radius='sm'
                    size='sm'
                  />
                  <Input
                    label='Color'
                    type='color'
                    value={watermark?.color || '#000000'}
                    onChange={e => updateWatermark({ color: e.target.value })}
                    labelPlacement='outside'
                    variant='bordered'
                    radius='sm'
                    size='sm'
                  />
                </div>

                {/* Opacity & Rotation */}
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='flex flex-col gap-1'>
                    <span className='text-xs font-medium text-default-600'>
                      Opacity: {Math.round((Number(watermark?.opacity) || 0.3) * 100)}%
                    </span>
                    <Slider
                      minValue={0}
                      maxValue={1}
                      step={0.05}
                      value={Number(watermark?.opacity) || 0.3}
                      onChange={v => updateWatermark({ opacity: v as number })}
                      size='sm'
                      color='primary'
                    />
                  </div>
                  <Input
                    label='Rotation (degrees)'
                    type='number'
                    placeholder='-45'
                    value={watermark?.rotation?.toString() || ''}
                    onChange={e => updateWatermark({ rotation: e.target.value ? Number(e.target.value) : undefined })}
                    labelPlacement='outside'
                    variant='bordered'
                    radius='sm'
                    size='sm'
                  />
                </div>

                {/* Position */}
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <Select
                    label='Position X'
                    selectedKeys={watermark?.positionX ? [watermark.positionX] : ['center']}
                    onChange={e => updateWatermark({ positionX: e.target.value })}
                    labelPlacement='outside'
                    variant='bordered'
                    size='sm'>
                    {POSITION_X_OPTIONS.map(p => (
                      <SelectItem key={p}>{p}</SelectItem>
                    ))}
                  </Select>
                  <Select
                    label='Position Y'
                    selectedKeys={watermark?.positionY ? [watermark.positionY] : ['middle']}
                    onChange={e => updateWatermark({ positionY: e.target.value })}
                    labelPlacement='outside'
                    variant='bordered'
                    size='sm'>
                    {POSITION_Y_OPTIONS.map(p => (
                      <SelectItem key={p}>{p}</SelectItem>
                    ))}
                  </Select>
                </div>

                {/* Pages */}
                <Input
                  label='Apply to Pages (optional)'
                  description='Comma-separated page numbers, e.g. 1,2,3'
                  placeholder='Leave empty to apply to all pages'
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
                  radius='sm'
                  size='sm'
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* ZIP Output */}
      <div className='flex flex-col gap-3'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-semibold text-foreground'>Download as ZIP</p>
            <p className='text-xs text-default-500'>
              Wrap the output file in a <code className='font-mono'>.zip</code> archive before download.
            </p>
          </div>
          <Switch isSelected={!!zipOutput} onValueChange={v => onChange({ zipOutput: v })} size='sm' />
        </div>
      </div>
    </div>
  )
}
