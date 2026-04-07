import React, { useState } from 'react'
import {
  Button,
  Input,
  Checkbox,
  Select,
  SelectItem,
  cn,
  Textarea,
  Accordion,
  AccordionItem,
  Chip,
  Selection
} from '@heroui/react'
import Icon from '@/components/icon'
import {
  ImageDataRequest,
  QrCodeDataRequest,
  BarcodeDataRequest,
  SortDefinition
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
import { ProChip } from '../docs/DocComponents'


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

  const updateItem = (id: string, field: 'key' | 'value', val: string) => {
    onChange(items.map(item => (item.id === id ? { ...item, [field]: val } : item)))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          {items.map(item => (
            <SortableItem
              key={item.id}
              id={item.id}
              className='group relative flex flex-col gap-2 border border-default-200 bg-content1 p-3 transition-colors hover:border-default-300'>
              <div className='flex items-center gap-2'>
                <DragHandle />
                <Input
                  value={item.key}
                  id={`input-${item.id}`}
                  isInvalid={!!errors?.[item.id]}
                  errorMessage={errors?.[item.id]}
                  size='sm'
                  variant='flat'
                  placeholder='{{variable}}'
                  classNames={{
                    input: 'font-mono text-sm font-medium text-default-600',
                    inputWrapper: 'bg-transparent shadow-none px-0 h-auto min-h-0'
                  }}
                  onValueChange={v => {
                    updateItem(item.id, 'key', v)
                    onClearError?.(item.id)
                  }}
                  onBlur={() => updateItem(item.id, 'key', formatKey(item.key, 'replace'))}
                  className='flex-1'
                  onKeyDown={handleEnterKey}
                />
                <Button
                  isIconOnly
                  size='sm'
                  color='danger'
                  variant='light'
                  radius='none'
                  className='h-6 w-6 text-default-400 hover:text-danger'
                  data-skip-enter='true'
                  onPress={() => onChange(items.filter(x => x.id !== item.id))}>
                  <Icon icon='lucide:x' className='h-3 w-3' />
                </Button>
              </div>
              <Input
                value={item.value}
                placeholder='Value'
                onValueChange={v => {
                  updateItem(item.id, 'value', v)
                  onClearError?.(item.id)
                }}
                size='sm'
                variant='bordered'
                radius='none'
                classNames={{ inputWrapper: 'bg-content2/50 hover:bg-content1 transition-colors border-1' }}
                onKeyDown={handleEnterKey}
              />
              {/* Divider for visual separation if needed, or just relying on border */}
            </SortableItem>
          ))}
          {items.length === 0 && (
            <div className='col-span-full flex flex-col items-center justify-center border-2 border-dashed border-default-200 py-12 text-center'>
              <div className='mb-3 flex h-12 w-12 items-center justify-center bg-content2'>
                <Icon icon='lucide:type' className='h-6 w-6 text-default-400' />
              </div>
              <p className='text-sm text-default-500'>No variables added yet.</p>
              <p className='text-xs text-default-400'>Add variables to replace text in your PDF.</p>
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}

// --- Images Section ---
interface ImagesSectionProps {
  items: ImageItem[]
  onChange: (items: ImageItem[]) => void
  errors?: Record<string, string>
  onClearError?: (id: string) => void
}

export const ImagesSection: React.FC<ImagesSectionProps> = ({ items, onChange, errors, onClearError }) => {
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

  const updateItem = (id: string, updates: Partial<ImageItem['data']> | { key: string }) => {
    onChange(
      items.map(i => {
        if (i.id !== id) return i
        if ('key' in updates) return { ...i, key: updates.key as string }
        return { ...i, data: { ...i.data, ...updates } }
      })
    )
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      updateItem(id, { src: base64 })
    }
    reader.readAsDataURL(file)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
        <div className='grid grid-cols-1 gap-4'>
          {items.map(item => (
            <SortableItem
              key={item.id}
              id={item.id}
              className='group relative flex flex-col gap-2 border border-default-200 bg-content1 p-2 transition-colors hover:border-default-300'>
              <div className='flex items-center gap-2'>
                <DragHandle />
                <Input
                  value={item.key}
                  id={`input-${item.id}`}
                  isInvalid={!!errors?.[item.id]}
                  errorMessage={errors?.[item.id]}
                  size='sm'
                  variant='flat'
                  placeholder='{{image}}'
                  classNames={{
                    input: 'font-mono text-sm font-medium text-default-600',
                    inputWrapper: 'bg-transparent shadow-none px-0 h-auto min-h-0'
                  }}
                  onValueChange={v => {
                    updateItem(item.id, { key: v })
                    onClearError?.(item.id)
                  }}
                  onBlur={() => updateItem(item.id, { key: formatKey(item.key, 'image') })}
                  onKeyDown={handleEnterKey}
                  className='flex-1'
                />
                <Button
                  isIconOnly
                  size='sm'
                  color='danger'
                  variant='light'
                  radius='none'
                  className='h-6 w-6 text-default-400 hover:text-danger'
                  data-skip-enter='true'
                  onPress={() => onChange(items.filter(i => i.id !== item.id))}>
                  <Icon icon='lucide:x' className='h-3 w-3' />
                </Button>
              </div>

              {/* Preview Area */}
              <div className='relative flex h-40 w-full flex-col items-center justify-center overflow-hidden border border-dashed border-default-300 bg-content2 transition-colors hover:bg-content3'>
                {item.data.src ? (
                  item.data.width && Number(item.data.width) > 0 && item.data.height && Number(item.data.height) > 0 ? (
                    <svg
                      viewBox={`0 0 ${item.data.width} ${item.data.height}`}
                      className='max-h-full max-w-full w-auto h-auto shadow-sm bg-content1'
                      preserveAspectRatio='xMidYMid meet'>
                      <image
                        href={item.data.src}
                        width={item.data.width}
                        height={item.data.height}
                        preserveAspectRatio={
                          item.data.fit === 'contain'
                            ? 'xMidYMid meet'
                            : item.data.fit === 'fill'
                              ? 'none'
                              : 'xMidYMid slice'
                        }
                      />
                    </svg>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.data.src}
                      alt='Preview'
                      className='h-full w-full'
                      style={{ objectFit: (item.data.fit as any) || 'cover' }}
                    />
                  )
                ) : (
                  <div className='flex flex-col items-center gap-2 text-default-500'>
                    <Icon icon='lucide:upload' className='h-6 w-6' />
                    <span className='text-xs font-medium'>Upload Image</span>
                  </div>
                )}
                <label className='absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 transition-colors hover:bg-black/5'>
                  <input type='file' className='hidden' accept='image/*' onChange={e => handleFileUpload(e, item.id)} />
                </label>
              </div>

              <Input
                placeholder='Enter URL...'
                value={item.data.src || ''}
                id={`input-${item.id}-src`}
                isInvalid={!!errors?.[`${item.id}-src`]}
                errorMessage={errors?.[`${item.id}-src`]}
                onValueChange={v => {
                  updateItem(item.id, { src: v })
                  onClearError?.(`${item.id}-src`)
                }}
                size='sm'
                variant='bordered'
                radius='none'
                classNames={{ inputWrapper: 'bg-content2/50 border-1' }}
                onKeyDown={handleEnterKey}
                startContent={<Icon icon='lucide:link' className='h-3 w-3 text-default-400' />}
                endContent={
                  <label className='cursor-pointer text-default-400 hover:text-primary'>
                    <Icon icon='lucide:folder-open' className='h-4 w-4' />
                    <input
                      type='file'
                      className='hidden'
                      accept='image/*'
                      onChange={e => handleFileUpload(e, item.id)}
                    />
                  </label>
                }
              />

              <div className='grid grid-cols-3 gap-2'>
                <Input
                  type='number'
                  placeholder='Auto'
                  startContent={<span className='text-[10px] font-semibold text-default-400'>W:</span>}
                  value={item.data.width === 0 ? '' : item.data.width?.toString() || ''}
                  onValueChange={v => {
                    handleNumChange(v, n => updateItem(item.id, { width: n }))
                    onClearError?.(`${item.id}-width`)
                  }}
                  size='sm'
                  variant='bordered'
                  radius='none'
                  classNames={{ inputWrapper: 'bg-content2/50 px-2 border-1' }}
                  onKeyDown={handleEnterKey}
                />
                <Input
                  type='number'
                  placeholder='Auto'
                  startContent={<span className='text-[10px] font-semibold text-default-400'>H:</span>}
                  value={item.data.height === 0 ? '' : item.data.height?.toString() || ''}
                  onValueChange={v => {
                    handleNumChange(v, n => updateItem(item.id, { height: n }))
                    onClearError?.(`${item.id}-height`)
                  }}
                  size='sm'
                  variant='bordered'
                  radius='none'
                  classNames={{ inputWrapper: 'bg-content2/50 px-2 border-1' }}
                  onKeyDown={handleEnterKey}
                />
                <Select
                  selectedKeys={[item.data.fit || 'cover']}
                  onChange={e => {
                    updateItem(item.id, { fit: e.target.value })
                    onClearError?.(`${item.id}-fit`)
                  }}
                  size='sm'
                  variant='bordered'
                  radius='none'
                  aria-label='Fit'
                  classNames={{ trigger: 'bg-content2/50 shadow-none border-1' }}
                  onKeyDown={handleEnterKey}>
                  {['cover', 'contain', 'fill'].map(k => (
                    <SelectItem key={k}>{k}</SelectItem>
                  ))}
                </Select>
              </div>
            </SortableItem>
          ))}
          {items.length === 0 && (
            <div className='col-span-full flex flex-col items-center justify-center border-2 border-dashed border-default-200 py-12 text-center'>
              <div className='mb-3 flex h-12 w-12 items-center justify-center bg-content2'>
                <Icon icon='lucide:image' className='h-6 w-6 text-default-400' />
              </div>
              <p className='text-sm text-default-500'>No images added yet.</p>
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}
interface QrCodesSectionProps {
  items: QrCodeItem[]
  onChange: (items: QrCodeItem[]) => void
  errors?: Record<string, string>
  onClearError?: (id: string) => void
}
export const QrCodesSection: React.FC<QrCodesSectionProps> = ({ items, onChange, errors, onClearError }) => {
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
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
        <div className='grid grid-cols-1 gap-4'>
          {items.map(item => (
            <SortableItem
              key={item.id}
              id={item.id}
              className='group relative flex flex-col gap-3 border border-default-200 bg-content1 p-3 transition-colors hover:border-default-300'>
              <div className='flex items-center gap-2'>
                <DragHandle />
                <Input
                  value={item.key}
                  id={`input-${item.id}`}
                  isInvalid={!!errors?.[item.id]}
                  errorMessage={errors?.[item.id]}
                  size='sm'
                  variant='flat'
                  placeholder='{{qrcode}}'
                  classNames={{
                    input: 'font-mono text-sm font-medium text-default-600',
                    inputWrapper: 'bg-transparent shadow-none px-0 h-auto min-h-0'
                  }}
                  onValueChange={v => {
                    const n = [...items]
                    n.find(x => x.id === item.id)!.key = v
                    onChange(n)
                    onClearError?.(item.id)
                  }}
                  onBlur={() => {
                    const n = [...items]
                    n.find(x => x.id === item.id)!.key = formatKey(item.key, 'qrcode')
                    onChange(n)
                  }}
                  className='flex-1'
                  onKeyDown={handleEnterKey}
                />
                <Button
                  isIconOnly
                  size='sm'
                  color='danger'
                  variant='light'
                  radius='none'
                  className='h-6 w-6 text-default-400 hover:text-danger'
                  data-skip-enter='true'
                  onPress={() => onChange(items.filter(x => x.id !== item.id))}>
                  <Icon icon='lucide:x' className='h-3 w-3' />
                </Button>
              </div>

              <Input
                placeholder='QR Code Value'
                value={item.data.text}
                id={`input-${item.id}-text`}
                isInvalid={!!errors?.[`${item.id}-text`]}
                errorMessage={errors?.[`${item.id}-text`]}
                onValueChange={v => {
                  const n = [...items]
                  n.find(x => x.id === item.id)!.data.text = v
                  onChange(n)
                  onClearError?.(`${item.id}-text`)
                }}
                size='sm'
                variant='bordered'
                radius='none'
                classNames={{ inputWrapper: 'bg-content2/50 border-1' }}
                onKeyDown={handleEnterKey}
              />

              <div className='flex gap-2'>
                <Input
                  placeholder='Size (200)'
                  startContent={<span className='text-[10px] font-semibold text-default-400'>Size:</span>}
                  type='number'
                  value={item.data.size === 0 ? '' : item.data.size?.toString() || ''}
                  onValueChange={v => {
                    handleNumChange(v, val => {
                      const n = [...items]
                      n.find(x => x.id === item.id)!.data.size = val
                      onChange(n)
                    })
                    onClearError?.(`${item.id}-size`)
                  }}
                  size='sm'
                  variant='bordered'
                  radius='none'
                  classNames={{ inputWrapper: 'bg-content2/50 px-2 border-1' }}
                  onKeyDown={handleEnterKey}
                  className='flex-1'
                />
                <Input
                  startContent={<span className='text-[10px] font-semibold text-default-400'>Color:</span>}
                  value={item.data.color || '#000000'}
                  onValueChange={v => {
                    const n = [...items]
                    n.find(x => x.id === item.id)!.data.color = v
                    onChange(n)
                    onClearError?.(`${item.id}-color`)
                  }}
                  size='sm'
                  variant='bordered'
                  radius='none'
                  classNames={{ inputWrapper: 'bg-content2/50 px-2 border-1' }}
                  onKeyDown={handleEnterKey}
                  className='flex-1'
                />
              </div>
            </SortableItem>
          ))}
          {items.length === 0 && (
            <div className='col-span-full flex flex-col items-center justify-center border-2 border-dashed border-default-200 py-12 text-center'>
              <div className='mb-3 flex h-12 w-12 items-center justify-center bg-content2'>
                <Icon icon='lucide:qr-code' className='h-6 w-6 text-default-400' />
              </div>
              <p className='text-sm text-default-500'>No QR codes added yet.</p>
            </div>
          )}
        </div>
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
export const BarcodesSection: React.FC<BarcodesSectionProps> = ({ items, onChange, errors, onClearError }) => {
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
        <div className='grid grid-cols-1 gap-4'>
          {items.map(item => (
            <SortableItem
              key={item.id}
              id={item.id}
              className='group relative flex flex-col gap-3 border border-default-200 bg-content1 p-3 transition-colors hover:border-default-300'>
              <div className='flex items-center gap-2'>
                <DragHandle />
                <Input
                  value={item.key}
                  id={`input-${item.id}`}
                  isInvalid={!!errors?.[item.id]}
                  errorMessage={errors?.[item.id]}
                  size='sm'
                  variant='flat'
                  placeholder='{{barcode}}'
                  classNames={{
                    input: 'font-mono text-sm font-medium text-default-600',
                    inputWrapper: 'bg-transparent shadow-none px-0 h-auto min-h-0'
                  }}
                  onValueChange={v => {
                    const n = [...items]
                    n.find(x => x.id === item.id)!.key = v
                    onChange(n)
                    onClearError?.(item.id)
                  }}
                  onBlur={() => {
                    const n = [...items]
                    n.find(x => x.id === item.id)!.key = formatKey(item.key, 'barcode')
                    onChange(n)
                  }}
                  className='flex-1'
                  onKeyDown={handleEnterKey}
                />
                <Button
                  isIconOnly
                  size='sm'
                  color='danger'
                  variant='light'
                  radius='none'
                  className='h-6 w-6 text-default-400 hover:text-danger'
                  data-skip-enter='true'
                  onPress={() => onChange(items.filter(x => x.id !== item.id))}>
                  <Icon icon='lucide:x' className='h-3 w-3' />
                </Button>
              </div>

              <Input
                placeholder='Barcode Value'
                value={item.data.text}
                id={`input-${item.id}-text`}
                isInvalid={!!errors?.[`${item.id}-text`]}
                errorMessage={errors?.[`${item.id}-text`]}
                onValueChange={v => {
                  const n = [...items]
                  n.find(x => x.id === item.id)!.data.text = v
                  onChange(n)
                  onClearError?.(`${item.id}-text`)
                }}
                size='sm'
                variant='bordered'
                radius='none'
                classNames={{ inputWrapper: 'bg-content2/50 border-1' }}
                onKeyDown={handleEnterKey}
              />
              <div className='grid grid-cols-2 gap-2'>
                <div className='group relative'>
                  <Select
                    selectedKeys={[item.data.format || 'Code128']}
                    onChange={e => {
                      const n = [...items]
                      n.find(x => x.id === item.id)!.data.format = e.target.value as BarcodeDataRequest['format']
                      onChange(n)
                      onClearError?.(`${item.id}-format`)
                    }}
                    size='sm'
                    variant='bordered'
                    radius='none'
                    aria-label='Format'
                    classNames={{ trigger: 'bg-content2/50 shadow-none border-1' }}
                    onKeyDown={handleEnterKey}>
                    {['Code128', 'EAN13'].map(k => (
                      <SelectItem key={k}>{k}</SelectItem>
                    ))}
                  </Select>
                </div>
                <Checkbox
                  isSelected={item.data.includeText}
                  classNames={{ label: 'text-xs text-default-500' }}
                  onValueChange={v => {
                    const n = [...items]
                    n.find(x => x.id === item.id)!.data.includeText = v
                    onChange(n)
                    onClearError?.(`${item.id}-includeText`)
                  }}>
                  Show Text
                </Checkbox>
              </div>
            </SortableItem>
          ))}
          {items.length === 0 && (
            <div className='col-span-full flex flex-col items-center justify-center border-2 border-dashed border-default-200 py-12 text-center'>
              <div className='mb-3 flex h-12 w-12 items-center justify-center bg-content2'>
                <Icon icon='lucide:barcode' className='h-6 w-6 text-default-400' />
              </div>
              <p className='text-sm text-default-500'>No barcodes added yet.</p>
            </div>
          )}
        </div>
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

const TableEditor = ({
  item,
  index,
  onUpdate,
  onDelete,
  error,
  onClearError
}: {
  item: TableItem
  index: number
  onUpdate: (i: TableItem) => void
  onDelete: () => void
  error?: string
  onClearError?: (id: string) => void
}) => {
  // Column Sorting
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  // Default open if sort exists
  const [selectedKeys, setSelectedKeys] = useState<Selection>(
    new Set((item.sort?.length || 0) > 0 ? ['advanced'] : ['advanced'])
  )

  // Add Column
  const [newCol, setNewCol] = useState('')

  const handleAddCol = () => {
    if (!newCol) return
    let formatted = formatKey(newCol, 'table')

    // Ensure uniqueness
    if (item.columns.includes(formatted)) {
      // simple fallback for uniqueness if user tries same name
      formatted = formatted.replace('}}', `_${Math.floor(Math.random() * 1000)}}`)
    }

    onUpdate({
      ...item,
      columns: [...item.columns, formatted]
    })
    setNewCol('')
  }

  const handleDeleteCol = (colName: string) => {
    onUpdate({
      ...item,
      columns: item.columns.filter(c => c !== colName)
    })
  }

  const handleColDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = item.columns.indexOf(active.id as string)
      const newIndex = item.columns.indexOf(over.id as string)
      onUpdate({ ...item, columns: arrayMove(item.columns, oldIndex, newIndex) })
    }
  }

  const addRow = () => {
    onUpdate({ ...item, rows: [...item.rows, {}] })
  }

  const updateRow = (idx: number, col: string, val: string) => {
    const newRows = [...item.rows]
    newRows[idx] = { ...newRows[idx], [col]: val }
    onUpdate({ ...item, rows: newRows })
  }

  const deleteRow = (idx: number) => {
    onUpdate({ ...item, rows: item.rows.filter((_, i) => i !== idx) })
  }

  return (
    <div className='flex w-full flex-col gap-4 pb-4'>
      <div className='flex items-center justify-between gap-4 rounded border border-default-100 bg-content2 p-2'>
        <div className='flex flex-1 items-center gap-2'>
          <DragHandle />
          <span className='font-semibold text-default-700'>Table {index + 1}</span>
        </div>

        {/* Delete Table Button */}
        <Button
          isIconOnly
          size='sm'
          color='danger'
          variant='light'
          radius='none'
          className='h-6 w-6 text-default-400 hover:text-danger'
          data-skip-enter='true'
          onPress={onDelete}>
          <Icon icon='lucide:x' className='h-3 w-3' />
        </Button>
      </div>

      {/* Table Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColDragEnd}>
        <SortableContext items={item.columns} strategy={horizontalListSortingStrategy}>
      <div className='overflow-x-auto rounded-lg border border-default-200'>
        <table className='w-full text-left text-sm'>
          <thead className='bg-content3 font-medium text-default-600'>
                <tr>
                  {item.columns.map(col => {
                    return (
                      <SortableHeaderItem key={col} id={col} className='min-w-[100px] border-b border-l p-2'>
                        <div className='flex w-full items-center justify-between gap-1'>
                          <span className='font-mono text-xs'>{col}</span>
                          <button onClick={() => handleDeleteCol(col)} className='text-danger hover:text-danger'>
                            <Icon icon='lucide:x' className='h-3 w-3' />
                          </button>
                        </div>
                      </SortableHeaderItem>
                    )
                  })}
                  <th className='min-w-[100px] border-b border-l bg-content2/50 p-2'>
                    <div className='flex items-center gap-1'>
                      <Input
                        placeholder='New Col'
                        value={newCol}
                        onValueChange={setNewCol}
                        size='sm'
                        variant='bordered'
                        classNames={{ inputWrapper: 'bg-content1 shadow-none border-1 h-8 min-h-0' }}
                        className='flex-1'
                        onKeyDown={e => e.key === 'Enter' && handleAddCol()}
                      />
                      <Button
                        size='sm'
                        isIconOnly
                        color='primary'
                        variant='light'
                        onPress={handleAddCol}
                        className='h-8 w-8 min-w-0'>
                        <Icon icon='lucide:plus' className='h-4 w-4' />
                      </Button>
                    </div>
                  </th>
                  {/* Spacer for row delete action */}
                  <th className='w-10 border-b p-2'></th>
                </tr>
          </thead>
          <tbody>
            {item.rows.map((row, rIdx) => (
              <tr key={rIdx} className='group hover:bg-content2'>
                {item.columns.map(col => (
                  <td key={col} className='border-b border-l p-1'>
                    <input
                      className='w-full bg-transparent p-1 text-foreground outline-none'
                      value={row[col] ?? ''}
                      onChange={e => updateRow(rIdx, col, e.target.value)}
                      onKeyDown={handleEnterKey}
                    />
                  </td>
                ))}
                {/* Spacer for New Column Header alignment */}
                <td className='border-b border-l bg-content2/30 p-1'></td>
                <td className='border-b p-2 text-center'>
                  <button
                    onClick={() => deleteRow(rIdx)}
                    data-skip-enter='true'
                    className='text-default-300 hover:text-danger'>
                    <Icon icon='lucide:x' className='h-4 w-4' />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {item.rows.length === 0 && <div className='p-8 text-center italic text-default-400'>No rows added</div>}
      </div>
        </SortableContext>
      </DndContext>

      <Button
        size='sm'
        variant='flat'
        onPress={addRow}
        className='w-full border border-default-200 bg-content1 font-medium shadow-sm transition-colors hover:bg-content2'>
        <Icon icon='lucide:plus' className='mr-1 h-4 w-4 text-default-400' /> Add Row
      </Button>

      {/* Sort and Group Options */}
      <div className='w-full'>
        <Accordion
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          variant='light'
          className='px-0'
          isCompact>
          <AccordionItem
            key='advanced'
            aria-label='Advanced Settings'
            title={
              <div className='flex items-center gap-2 text-sm font-medium text-default-600'>
                <Icon icon='lucide:settings-2' className='h-4 w-4' />
                Advanced Table Settings
                <ProChip/>
              </div>
            }
            className='px-0'
            classNames={{
              title: 'text-sm font-medium',
              content: 'pt-2 pb-4'
            }}>
            <div className='flex flex-col gap-6 rounded-lg border border-default-100 bg-content2/50 p-4'>
              {/* Sort Section */}
              <div className='flex flex-col gap-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Icon icon='lucide:arrow-up-down' className='h-4 w-4 text-primary' />
                    <span className='text-sm font-semibold text-default-700'>Sort</span>
                  </div>
                  <Button
                    size='sm'
                    color='primary'
                    variant='solid'
                    onPress={() => {
                      onUpdate({
                        ...item,
                        sort: [
                          ...(item.sort && item.sort.length > 0 ? item.sort : [{ field: '', direction: '' }]),
                          { field: '', direction: '' }
                        ]
                      })
                    }}
                    className='h-7 min-w-0 px-3 text-xs font-medium'>
                    + Add
                  </Button>
                </div>

                <div className='mt-2 flex flex-col gap-3'>
                  {(item.sort && item.sort.length > 0 ? item.sort : [{ field: '', direction: '' }]).map((rule, idx) => (
                    <div key={idx} className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
                      <Select
                        aria-label='Sort Column'
                        label='Sort Column'
                        placeholder='Select column...'
                        selectedKeys={rule.field ? [rule.field] : []}
                        onChange={e => {
                          const newSort = [
                            ...(item.sort && item.sort.length > 0 ? item.sort : [{ field: '', direction: '' }])
                          ]
                          newSort[idx] = { ...newSort[idx], field: e.target.value }
                          onUpdate({ ...item, sort: newSort })
                        }}
                        size='sm'
                        variant='bordered'
                        classNames={{ trigger: 'bg-content1 shadow-none border-1' }}>
                        {item.columns.map(col => {
                          const clean = col.replace('{{row:', '').replace('}}', '')
                          return (
                            <SelectItem key={clean} textValue={clean}>
                              {clean}
                            </SelectItem>
                          )
                        })}
                      </Select>

                      <div className='flex items-center gap-2'>
                        <Select
                          aria-label='Sort Order'
                          label='Sort Order'
                          placeholder='Order'
                          selectedKeys={rule.direction ? [rule.direction] : []}
                          onChange={e => {
                            const newSort = [
                              ...(item.sort && item.sort.length > 0 ? item.sort : [{ field: '', direction: '' }])
                            ]
                            newSort[idx] = { ...newSort[idx], direction: e.target.value }
                            onUpdate({ ...item, sort: newSort })
                          }}
                          size='sm'
                          variant='bordered'
                          className='flex-1'
                          classNames={{ trigger: 'bg-content1 shadow-none border-1' }}>
                          <SelectItem key='asc' textValue='Ascending'>
                            Ascending
                          </SelectItem>
                          <SelectItem key='desc' textValue='Descending'>
                            Descending
                          </SelectItem>
                        </Select>

                        {(item.sort && item.sort.length > 0 ? item.sort : [{ field: '', direction: '' }]).length >
                          1 && (
                          <Button
                            isIconOnly
                            size='sm'
                            color='danger'
                            variant='light'
                            onPress={() => {
                              const newSort = [...item.sort!]
                              newSort.splice(idx, 1)
                              onUpdate({ ...item, sort: newSort })
                            }}
                            className='h-12 w-12 min-w-0 flex-shrink-0'>
                            <Icon icon='lucide:trash-2' className='h-4 w-4' />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced Grouping Config */}
              <div className='mt-2 flex flex-col gap-3 border-t border-default-100 pt-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Icon icon='lucide:network' className='h-4 w-4 text-primary' />
                    <span className='text-sm font-semibold text-default-700'>Vertical Merge & Collapse</span>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
                  <div className='flex flex-col gap-3'>
                    <Select
                      label='Vertical Merge'
                      placeholder='Select columns...'
                      selectionMode='multiple'
                      selectedKeys={new Set(item.verticalMerge || [])}
                      onSelectionChange={keys => onUpdate({ ...item, verticalMerge: Array.from(keys) as string[] })}
                      size='sm'
                      variant='bordered'
                      isMultiline={true}
                      renderValue={items => (
                        <div className='flex flex-wrap gap-1 py-1'>
                          {items.map(i => (
                            <Chip
                              key={i.key}
                              size='sm'
                              variant='flat'
                              color='primary'
                              className='h-5 text-[11px] font-medium'>
                              {i.textValue}
                            </Chip>
                          ))}
                        </div>
                      )}
                      classNames={{ trigger: 'bg-content1 shadow-none border-1' }}>
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

                  <div className='flex flex-col gap-3'>
                    <Select
                      label='Data Collapsing'
                      placeholder='Select columns...'
                      selectionMode='multiple'
                      selectedKeys={new Set(item.collapse || [])}
                      onSelectionChange={keys => onUpdate({ ...item, collapse: Array.from(keys) as string[] })}
                      size='sm'
                      variant='bordered'
                      isMultiline={true}
                      renderValue={items => (
                        <div className='flex flex-wrap gap-1 py-1'>
                          {items.map(i => (
                            <Chip
                              key={i.key}
                              size='sm'
                              variant='flat'
                              color='primary'
                              className='h-5 text-[11px] font-medium'>
                              {i.textValue}
                            </Chip>
                          ))}
                        </div>
                      )}
                      classNames={{ trigger: 'bg-content1 shadow-none border-1' }}>
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

                <div className='mt-4 rounded-lg border border-default-200 bg-content2 p-4'>
                  <div className='mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground'>
                    <Icon icon='lucide:file-text' className='h-4 w-4 text-primary' />
                    <span>Word Template Markers</span>
                  </div>
                  <div className='mb-4 text-[10px] text-default-500'>
                    Just place these markers anywhere in your template.
                  </div>

                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                    {/* Structure */}
                    <div className='flex flex-col gap-2'>
                      <span className='text-[10px] font-bold uppercase tracking-wider text-default-400'>
                        Structure & Counts
                      </span>
                      <div className='flex flex-col gap-3 rounded border border-default-200 bg-content1 p-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]'>
                        <div className='flex flex-col items-start gap-0.5'>
                          <code className='max-w-full truncate rounded border border-default-200 bg-content2 px-1.5 py-0.5 text-left font-mono text-[10px] font-medium text-foreground shadow-sm'>{`{{group:field}}`}</code>
                          <span className='text-[10px] text-default-600'>Header row</span>
                        </div>
                        <div className='flex flex-col items-start gap-0.5'>
                          <code className='max-w-full truncate rounded border border-default-200 bg-content2 px-1.5 py-0.5 text-left font-mono text-[10px] font-medium text-foreground shadow-sm'>{`{{table_count}}`}</code>
                          <span className='text-[10px] text-default-600'>Total rows</span>
                        </div>
                        <div className='flex flex-col items-start gap-0.5'>
                          <code className='max-w-full truncate rounded border border-default-200 bg-content2 px-1.5 py-0.5 text-left font-mono text-[10px] font-medium text-foreground shadow-sm'>{`{{group_count}}`}</code>
                          <span className='text-[10px] text-default-600'>Group rows</span>
                        </div>
                      </div>
                    </div>

                    {/* Sums */}
                    <div className='flex flex-col gap-2'>
                      <span className='text-[10px] font-bold uppercase tracking-wider text-default-400'>Sums</span>
                      <div className='flex flex-col gap-3 rounded border border-default-200 bg-content1 p-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]'>
                        <div className='flex flex-col items-start gap-0.5'>
                          <code className='max-w-full truncate rounded border border-default-200 bg-content2 px-1.5 py-0.5 text-left font-mono text-[10px] font-medium text-foreground shadow-sm'>{`{{table_sum:field}}`}</code>
                          <span className='text-[10px] text-default-600'>Grand total</span>
                        </div>
                        <div className='flex flex-col items-start gap-0.5'>
                          <code className='max-w-full truncate rounded border border-default-200 bg-content2 px-1.5 py-0.5 text-left font-mono text-[10px] font-medium text-foreground shadow-sm'>{`{{group_sum:field}}`}</code>
                          <span className='text-[10px] text-default-600'>Group total</span>
                        </div>
                        <div className='flex flex-col items-start gap-0.5'>
                          <code className='max-w-full truncate rounded border border-default-200 bg-content2 px-1.5 py-0.5 text-left font-mono text-[10px] font-medium text-foreground shadow-sm'>{`{{row_sum:a,b}}`}</code>
                          <span className='text-[10px] text-default-600'>Row total</span>
                        </div>
                      </div>
                    </div>

                    {/* Averages */}
                    <div className='flex flex-col gap-2'>
                      <span className='text-[10px] font-bold uppercase tracking-wider text-default-400'>Averages</span>
                      <div className='flex flex-col gap-3 rounded border border-default-200 bg-content1 p-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]'>
                        <div className='flex flex-col items-start gap-0.5'>
                          <code className='max-w-full truncate rounded border border-default-200 bg-content2 px-1.5 py-0.5 text-left font-mono text-[10px] font-medium text-foreground shadow-sm'>{`{{table_avg:field}}`}</code>
                          <span className='text-[10px] text-default-600'>Table avg</span>
                        </div>
                        <div className='flex flex-col items-start gap-0.5'>
                          <code className='max-w-full truncate rounded border border-default-200 bg-content2 px-1.5 py-0.5 text-left font-mono text-[10px] font-medium text-foreground shadow-sm'>{`{{group_avg:field}}`}</code>
                          <span className='text-[10px] text-default-600'>Group avg</span>
                        </div>
                        <div className='flex flex-col items-start gap-0.5'>
                          <code className='max-w-full truncate rounded border border-default-200 bg-content2 px-1.5 py-0.5 text-left font-mono text-[10px] font-medium text-foreground shadow-sm'>{`{{row_avg:a,b}}`}</code>
                          <span className='text-[10px] text-default-600'>Row avg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}

export const TablesSection: React.FC<TablesSectionProps> = ({ items, onChange, errors, onClearError }) => {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id)
      const newIndex = items.findIndex(i => i.id === over.id)
      onChange(arrayMove(items, oldIndex, newIndex))
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
          <div className='flex flex-col gap-4'>
            {items.map((item, index) => (
              <SortableItem
                key={item.id}
                id={item.id}
                className='rounded-lg border border-default-200 bg-content1 p-3 pr-4 shadow-none'>
                <TableEditor
                  item={item}
                  index={index}
                  error={errors?.[item.id]}
                  onUpdate={u => onChange(items.map(x => (x.id === item.id ? u : x)))}
                  onDelete={() => onChange(items.filter(x => x.id !== item.id))}
                  onClearError={onClearError}
                />
              </SortableItem>
            ))}
            {items.length === 0 && (
              <div className='flex flex-col items-center justify-center border-2 border-dashed border-default-200 py-12 text-center'>
                <div className='mb-3 flex h-12 w-12 items-center justify-center bg-content2'>
                  <Icon icon='lucide:table' className='h-6 w-6 text-default-400' />
                </div>
                <p className='text-sm text-default-500'>No tables added yet.</p>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

export interface FileSettingsSectionProps {
  fileName: string
  filePassword?: string
  watermark?: string
  onChange: (updates: { fileName?: string; filePassword?: string; watermark?: string }) => void
}

export const FileSettingsSection: React.FC<FileSettingsSectionProps> = ({
  fileName,
  filePassword,
  watermark,
  onChange
}) => {
  return (
    <div className='flex flex-col gap-6'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <Input
          label='File Name'
          placeholder='e.g. Invoice_2024'
          value={fileName}
          onChange={e => onChange({ fileName: e.target.value })}
          labelPlacement='outside'
          variant='bordered'
          radius='none'
        />
        <Input
          label='File Password (Encryption)'
          placeholder='Optional'
          value={filePassword}
          onChange={e => onChange({ filePassword: e.target.value })}
          labelPlacement='outside'
          variant='bordered'
          radius='none'
          type='password'
          startContent={<Icon icon='lucide:lock' className='text-default-400' />}
        />
      </div>
      <Textarea
        label='Watermark Text'
        placeholder='Optional: e.g. CONFIDENTIAL'
        value={watermark || ''}
        onChange={e => onChange({ watermark: e.target.value })}
        labelPlacement='outside'
        variant='bordered'
        radius='none'
        minRows={2}
        startContent={<Icon icon='lucide:droplets' className='text-default-400' />}
      />
      <div className='rounded-sm bg-primary/8 p-4 ring-1 ring-inset ring-primary/20'>
        <div className='flex gap-2 text-primary'>
          <Icon icon='lucide:info' className='h-5 w-5 shrink-0' />
          <p className='text-xs leading-relaxed'>
            <strong>Security Note:</strong> These settings are applied during the PDF generation process. Passwords are
            encrypted in transit.
          </p>
        </div>
      </div>
    </div>
  )
}
