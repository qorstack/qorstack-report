import React, { useState, useContext } from 'react'
import { Button, Input, Checkbox, Select, SelectItem, Accordion, AccordionItem, Chip, cn } from '@heroui/react'
import Icon from '@/components/icon'
import { SortDefinition } from '@/api/generated/main-service/apiGenerated'
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
import {
  ExcelTableItem,
  ConditionalFormatConfig,
  ConditionalFormatRule,
  SplitToSheetsConfig
} from '@/types/excel-sandbox'
import { formatKey, handleEnterKey, generateId } from '@/components/pdf/SandboxInputs'

// Re-export shared types and sections from PDF SandboxInputs
export {
  ReplacementsSection,
  ImagesSection,
  QrCodesSection,
  BarcodesSection,
  FileSettingsSection,
  generateId,
  formatKey,
  handleEnterKey
} from '@/components/pdf/SandboxInputs'
export type { ReplaceItem, ImageItem, QrCodeItem, BarcodeItem } from '@/components/pdf/SandboxInputs'

// --- DnD Helpers (mirrored from PDF SandboxInputs) ---

// Context lets DragHandle pick up listeners from its enclosing SortableItem
// without prop drilling — only the handle icon initiates a drag.
type UseSortableReturn = ReturnType<typeof useSortable>
interface DragHandleCtx {
  listeners: UseSortableReturn['listeners']
  setActivatorRef: UseSortableReturn['setActivatorNodeRef']
}
const DragHandleContext = React.createContext<DragHandleCtx | null>(null)

const DragHandle = () => {
  const ctx = useContext(DragHandleContext)
  return (
    <div
      ref={ctx?.setActivatorRef}
      {...ctx?.listeners}
      className='flex cursor-grab items-center text-default-300 hover:text-default-500 active:cursor-grabbing'>
      <Icon icon='lucide:grip-vertical' className='h-4 w-4' />
    </div>
  )
}

const SortableItem = ({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined
  }
  return (
    <DragHandleContext.Provider value={{ listeners, setActivatorRef: setActivatorNodeRef }}>
      <div ref={setNodeRef} style={style} {...attributes} className={className}>
        {children}
      </div>
    </DragHandleContext.Provider>
  )
}

const SortableHeaderItem = ({
  id,
  children,
  className
}: {
  id: string
  children: React.ReactNode
  className?: string
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <th ref={setNodeRef} style={style} {...attributes} {...listeners} className={className}>
      {children}
    </th>
  )
}

// =====================================================================================
// Advanced Excel field editors (generateTotals / numberFormat / conditionalFormat / splitToSheets)
// Kept inline because they're only used inside ExcelTableEditor.
// =====================================================================================

const cleanCol = (col: string) => col.replace(/^\{\{row:/, '').replace(/\}\}$/, '')

// --- Shared row / control styling — mirrors PDF ReplacementsSection so the
// Excel sandbox reads in the same visual language as PDF Variables. ---

const rowShell = (filled: boolean) =>
  cn(
    'group flex items-center gap-1.5 rounded-lg border-l-[3px] px-1.5 py-1 transition-colors duration-200',
    // Filled = complete (brand-tint). Empty = neutral gray (clearly distinct).
    filled ? 'builder-complete-row hover:bg-content2/60' : 'builder-empty-row border-l-transparent'
  )

const fieldInputClasses = {
  inputWrapper: 'builder-field border h-8 min-h-0 px-2.5 rounded-md transition-all duration-200'
}

const fieldSelectTrigger = 'builder-field border h-8 min-h-0 px-2.5 rounded-md transition-all duration-200'

const deleteRowBtn =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-default-300/45 opacity-70 transition-all duration-200 hover:bg-danger/10 hover:text-danger-500 hover:opacity-100'

// Summary bar — filled/empty counts + filter toggle + jump-to-next-empty.
interface RowSummaryProps {
  total: number
  filled: number
  showEmptyOnly: boolean
  onToggleEmptyOnly: () => void
  onJumpNextEmpty?: () => void
  itemLabel?: string
}

const RowSummary: React.FC<RowSummaryProps> = ({
  total,
  filled,
  showEmptyOnly,
  onToggleEmptyOnly,
  onJumpNextEmpty,
  itemLabel = 'filled'
}) => {
  if (total === 0) return null
  const empty = total - filled
  return (
    <div className='mb-2 flex items-center justify-between gap-2 px-1'>
      <div className='flex items-center gap-2 text-[11px] font-semibold'>
        <span className='text-default-600'>
          {filled}/{total} {itemLabel}
        </span>
        <span className='text-default-400/40'>·</span>
        {empty > 0 ? (
          <button
            type='button'
            onClick={onToggleEmptyOnly}
            className={cn(
              'flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors duration-200',
              showEmptyOnly
                ? 'builder-attention-chip'
                : 'builder-attention-text hover:bg-[var(--builder-attention-chip-bg)]'
            )}
            title={showEmptyOnly ? 'Show all' : 'Filter empty only'}>
            <span className='builder-attention-dot h-1.5 w-1.5 rounded-full' />
            {empty} empty
            {showEmptyOnly && <Icon icon='lucide:x' className='h-3 w-3' />}
          </button>
        ) : (
          <span className='flex items-center gap-1 text-primary'>
            <Icon icon='lucide:check' className='h-3 w-3' />
            All filled
          </span>
        )}
      </div>
      {empty > 0 && onJumpNextEmpty && (
        <button
          type='button'
          onClick={onJumpNextEmpty}
          className='flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold text-default-500 transition-colors duration-200 hover:bg-content2 hover:text-foreground'
          title='Focus next empty entry'>
          Next empty
          <Icon icon='lucide:arrow-down' className='h-3 w-3' />
        </button>
      )}
    </div>
  )
}

interface ConditionalFormatEditorProps {
  columns: string[]
  value?: ConditionalFormatConfig[]
  onChange: (next: ConditionalFormatConfig[] | undefined) => void
}

const CF_OPERATORS = ['=', '!=', '>', '>=', '<', '<=', 'contains', 'startsWith', 'endsWith']

const ConditionalFormatEditor: React.FC<ConditionalFormatEditorProps> = ({ columns, value, onChange }) => {
  const configs = value || []
  const [showEmptyOnly, setShowEmptyOnly] = useState(false)
  const filled = configs.filter(c => !!c.field).length

  const commit = (next: ConditionalFormatConfig[]) => {
    onChange(next.length === 0 ? undefined : next)
  }

  const addConfig = () => commit([...configs, { field: '', rules: [{}] }])
  const removeConfig = (i: number) => commit(configs.filter((_, idx) => idx !== i))

  const updateConfig = (i: number, patch: Partial<ConditionalFormatConfig>) => {
    const next = [...configs]
    next[i] = { ...next[i], ...patch }
    commit(next)
  }

  const updateRule = (ci: number, ri: number, patch: Partial<ConditionalFormatRule>) => {
    const next = [...configs]
    next[ci] = { ...next[ci], rules: next[ci].rules.map((r, idx) => (idx === ri ? { ...r, ...patch } : r)) }
    commit(next)
  }

  const jumpToNextEmpty = () => {
    const idx = configs.findIndex(c => !c.field)
    if (idx >= 0) {
      const el = document.getElementById(`cf-field-${idx}`)
      el?.focus()
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center justify-between'>
        <div>
          <span className='text-xs font-semibold text-default-700'>Conditional Formatting</span>
          <p className='text-[11px] text-default-500'>Apply cell colors when values match a rule.</p>
        </div>
        <Button size='sm' variant='flat' color='primary' className='h-7 min-w-0 px-2 text-xs' onPress={addConfig}>
          + Field
        </Button>
      </div>

      <RowSummary
        total={configs.length}
        filled={filled}
        showEmptyOnly={showEmptyOnly}
        onToggleEmptyOnly={() => setShowEmptyOnly(v => !v)}
        onJumpNextEmpty={jumpToNextEmpty}
        itemLabel='with field'
      />

      {configs.length === 0 ? (
        <p className='text-[11px] italic text-default-500'>No rules yet.</p>
      ) : (
        <div className='flex flex-col gap-1'>
          {configs
            .map((cfg, ci) => ({ cfg, ci }))
            .filter(({ cfg }) => !showEmptyOnly || !cfg.field)
            .map(({ cfg, ci }) => {
              const hasField = !!cfg.field
              return (
                <div key={ci} className={cn(rowShell(hasField), 'flex-col items-stretch gap-2 py-1.5')}>
                  <div className='flex items-center gap-1.5'>
                    <Icon icon='lucide:paintbrush' className='h-3.5 w-3.5 shrink-0 text-default-400' />
                    <Select
                      id={`cf-field-${ci}`}
                      size='sm'
                      variant='flat'
                      aria-label='Field'
                      placeholder='Select column...'
                      selectedKeys={cfg.field ? [cfg.field] : []}
                      onChange={e => updateConfig(ci, { field: e.target.value })}
                      className='flex-1'
                      classNames={{ trigger: fieldSelectTrigger }}>
                      {columns.map(col => (
                        <SelectItem key={cleanCol(col)} textValue={cleanCol(col)}>
                          {cleanCol(col)}
                        </SelectItem>
                      ))}
                    </Select>
                    <button
                      type='button'
                      onClick={() => removeConfig(ci)}
                      title='Remove field'
                      className={deleteRowBtn}>
                      <Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />
                    </button>
                  </div>

                  <div className='flex flex-col gap-1 pl-5'>
                    {cfg.rules.map((rule, ri) => (
                      <div key={ri} className='grid grid-cols-1 gap-1.5 rounded-md bg-content2/30 p-1.5 sm:grid-cols-6'>
                        <Select
                          size='sm'
                          variant='flat'
                          aria-label='operator'
                          selectedKeys={rule.operator ? [rule.operator] : ['=']}
                          onChange={e => updateRule(ci, ri, { operator: e.target.value })}
                          className='sm:col-span-2'
                          classNames={{ trigger: fieldSelectTrigger }}>
                          {CF_OPERATORS.map(op => (
                            <SelectItem key={op}>{op}</SelectItem>
                          ))}
                        </Select>
                        <Input
                          size='sm'
                          variant='flat'
                          placeholder='Value'
                          value={String(rule.value ?? '')}
                          onValueChange={v => updateRule(ci, ri, { value: v })}
                          className='sm:col-span-2'
                          classNames={fieldInputClasses}
                        />
                        <Input
                          size='sm'
                          variant='flat'
                          type='color'
                          aria-label='Font color'
                          value={rule.fontColor || '#000000'}
                          onChange={e => updateRule(ci, ri, { fontColor: e.target.value })}
                          classNames={fieldInputClasses}
                        />
                        <Input
                          size='sm'
                          variant='flat'
                          type='color'
                          aria-label='Background color'
                          value={rule.backgroundColor || '#FFFFFF'}
                          onChange={e => updateRule(ci, ri, { backgroundColor: e.target.value })}
                          classNames={fieldInputClasses}
                        />
                        <div className='flex items-center gap-3 sm:col-span-6'>
                          <Checkbox
                            isSelected={!!rule.bold}
                            onValueChange={b => updateRule(ci, ri, { bold: b })}
                            size='sm'>
                            <span className='text-xs'>Bold</span>
                          </Checkbox>
                          <Checkbox
                            isSelected={!!rule.italic}
                            onValueChange={b => updateRule(ci, ri, { italic: b })}
                            size='sm'>
                            <span className='text-xs'>Italic</span>
                          </Checkbox>
                          <Button
                            size='sm'
                            variant='light'
                            color='danger'
                            className='ml-auto h-7 min-w-0 px-2 text-xs'
                            onPress={() => {
                              const next = [...configs]
                              next[ci] = { ...next[ci], rules: next[ci].rules.filter((_, idx) => idx !== ri) }
                              commit(next)
                            }}>
                            Remove rule
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      size='sm'
                      variant='flat'
                      className='h-7 min-w-0 self-start px-2 text-xs'
                      onPress={() => updateConfig(ci, { rules: [...cfg.rules, {}] })}>
                      + Add rule
                    </Button>
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

interface SplitToSheetsEditorProps {
  value?: SplitToSheetsConfig
  onChange: (next: SplitToSheetsConfig | undefined) => void
}

const SplitToSheetsEditor: React.FC<SplitToSheetsEditorProps> = ({ value, onChange }) => {
  const enabled = !!value
  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center justify-between'>
        <span className='text-xs font-semibold text-default-700'>Split to Sheets</span>
        <Checkbox size='sm' isSelected={enabled} onValueChange={on => onChange(on ? { field: '' } : undefined)}>
          <span className='text-xs'>Enabled</span>
        </Checkbox>
      </div>
      <span className='text-[11px] text-default-400'>Creates one sheet per distinct value of the field.</span>
      {enabled && (
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
          <Input
            size='sm'
            variant='flat'
            radius='sm'
            label='Group by Field'
            labelPlacement='outside'
            placeholder='e.g. region'
            value={value?.field ?? ''}
            onValueChange={v => onChange({ ...(value || { field: '' }), field: v })}
          />
          <Input
            size='sm'
            variant='flat'
            radius='sm'
            label='Template Sheet (optional)'
            labelPlacement='outside'
            placeholder='Sheet name to clone'
            value={value?.templateSheet ?? ''}
            onValueChange={v => onChange({ ...(value || { field: '' }), templateSheet: v || undefined })}
          />
        </div>
      )}
    </div>
  )
}

// --- Excel Table Editor ---

const TOTAL_FUNCTIONS = ['sum', 'avg', 'count', 'min', 'max'] as const

interface GenerateTotalsEditorProps {
  columns: string[]
  value?: Record<string, string>
  onChange: (next: Record<string, string> | undefined) => void
}

const GenerateTotalsEditor: React.FC<GenerateTotalsEditorProps> = ({ columns, value, onChange }) => {
  const entries: [string, string][] = Object.entries(value || {})
  const colOptions = columns.map(cleanCol)
  const [showEmptyOnly, setShowEmptyOnly] = useState(false)
  const filled = entries.filter(([f]) => !!f).length

  const commit = (next: [string, string][]) => {
    const filtered = next.filter(([k]) => k.trim())
    onChange(filtered.length ? Object.fromEntries(filtered) : undefined)
  }

  const jumpToNextEmpty = () => {
    const idx = entries.findIndex(([f]) => !f)
    if (idx >= 0) {
      const el = document.getElementById(`totals-col-${idx}`)
      el?.focus()
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <div>
          <span className='text-xs font-semibold text-default-700'>Generate Totals</span>
          <p className='text-[11px] text-default-500'>Append a totals row below the table.</p>
        </div>
        <Button
          size='sm'
          variant='flat'
          color='primary'
          className='h-7 min-w-0 px-2 text-xs'
          isDisabled={colOptions.length === 0}
          onPress={() => commit([...entries, ['', 'sum']])}>
          + Add
        </Button>
      </div>

      <RowSummary
        total={entries.length}
        filled={filled}
        showEmptyOnly={showEmptyOnly}
        onToggleEmptyOnly={() => setShowEmptyOnly(v => !v)}
        onJumpNextEmpty={jumpToNextEmpty}
      />

      {entries.length === 0 ? (
        <p className='text-[11px] italic text-default-500'>No totals configured.</p>
      ) : (
        <div className='flex flex-col gap-0.5'>
          {entries
            .map((entry, idx) => ({ entry, idx }))
            .filter(({ entry }) => !showEmptyOnly || !entry[0])
            .map(({ entry, idx }) => {
              const [field, func] = entry
              const hasField = !!field
              return (
                <div key={idx} className={rowShell(hasField)}>
                  <Icon icon='lucide:sigma' className='h-3.5 w-3.5 shrink-0 text-default-400/70' />
                  <Select
                    id={`totals-col-${idx}`}
                    size='sm'
                    variant='flat'
                    aria-label='Column'
                    placeholder='Select column...'
                    selectedKeys={field ? [field] : []}
                    onChange={e => {
                      const next = [...entries] as [string, string][]
                      next[idx] = [e.target.value, func]
                      commit(next)
                    }}
                    className='flex-1'
                    classNames={{ trigger: fieldSelectTrigger }}>
                    {colOptions.map(col => (
                      <SelectItem key={col}>{col}</SelectItem>
                    ))}
                  </Select>
                  <Select
                    size='sm'
                    variant='flat'
                    aria-label='Function'
                    selectedKeys={[func || 'sum']}
                    onChange={e => {
                      const next = [...entries] as [string, string][]
                      next[idx] = [field, e.target.value]
                      commit(next)
                    }}
                    className='w-24 shrink-0'
                    classNames={{ trigger: fieldSelectTrigger }}>
                    {TOTAL_FUNCTIONS.map(f => (
                      <SelectItem key={f}>{f.toUpperCase()}</SelectItem>
                    ))}
                  </Select>
                  <button
                    type='button'
                    onClick={() => commit(entries.filter((_, i) => i !== idx))}
                    title='Remove'
                    className={deleteRowBtn}>
                    <Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />
                  </button>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

interface NumberFormatEditorProps {
  columns: string[]
  value?: Record<string, string>
  onChange: (next: Record<string, string> | undefined) => void
}

const NUMBER_FORMAT_EXAMPLES = [
  { value: '#,##0', label: '1,000 (integer)' },
  { value: '#,##0.00', label: '1,000.00 (decimal)' },
  { value: '0.00%', label: '100.00% (percent)' },
  { value: '"฿"#,##0.00', label: '฿1,000.00 (THB)' },
  { value: '"$"#,##0.00', label: '$1,000.00 (USD)' },
  { value: 'dd/mm/yyyy', label: 'dd/mm/yyyy (date)' },
  { value: '@', label: '@ (text)' }
]

const NumberFormatEditor: React.FC<NumberFormatEditorProps> = ({ columns, value, onChange }) => {
  const entries: [string, string][] = Object.entries(value || {})
  const colOptions = columns.map(cleanCol)
  const [showEmptyOnly, setShowEmptyOnly] = useState(false)
  const filled = entries.filter(([f, fmt]) => !!f && !!fmt).length

  const commit = (next: [string, string][]) => {
    const filtered = next.filter(([k]) => k.trim())
    onChange(filtered.length ? Object.fromEntries(filtered) : undefined)
  }

  const jumpToNextEmpty = () => {
    const idx = entries.findIndex(([f, fmt]) => !f || !fmt)
    if (idx >= 0) {
      const el = document.getElementById(`nf-col-${idx}`)
      el?.focus()
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <div>
          <span className='text-xs font-semibold text-default-700'>Number Format</span>
          <p className='text-[11px] text-default-500'>Apply an Excel format string to a column.</p>
        </div>
        <Button
          size='sm'
          variant='flat'
          color='primary'
          className='h-7 min-w-0 px-2 text-xs'
          isDisabled={colOptions.length === 0}
          onPress={() => commit([...entries, ['', '']])}>
          + Add
        </Button>
      </div>

      <RowSummary
        total={entries.length}
        filled={filled}
        showEmptyOnly={showEmptyOnly}
        onToggleEmptyOnly={() => setShowEmptyOnly(v => !v)}
        onJumpNextEmpty={jumpToNextEmpty}
      />

      {entries.length === 0 ? (
        <p className='text-[11px] italic text-default-500'>No formats configured.</p>
      ) : (
        <div className='flex flex-col gap-0.5'>
          {entries
            .map((entry, idx) => ({ entry, idx }))
            .filter(({ entry }) => !showEmptyOnly || !entry[0] || !entry[1])
            .map(({ entry, idx }) => {
              const [field, fmt] = entry
              const hasField = !!field && !!fmt
              return (
                <div key={idx} className={rowShell(hasField)}>
                  <Icon icon='lucide:hash' className='h-3.5 w-3.5 shrink-0 text-default-400/70' />
                  <Select
                    id={`nf-col-${idx}`}
                    size='sm'
                    variant='flat'
                    aria-label='Column'
                    placeholder='Select column...'
                    selectedKeys={field ? [field] : []}
                    onChange={e => {
                      const next = [...entries] as [string, string][]
                      next[idx] = [e.target.value, fmt]
                      commit(next)
                    }}
                    className='flex-1'
                    classNames={{ trigger: fieldSelectTrigger }}>
                    {colOptions.map(col => (
                      <SelectItem key={col}>{col}</SelectItem>
                    ))}
                  </Select>
                  <Select
                    size='sm'
                    variant='flat'
                    aria-label='Format'
                    placeholder='Format...'
                    selectedKeys={fmt ? [fmt] : []}
                    onChange={e => {
                      const next = [...entries] as [string, string][]
                      next[idx] = [field, e.target.value]
                      commit(next)
                    }}
                    className='w-44 shrink-0'
                    classNames={{ trigger: fieldSelectTrigger }}>
                    {NUMBER_FORMAT_EXAMPLES.map(ex => (
                      <SelectItem key={ex.value} textValue={ex.value}>
                        <div className='flex items-center justify-between gap-2'>
                          <span className='font-mono text-xs'>{ex.value}</span>
                          <span className='text-[10px] text-default-500'>{ex.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </Select>
                  <button
                    type='button'
                    onClick={() => commit(entries.filter((_, i) => i !== idx))}
                    title='Remove'
                    className={deleteRowBtn}>
                    <Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />
                  </button>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

const ExcelTableEditor = ({
  item,
  index,
  onUpdate,
  onDelete
}: {
  item: ExcelTableItem
  index: number
  onUpdate: (i: ExcelTableItem) => void
  onDelete: () => void
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const [newCol, setNewCol] = useState('')
  const [optionsExpanded, setOptionsExpanded] = useState<Set<string>>(new Set(['options']))

  const handleAddCol = () => {
    if (!newCol) return
    const formatted = formatKey(newCol, 'table')
    if (!item.columns.includes(formatted)) {
      onUpdate({ ...item, columns: [...item.columns, formatted] })
    }
    setNewCol('')
  }

  const handleDeleteCol = (col: string) => {
    onUpdate({ ...item, columns: item.columns.filter(c => c !== col) })
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
    // Pre-populate keys in column order so saved payload preserves the right sequence
    const emptyRow: Record<string, string> = {}
    item.columns.forEach(col => {
      emptyRow[col] = ''
    })
    onUpdate({ ...item, rows: [...item.rows, emptyRow] })
  }

  const updateRow = (idx: number, col: string, val: string) => {
    const newRows = [...item.rows]
    newRows[idx] = { ...newRows[idx], [col]: val }
    onUpdate({ ...item, rows: newRows })
  }

  const deleteRow = (idx: number) => {
    onUpdate({ ...item, rows: item.rows.filter((_, i) => i !== idx) })
  }

  const moveRow = (from: number, to: number) => {
    if (to < 0 || to >= item.rows.length) return
    onUpdate({ ...item, rows: arrayMove(item.rows, from, to) })
  }

  // Always show at least 1 sort row (virtual default if none saved yet)
  const displaySort: SortDefinition[] = item.sort?.length ? item.sort : [{ field: '', direction: '' } as SortDefinition]

  const updateSortEntry = (idx: number, patch: Partial<SortDefinition>) => {
    const base = item.sort?.length ? item.sort : [{ field: '', direction: '' } as SortDefinition]
    onUpdate({ ...item, sort: base.map((s, i) => (i === idx ? { ...s, ...patch } : s)) })
  }

  const removeSortEntry = (idx: number) => {
    const base = item.sort?.length ? item.sort : [{ field: '', direction: '' } as SortDefinition]
    onUpdate({ ...item, sort: base.filter((_, i) => i !== idx) })
  }

  return (
    <div className='flex w-full flex-col gap-4 pb-4'>
      {/* Header */}
      <div className='builder-detail-panel flex items-center justify-between gap-4 rounded-md p-2'>
        <div className='flex flex-1 items-center gap-2'>
          <DragHandle />
          <span className='font-semibold text-default-700'>Table {index + 1}</span>
        </div>
        <Button
          isIconOnly
          size='sm'
          color='danger'
          variant='light'
          radius='sm'
          className='h-6 w-6 text-default-400 hover:text-danger'
          onPress={onDelete}>
          <Icon icon='lucide:x' className='h-3 w-3' />
        </Button>
      </div>

      {/* Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColDragEnd}>
        <SortableContext items={item.columns} strategy={horizontalListSortingStrategy}>
          <div className='overflow-x-auto rounded-lg border border-default-200/70 bg-content1'>
            <table className='w-full text-left text-sm'>
              <thead className='bg-content2/80 font-medium text-default-600'>
                <tr>
                  {item.columns.map(col => (
                    <SortableHeaderItem key={col} id={col} className='min-w-[100px] border-b border-l p-2'>
                      <div className='flex w-full items-center justify-between gap-1'>
                        <span className='var-token-text pointer-events-none text-xs'>{col}</span>
                        <button onClick={() => handleDeleteCol(col)} className='text-danger hover:text-danger'>
                          <Icon icon='lucide:x' className='h-3 w-3' />
                        </button>
                      </div>
                    </SortableHeaderItem>
                  ))}
                  <th className='min-w-[100px] border-b border-l bg-content2/50 p-2'>
                    <div className='flex items-center gap-1'>
                      <Input
                        placeholder='New Col'
                        value={newCol}
                        onValueChange={setNewCol}
                        size='sm'
                        variant='flat'
                        classNames={{ inputWrapper: 'builder-field border h-8 min-h-0' }}
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
                  <th className='w-10 border-b p-2' />
                </tr>
              </thead>
              <tbody>
                {item.rows.map((row, rIdx) => (
                  <tr key={rIdx} className='group border-b border-default-200/70 hover:bg-content2/70'>
                    {item.columns.map(col => (
                      <td key={col} className='border-b border-l p-1'>
                        <input
                          className='w-full rounded bg-transparent px-2 py-1 text-[12px] text-foreground outline-none transition-colors placeholder:text-default-400/50 focus:bg-content2/70'
                          value={row[col] ?? ''}
                          onChange={e => updateRow(rIdx, col, e.target.value)}
                          onKeyDown={handleEnterKey}
                        />
                      </td>
                    ))}
                    <td className='border-b border-l bg-content2/30 p-1' />
                    <td className='border-b p-1 text-center'>
                      <div className='flex items-center gap-0.5'>
                        <button
                          onClick={() => moveRow(rIdx, rIdx - 1)}
                          disabled={rIdx === 0}
                          className='text-default-300 hover:text-primary disabled:opacity-30'>
                          <Icon icon='lucide:chevron-up' className='h-3.5 w-3.5' />
                        </button>
                        <button
                          onClick={() => moveRow(rIdx, rIdx + 1)}
                          disabled={rIdx === item.rows.length - 1}
                          className='text-default-300 hover:text-primary disabled:opacity-30'>
                          <Icon icon='lucide:chevron-down' className='h-3.5 w-3.5' />
                        </button>
                        <button onClick={() => deleteRow(rIdx)} className='text-default-300 hover:text-danger'>
                          <Icon icon='lucide:x' className='h-3.5 w-3.5' />
                        </button>
                      </div>
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
        className='w-full border border-default-200/70 bg-content1 font-medium shadow-sm transition-colors hover:bg-content2'>
        <Icon icon='lucide:plus' className='mr-1 h-4 w-4 text-default-400' /> Add Row
      </Button>

      {/* Excel Options */}
      <Accordion
        selectedKeys={optionsExpanded}
        onSelectionChange={v => setOptionsExpanded(v as Set<string>)}
        variant='light'
        className='px-0'
        isCompact>
        <AccordionItem
          key='options'
          aria-label='Excel Options'
          title={
            <div className='flex items-center gap-2 text-sm font-medium text-default-600'>
              <Icon icon='lucide:settings-2' className='h-4 w-4' />
              Excel Table Options
            </div>
          }
          className='px-0'
          classNames={{ title: 'text-sm font-medium', content: 'pt-2 pb-4' }}>
          <div className='builder-detail-panel flex flex-col gap-5 rounded-lg p-3'>
            {/* Boolean toggles — 3 items in a 3-col grid */}
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
              {(
                [
                  { key: 'freezeHeader', label: 'Freeze Header', icon: 'lucide:lock' },
                  { key: 'autoFilter', label: 'Auto Filter', icon: 'lucide:filter' },
                  { key: 'autoFitColumns', label: 'Auto-fit Cols', icon: 'lucide:columns-3' }
                ] as const
              ).map(({ key, label, icon }) => (
                <label
                  key={key}
                  className='flex cursor-pointer items-center gap-2 rounded-md border border-default-200/70 bg-content1 px-3 py-2 transition-colors hover:bg-content2'>
                  <Checkbox
                    isSelected={item[key] ?? false}
                    onValueChange={v => onUpdate({ ...item, [key]: v })}
                    size='sm'
                  />
                  <Icon icon={icon} className='h-3.5 w-3.5 shrink-0 text-default-400' />
                  <span className='text-xs font-medium text-default-700'>{label}</span>
                </label>
              ))}
            </div>

            {/* Generate Totals */}
            <GenerateTotalsEditor
              columns={item.columns}
              value={item.generateTotals}
              onChange={v => onUpdate({ ...item, generateTotals: v })}
            />

            {/* Number Format */}
            <NumberFormatEditor
              columns={item.columns}
              value={item.numberFormat}
              onChange={v => onUpdate({ ...item, numberFormat: v })}
            />

            {/* Conditional Formatting */}
            <ConditionalFormatEditor
              columns={item.columns}
              value={item.conditionalFormat}
              onChange={v => onUpdate({ ...item, conditionalFormat: v })}
            />

            {/* Split to Sheets */}
            <SplitToSheetsEditor value={item.splitToSheets} onChange={v => onUpdate({ ...item, splitToSheets: v })} />

            {/* Sort */}
            <div className='flex flex-col gap-2 border-t border-default-100 pt-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Icon icon='lucide:arrow-up-down' className='h-4 w-4 text-primary' />
                  <span className='text-sm font-semibold text-default-700'>Sort</span>
                </div>
                <Button
                  size='sm'
                  color='primary'
                  variant='flat'
                  onPress={() =>
                    onUpdate({
                      ...item,
                      sort: [...(item.sort || []), { field: '', direction: 'asc' } as SortDefinition]
                    })
                  }
                  className='h-7 min-w-0 px-2 text-xs font-medium'>
                  + Add
                </Button>
              </div>
              <div className='flex flex-col gap-0.5'>
                {displaySort.map((rule, idx) => {
                  const hasField = !!rule.field && !!rule.direction
                  return (
                    <div key={idx} className={rowShell(hasField)}>
                      <Icon icon='lucide:list-ordered' className='h-3.5 w-3.5 shrink-0 text-default-400/70' />
                      <Select
                        aria-label='Sort Column'
                        placeholder='Select column...'
                        selectedKeys={rule.field ? [rule.field] : []}
                        onChange={e => updateSortEntry(idx, { field: e.target.value })}
                        size='sm'
                        variant='flat'
                        className='flex-1'
                        classNames={{ trigger: fieldSelectTrigger }}>
                        {item.columns.map(col => (
                          <SelectItem key={cleanCol(col)} textValue={cleanCol(col)}>
                            {cleanCol(col)}
                          </SelectItem>
                        ))}
                      </Select>
                      <Select
                        aria-label='Sort Order'
                        placeholder='Order'
                        selectedKeys={rule.direction ? [rule.direction] : []}
                        onChange={e => updateSortEntry(idx, { direction: e.target.value })}
                        size='sm'
                        variant='flat'
                        className='w-32 shrink-0'
                        classNames={{ trigger: fieldSelectTrigger }}>
                        <SelectItem key='asc'>Ascending</SelectItem>
                        <SelectItem key='desc'>Descending</SelectItem>
                      </Select>
                      <button
                        type='button'
                        onClick={() => removeSortEntry(idx)}
                        title='Remove'
                        className={deleteRowBtn}>
                        <Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Vertical Merge & Collapse */}
            <div className='flex flex-col gap-2 border-t border-default-100 pt-4'>
              <div className='flex items-center gap-2'>
                <Icon icon='lucide:network' className='h-4 w-4 text-primary' />
                <span className='text-sm font-semibold text-default-700'>Vertical Merge & Collapse</span>
              </div>
              <div className='grid grid-cols-1 gap-3 xl:grid-cols-2'>
                <Select
                  label='Vertical Merge'
                  placeholder='Select columns...'
                  selectionMode='multiple'
                  selectedKeys={new Set(item.verticalMerge || [])}
                  onSelectionChange={keys => onUpdate({ ...item, verticalMerge: Array.from(keys) as string[] })}
                  size='sm'
                  variant='flat'
                  isMultiline
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
                  classNames={{ trigger: fieldSelectTrigger }}>
                  {item.columns.map(col => (
                    <SelectItem key={cleanCol(col)} textValue={cleanCol(col)}>
                      {cleanCol(col)}
                    </SelectItem>
                  ))}
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
                  classNames={{ trigger: fieldSelectTrigger }}>
                  {item.columns.map(col => (
                    <SelectItem key={cleanCol(col)} textValue={cleanCol(col)}>
                      {cleanCol(col)}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

// --- ExcelTablesSection ---
interface ExcelTablesSectionProps {
  items: ExcelTableItem[]
  onChange: (items: ExcelTableItem[]) => void
}

export const ExcelTablesSection: React.FC<ExcelTablesSectionProps> = ({ items, onChange }) => {
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
    <div className='flex flex-col gap-2'>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
          <div className='flex flex-col gap-4'>
            {items.map((item, index) => (
              <SortableItem
                key={item.id}
                id={item.id}
                className='rounded-lg border border-default-200/70 bg-content1 p-3 pr-4 shadow-sm shadow-black/[0.02]'>
                <ExcelTableEditor
                  item={item}
                  index={index}
                  onUpdate={u => onChange(items.map(x => (x.id === item.id ? u : x)))}
                  onDelete={() => onChange(items.filter(x => x.id !== item.id))}
                />
              </SortableItem>
            ))}
            {items.length === 0 && (
              <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-default-300/70 bg-content1/60 py-12 text-center'>
                <div className='mb-3 flex h-12 w-12 items-center justify-center bg-content2'>
                  <Icon icon='lucide:table-2' className='h-6 w-6 text-default-400' />
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
