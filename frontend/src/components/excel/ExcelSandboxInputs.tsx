import React, { useState } from 'react'
import {
  Input,
  Checkbox,
  Select,
  SelectItem,
  Accordion,
  AccordionItem,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  cn
} from '@heroui/react'
import Icon from '@/components/icon'
import type { BuilderSortDefinition as SortDefinition } from '@/types/pdf-sandbox'
import { arrayMove } from '@dnd-kit/sortable'
import {
  ExcelTableItem,
  ConditionalFormatConfig,
  ConditionalFormatRule,
  SplitToSheetsConfig
} from '@/types/excel-sandbox'
import {
  handleEnterKey,
  EmptyState,
  ExpandToggle,
  CheckboxCard,
  ColumnHeader,
  StatusDot,
  SummaryBar,
  tableReadiness
} from '@/components/pdf/SandboxInputs'
import { BrandChip } from '@/components/ui/BrandChip'
import {
  AddButton,
  MonoLabel,
  fieldClasses,
  rowFieldClasses,
  rowRemoveButton,
  rowSelectClasses
} from '@/components/template-editor/field-styles'

// Re-export shared types and sections from PDF SandboxInputs
export {
  ReplacementsSection,
  ImagesSection,
  QrCodesSection,
  BarcodesSection,
  FileSettingsSection,
  EmptyState,
  CheckboxCard,
  generateId,
  formatKey,
  handleEnterKey
} from '@/components/pdf/SandboxInputs'
export type { ReplaceItem, ImageItem, QrCodeItem, BarcodeItem } from '@/components/pdf/SandboxInputs'

// =====================================================================================
// Advanced Excel field editors (generateTotals / numberFormat / conditionalFormat / splitToSheets)
// Kept inline because they're only used inside ExcelTableEditor.
// =====================================================================================

const cleanCol = (col: string | null | undefined) => (col == null ? '' : String(col).replace(/^\{\{row:/, '').replace(/\}\}$/, ''))

// --- Shared row / control styling — mirrors PDF ReplacementsSection so the
// Excel sandbox reads in the same visual language as PDF Variables. ---

// Filled/empty state is shown by a StatusDot inside the row, not by colored borders.
const rowShell = (_filled: boolean) => 'group flex items-center gap-2 py-0.5 transition-colors duration-150'

const fieldInputClasses = rowFieldClasses

const deleteRowBtn = rowRemoveButton

const chipBase = 'flex shrink-0 items-center gap-1 whitespace-nowrap px-1 py-1 text-[12px]'
const okChip = cn(chipBase, 'text-default-500')
const attentionChip = cn(chipBase, 'text-default-400')

const EditorHeader: React.FC<{ title: string; hint?: string; action?: React.ReactNode }> = ({ title, hint, action }) => (
  <div className='flex items-start justify-between gap-3'>
    <div>
      <MonoLabel>{title}</MonoLabel>
      {hint && <p className='mt-1 text-[13px] text-default-500'>{hint}</p>}
    </div>
    {action}
  </div>
)

/** Columns come from the file — there is nothing to pick until the sheet has {{row:...}} markers. */
const NO_COLUMNS_HINT = 'No columns yet. Add {{row:name}} markers to a row of your sheet, then use Replace file.'

const EmptyHint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className='border border-dashed border-divider px-3 py-2.5 text-[13px] text-default-500'>{children}</p>
)

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
    <div className='flex flex-wrap items-center justify-between gap-2'>
      <div className='flex items-center gap-2 text-[13px]'>
        <span className='text-default-500'>
          {filled}/{total} {itemLabel}
        </span>
        <span aria-hidden className='text-default-400'>
          ·
        </span>
        {empty > 0 ? (
          <button
            type='button'
            onClick={onToggleEmptyOnly}
            aria-pressed={showEmptyOnly}
            className={cn(
              'flex items-center gap-1.5 border px-1.5 py-0.5 transition-colors duration-150',
              showEmptyOnly
                ? 'border-default-300 text-foreground'
                : 'border-transparent text-default-500 hover:border-default-300 hover:text-foreground'
            )}
            title={showEmptyOnly ? 'Show all' : 'Show empty only'}>
            <StatusDot filled={false} />
            {empty} empty
            {showEmptyOnly && <Icon icon='lucide:x' className='h-3 w-3' />}
          </button>
        ) : (
          <span className='flex items-center gap-1.5 text-default-500'>
            <StatusDot filled />
            All filled
          </span>
        )}
      </div>
      {empty > 0 && onJumpNextEmpty && (
        <button
          type='button'
          onClick={onJumpNextEmpty}
          className='flex items-center gap-1 px-1 py-0.5 text-[13px] text-default-500 transition-colors duration-150 hover:text-foreground'
          title='Go to next empty entry'>
          Next empty
          <Icon icon='lucide:arrow-down' className='h-3.5 w-3.5' />
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
    <div className='flex flex-col gap-2.5'>
      <EditorHeader
        title='Color rules'
        hint='Color cells when their value matches a rule.'
        action={<AddButton onPress={addConfig}>Add rule</AddButton>}
      />

      <RowSummary
        total={configs.length}
        filled={filled}
        showEmptyOnly={showEmptyOnly}
        onToggleEmptyOnly={() => setShowEmptyOnly(v => !v)}
        onJumpNextEmpty={jumpToNextEmpty}
        itemLabel='with field'
      />

      {configs.length === 0 ? (
        <EmptyHint>No color rules yet.</EmptyHint>
      ) : (
        <div className='flex flex-col gap-1'>
          {configs
            .map((cfg, ci) => ({ cfg, ci }))
            .filter(({ cfg }) => !showEmptyOnly || !cfg.field)
            .map(({ cfg, ci }) => {
              const hasField = !!cfg.field
              return (
                <div key={ci} className={cn(rowShell(hasField), 'flex-col items-stretch gap-2 border-b border-divider py-2')}>
                  <div className='flex items-center gap-1.5'>
                    <StatusDot filled={hasField} />
                    <Icon icon='lucide:paintbrush' className='h-4 w-4 shrink-0 text-default-500' />
                    <Select
                      id={`cf-field-${ci}`}
                      size='sm'
                      variant='bordered'
                      aria-label='Field'
                      placeholder='Choose column'
                      selectedKeys={cfg.field ? [cfg.field] : []}
                      onChange={e => updateConfig(ci, { field: e.target.value })}
                      className='flex-1'
                      classNames={rowSelectClasses}>
                      {columns.map(col => (
                        <SelectItem key={cleanCol(col)} textValue={cleanCol(col)}>
                          {cleanCol(col)}
                        </SelectItem>
                      ))}
                    </Select>
                    <button
                      type='button'
                      onClick={() => removeConfig(ci)}
                      title='Remove color rule'
                      aria-label='Remove color rule'
                      className={deleteRowBtn}>
                      <Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />
                    </button>
                  </div>

                  <div className='flex flex-col gap-2 pl-6'>
                    {cfg.rules.map((rule, ri) => (
                      <div key={ri} className='grid grid-cols-1 gap-2 border border-divider p-2 sm:grid-cols-6'>
                        <Select
                          size='sm'
                          variant='bordered'
                          aria-label='Condition'
                          selectedKeys={rule.operator ? [rule.operator] : ['=']}
                          onChange={e => updateRule(ci, ri, { operator: e.target.value })}
                          className='sm:col-span-2'
                          classNames={rowSelectClasses}>
                          {CF_OPERATORS.map(op => (
                            <SelectItem key={op}>{op}</SelectItem>
                          ))}
                        </Select>
                        <Input
                          size='sm'
                          variant='bordered'
                          placeholder='Value'
                          value={String(rule.value ?? '')}
                          onValueChange={v => updateRule(ci, ri, { value: v })}
                          className='sm:col-span-2'
                          classNames={fieldInputClasses}
                        />
                        <Input
                          size='sm'
                          variant='bordered'
                          type='color'
                          aria-label='Font color'
                          value={rule.fontColor || '#000000'}
                          onChange={e => updateRule(ci, ri, { fontColor: e.target.value })}
                          classNames={fieldInputClasses}
                        />
                        <Input
                          size='sm'
                          variant='bordered'
                          type='color'
                          aria-label='Background color'
                          value={rule.backgroundColor || '#FFFFFF'}
                          onChange={e => updateRule(ci, ri, { backgroundColor: e.target.value })}
                          classNames={fieldInputClasses}
                        />
                        <div className='flex items-center gap-3 sm:col-span-6'>
                          <Checkbox
                            color='default'
                            isSelected={!!rule.bold}
                            onValueChange={b => updateRule(ci, ri, { bold: b })}
                            size='sm'>
                            <span className='text-[13px]'>Bold</span>
                          </Checkbox>
                          <Checkbox
                            color='default'
                            isSelected={!!rule.italic}
                            onValueChange={b => updateRule(ci, ri, { italic: b })}
                            size='sm'>
                            <span className='text-[13px]'>Italic</span>
                          </Checkbox>
                          <button
                            type='button'
                            className='ml-auto text-[13px] text-default-500 transition-colors hover:text-danger'
                            onClick={() => {
                              const next = [...configs]
                              next[ci] = { ...next[ci], rules: next[ci].rules.filter((_, idx) => idx !== ri) }
                              commit(next)
                            }}>
                            Remove condition
                          </button>
                        </div>
                      </div>
                    ))}
                    <AddButton className='self-start' onPress={() => updateConfig(ci, { rules: [...cfg.rules, {}] })}>
                      Add condition
                    </AddButton>
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
    <div className='flex flex-col gap-2.5'>
      <EditorHeader
        title='Split into sheets'
        hint='Create one sheet for each different value of a field.'
        action={
          <Checkbox color='default' size='sm' isSelected={enabled} onValueChange={on => onChange(on ? { field: '' } : undefined)}>
            <span className='text-[13px]'>On</span>
          </Checkbox>
        }
      />
      {enabled && (
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
          <Input
            size='sm'
            variant='bordered'
            classNames={fieldClasses}
            label='Split by field'
            labelPlacement='outside'
            placeholder='e.g. region'
            value={value?.field ?? ''}
            onValueChange={v => onChange({ ...(value || { field: '' }), field: v })}
          />
          <Input
            size='sm'
            variant='bordered'
            classNames={fieldClasses}
            label='Sheet to copy (optional)'
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
    <div className='flex flex-col gap-2.5'>
      <EditorHeader
        title='Totals row'
        hint='Add a totals row below the table.'
        action={
          colOptions.length > 0 ? (
            <AddButton onPress={() => commit([...entries, ['', 'sum']])}>Add total</AddButton>
          ) : undefined
        }
      />

      <RowSummary
        total={entries.length}
        filled={filled}
        showEmptyOnly={showEmptyOnly}
        onToggleEmptyOnly={() => setShowEmptyOnly(v => !v)}
        onJumpNextEmpty={jumpToNextEmpty}
      />

      {entries.length === 0 ? (
        <EmptyHint>{colOptions.length === 0 ? NO_COLUMNS_HINT : 'No totals yet.'}</EmptyHint>
      ) : (
        <div className='flex flex-col gap-1.5'>
          {entries
            .map((entry, idx) => ({ entry, idx }))
            .filter(({ entry }) => !showEmptyOnly || !entry[0])
            .map(({ entry, idx }) => {
              const [field, func] = entry
              const hasField = !!field
              return (
                <div key={idx} className={rowShell(hasField)}>
                  <StatusDot filled={hasField} />
                  <Icon icon='lucide:sigma' className='h-4 w-4 shrink-0 text-default-500' />
                  <Select
                    id={`totals-col-${idx}`}
                    size='sm'
                    variant='bordered'
                    aria-label='Column'
                    placeholder='Choose column'
                    selectedKeys={field ? [field] : []}
                    onChange={e => {
                      const next = [...entries] as [string, string][]
                      next[idx] = [e.target.value, func]
                      commit(next)
                    }}
                    className='flex-1'
                    classNames={rowSelectClasses}>
                    {colOptions.map(col => (
                      <SelectItem key={col}>{col}</SelectItem>
                    ))}
                  </Select>
                  <Select
                    size='sm'
                    variant='bordered'
                    aria-label='Function'
                    selectedKeys={[func || 'sum']}
                    onChange={e => {
                      const next = [...entries] as [string, string][]
                      next[idx] = [field, e.target.value]
                      commit(next)
                    }}
                    className='w-24 shrink-0'
                    classNames={rowSelectClasses}>
                    {TOTAL_FUNCTIONS.map(f => (
                      <SelectItem key={f}>{f.toUpperCase()}</SelectItem>
                    ))}
                  </Select>
                  <button
                    type='button'
                    onClick={() => commit(entries.filter((_, i) => i !== idx))}
                    title='Remove'
                    aria-label='Remove'
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
    <div className='flex flex-col gap-2.5'>
      <EditorHeader
        title='Number format'
        hint='Show a column as money, percent, date and more.'
        action={
          colOptions.length > 0 ? (
            <AddButton onPress={() => commit([...entries, ['', '']])}>Add format</AddButton>
          ) : undefined
        }
      />

      <RowSummary
        total={entries.length}
        filled={filled}
        showEmptyOnly={showEmptyOnly}
        onToggleEmptyOnly={() => setShowEmptyOnly(v => !v)}
        onJumpNextEmpty={jumpToNextEmpty}
      />

      {entries.length === 0 ? (
        <EmptyHint>{colOptions.length === 0 ? NO_COLUMNS_HINT : 'No formats yet.'}</EmptyHint>
      ) : (
        <div className='flex flex-col gap-1.5'>
          {entries
            .map((entry, idx) => ({ entry, idx }))
            .filter(({ entry }) => !showEmptyOnly || !entry[0] || !entry[1])
            .map(({ entry, idx }) => {
              const [field, fmt] = entry
              const hasField = !!field && !!fmt
              return (
                <div key={idx} className={rowShell(hasField)}>
                  <StatusDot filled={hasField} />
                  <Icon icon='lucide:hash' className='h-4 w-4 shrink-0 text-default-500' />
                  <Select
                    id={`nf-col-${idx}`}
                    size='sm'
                    variant='bordered'
                    aria-label='Column'
                    placeholder='Choose column'
                    selectedKeys={field ? [field] : []}
                    onChange={e => {
                      const next = [...entries] as [string, string][]
                      next[idx] = [e.target.value, fmt]
                      commit(next)
                    }}
                    className='flex-1'
                    classNames={rowSelectClasses}>
                    {colOptions.map(col => (
                      <SelectItem key={col}>{col}</SelectItem>
                    ))}
                  </Select>
                  <Select
                    size='sm'
                    variant='bordered'
                    aria-label='Format'
                    placeholder='Format'
                    selectedKeys={fmt ? [fmt] : []}
                    onChange={e => {
                      const next = [...entries] as [string, string][]
                      next[idx] = [field, e.target.value]
                      commit(next)
                    }}
                    className='w-44 shrink-0'
                    classNames={rowSelectClasses}>
                    {NUMBER_FORMAT_EXAMPLES.map(ex => (
                      <SelectItem key={ex.value} textValue={ex.value}>
                        <div className='flex items-center justify-between gap-2'>
                          <span className='font-mono text-[12px]'>{ex.value}</span>
                          <span className='text-[12px] text-default-500'>{ex.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </Select>
                  <button
                    type='button'
                    onClick={() => commit(entries.filter((_, i) => i !== idx))}
                    title='Remove'
                    aria-label='Remove'
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
  errors
}: {
  item: ExcelTableItem
  index: number
  onUpdate: (i: ExcelTableItem) => void
  errors?: Record<string, string>
}) => {
  const [fullscreen, setFullscreen] = useState(false)
  const readiness = tableReadiness(item)
  const rowErrors: Record<number, string> = {}
  Object.entries(errors ?? {}).forEach(([k, v]) => {
    if (k.startsWith(`${item.id}-row-`)) rowErrors[Number(k.slice(`${item.id}-row-`.length))] = v
  })
  const tableError = errors?.[item.id]
  const tableName = `Table ${index + 1}`
  const columnNames = item.columns.map(cleanCol).join(', ')
  const dataLabel =
    item.rows.length === 0
      ? 'No test rows'
      : readiness.emptyCells > 0
        ? `${readiness.emptyCells} empty ${readiness.emptyCells === 1 ? 'cell' : 'cells'}`
        : 'Test data filled'
  const [expanded, setExpanded] = useState(true)
  const [optionsExpanded, setOptionsExpanded] = useState<Set<string>>(new Set())

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

  const displaySort: SortDefinition[] = item.sort ?? []

  const updateSortEntry = (idx: number, patch: Partial<SortDefinition>) =>
    onUpdate({ ...item, sort: displaySort.map((s, i) => (i === idx ? { ...s, ...patch } : s)) })

  const removeSortEntry = (idx: number) => onUpdate({ ...item, sort: displaySort.filter((_, i) => i !== idx) })

  const renderBody = (isFull: boolean) => (
    <div className={cn('flex flex-col gap-4', !isFull && 'border-t border-divider p-4')}>
      <MonoLabel>
        {item.columns.length} {item.columns.length === 1 ? 'column' : 'columns'} · {item.rows.length}{' '}
        {item.rows.length === 1 ? 'row' : 'rows'}
      </MonoLabel>
      {item.columns.length === 0 && (
        <p className='text-[13px] text-default-500'>
          This table has no columns. Put <code className='font-mono text-foreground'>{'{{row:name}}'}</code> markers in a
          row of your sheet, then use Replace file.
        </p>
      )}

      {/* Grid */}
          <div
            className={cn(
              'overflow-auto border border-divider bg-content1',
              isFull ? 'max-h-[calc(100vh-240px)]' : 'max-h-80'
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
                    <th className='w-[104px] border-l border-divider p-2'>
                      <span className='sr-only'>Row actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {item.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      id={`table-${item.id}-row-${rIdx}`}
                      title={rowErrors[rIdx]}
                      className={cn(
                        'group border-b border-divider hover:bg-content2',
                        rowErrors[rIdx] && 'bg-danger/10 outline outline-1 -outline-offset-1 outline-danger'
                      )}>
                      {item.columns.map(col => (
                        <td key={col} className='border-l border-divider p-0 first:border-l-0'>
                          <input
                            aria-label={`Row ${rIdx + 1} ${cleanCol(col)}`}
                            className='h-9 w-full bg-transparent px-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-default-400 focus:bg-content2 focus:shadow-[inset_0_0_0_1px_hsl(var(--heroui-default-500))]'
                            value={row[col] ?? ''}
                            onChange={e => updateRow(rIdx, col, e.target.value)}
                            onKeyDown={handleEnterKey}
                          />
                        </td>
                      ))}
                      <td className='border-l border-divider p-0 text-center'>
                        <div className='flex h-9 items-center justify-center'>
                          <button
                            type='button'
                            onClick={() => moveRow(rIdx, rIdx - 1)}
                            disabled={rIdx === 0}
                            title='Move row up'
                            aria-label={`Move row ${rIdx + 1} up`}
                            className='flex h-9 w-8 items-center justify-center text-default-500 hover:text-foreground disabled:opacity-30'>
                            <Icon icon='lucide:chevron-up' className='h-4 w-4' />
                          </button>
                          <button
                            type='button'
                            onClick={() => moveRow(rIdx, rIdx + 1)}
                            disabled={rIdx === item.rows.length - 1}
                            title='Move row down'
                            aria-label={`Move row ${rIdx + 1} down`}
                            className='flex h-9 w-8 items-center justify-center text-default-500 hover:text-foreground disabled:opacity-30'>
                            <Icon icon='lucide:chevron-down' className='h-4 w-4' />
                          </button>
                          <button
                            type='button'
                            onClick={() => deleteRow(rIdx)}
                            title='Remove row'
                            aria-label={`Remove row ${rIdx + 1}`}
                            className='flex h-9 w-8 items-center justify-center text-default-500 hover:text-danger'>
                            <Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />
                          </button>
                        </div>
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
            <div className='flex items-center gap-2 text-[13px] font-medium text-default-500'>
              <Icon icon='lucide:settings-2' className='h-4 w-4' />
              Excel table options
            </div>
          }
          className='px-0'
          classNames={{ trigger: 'py-2', content: 'pt-1 pb-2' }}>
          <div className='flex flex-col gap-5 pt-1'>
            {/* Boolean toggles — 3 items in a 3-col grid */}
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
              {(
                [
                  { key: 'freezeHeader', label: 'Freeze header', icon: 'lucide:lock' },
                  { key: 'autoFilter', label: 'Filter buttons', icon: 'lucide:filter' },
                  { key: 'autoFitColumns', label: 'Fit column width', icon: 'lucide:columns-3' }
                ] as const
              ).map(({ key, label, icon }) => (
                <CheckboxCard
                  key={key}
                  checked={item[key] ?? false}
                  onChange={v => onUpdate({ ...item, [key]: v })}
                  icon={icon}
                  label={label}
                />
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
            <div className='flex flex-col gap-2.5 border-t border-divider pt-4'>
              <EditorHeader
                title='Sort rows'
                action={
                  <AddButton
                    onPress={() =>
                      onUpdate({
                        ...item,
                        sort: [...(item.sort || []), { field: '', direction: 'asc' } as SortDefinition]
                      })
                    }>
                    Add sort
                  </AddButton>
                }
              />
              <div className='flex flex-col gap-1.5'>
                {displaySort.length === 0 && <EmptyHint>Rows keep the order you enter them.</EmptyHint>}
                {displaySort.map((rule, idx) => {
                  const hasField = !!rule.field && !!rule.direction
                  return (
                    <div key={idx} className={rowShell(hasField)}>
                      <StatusDot filled={hasField} />
                      <Icon icon='lucide:list-ordered' className='h-4 w-4 shrink-0 text-default-500' />
                      <Select
                        aria-label='Sort Column'
                        placeholder='Choose column'
                        selectedKeys={rule.field ? [rule.field] : []}
                        onChange={e => updateSortEntry(idx, { field: e.target.value })}
                        size='sm'
                        variant='bordered'
                        className='flex-1'
                        classNames={rowSelectClasses}>
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
                        variant='bordered'
                        className='w-32 shrink-0'
                        classNames={rowSelectClasses}>
                        <SelectItem key='asc'>Ascending</SelectItem>
                        <SelectItem key='desc'>Descending</SelectItem>
                      </Select>
                      <button
                        type='button'
                        onClick={() => removeSortEntry(idx)}
                        title='Remove sort'
                        aria-label='Remove sort'
                        className={deleteRowBtn}>
                        <Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Vertical Merge & Collapse */}
            <div className='flex flex-col gap-2.5 border-t border-divider pt-4'>
              <EditorHeader title='Merge & group' />
              <div className='grid grid-cols-1 gap-3 xl:grid-cols-2'>
                <Select
                  label='Merge same values'
                  placeholder='Choose columns'
                  selectionMode='multiple'
                  selectedKeys={new Set(item.verticalMerge || [])}
                  onSelectionChange={keys => onUpdate({ ...item, verticalMerge: Array.from(keys) as string[] })}
                  size='sm'
                  variant='bordered'
                  isMultiline
                  renderValue={items => (
                    <div className='flex flex-wrap gap-1 py-1'>
                      {items.map(i => (
                        <BrandChip key={i.key} tone='neutral' size='xs'>
                          {i.textValue}
                        </BrandChip>
                      ))}
                    </div>
                  )}
                  classNames={rowSelectClasses}>
                  {item.columns.map(col => (
                    <SelectItem key={cleanCol(col)} textValue={cleanCol(col)}>
                      {cleanCol(col)}
                    </SelectItem>
                  ))}
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
                  renderValue={items => (
                    <div className='flex flex-wrap gap-1 py-1'>
                      {items.map(i => (
                        <BrandChip key={i.key} tone='neutral' size='xs'>
                          {i.textValue}
                        </BrandChip>
                      ))}
                    </div>
                  )}
                  classNames={rowSelectClasses}>
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

  return (
    <div className='flex w-full flex-col'>
      <div className='flex items-center gap-2 py-1.5 pl-1.5 pr-1.5'>
        <StatusDot filled={readiness.dataFilled} />
        <span className='min-w-0 flex-1 truncate text-[13px] text-foreground' title={columnNames || tableName}>
          <span className='font-medium'>{tableName}</span>
          {columnNames && <span className='ml-2 font-mono text-[12px] text-default-500'>{columnNames}</span>}
        </span>
        <div className='flex shrink-0 items-center gap-1'>
          <span className={readiness.structureOk ? okChip : attentionChip}>
            <Icon icon='lucide:columns-3' className='h-3 w-3' />
            {readiness.structureOk
              ? `${item.columns.length} ${item.columns.length === 1 ? 'column' : 'columns'}`
              : 'No columns'}
          </span>
          <span className={readiness.dataFilled ? okChip : attentionChip}>
            <Icon icon='lucide:rows-3' className='h-3 w-3' />
            {dataLabel}
          </span>
          <button
            type='button'
            data-skip-enter='true'
            onClick={() => setFullscreen(true)}
            title='Open the table in a large view'
            aria-label={`Expand table ${index + 1}`}
            className='flex h-8 w-8 items-center justify-center border border-transparent text-default-500 transition-colors hover:border-default-300 hover:text-foreground'>
            <Icon icon='lucide:maximize-2' className='h-4 w-4' />
          </button>
          <ExpandToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} />
        </div>
      </div>
      {tableError && <p className='px-2 pb-2 text-[12px] text-danger'>{tableError}</p>}

      {expanded && !fullscreen && renderBody(false)}

      <Modal isOpen={fullscreen} onOpenChange={setFullscreen} size='full' radius='none' scrollBehavior='inside'>
        <ModalContent className='border border-divider bg-content1'>
          {() => (
            <>
              <ModalHeader className='flex items-center gap-3 border-b border-divider'>
                <span className='text-[14px] font-medium text-foreground'>{tableName}</span>
                <span className='text-[13px] font-normal text-default-500'>{dataLabel}</span>
              </ModalHeader>
              <ModalBody className='py-4'>{renderBody(true)}</ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}

// --- ExcelTablesSection ---
interface ExcelTablesSectionProps {
  items: ExcelTableItem[]
  onChange: (items: ExcelTableItem[]) => void
  errors?: Record<string, string>
}

export const ExcelTablesSection: React.FC<ExcelTablesSectionProps> = ({ items, onChange, errors }) => {
  const [showMissingOnly, setShowMissingOnly] = useState(false)

  if (items.length === 0) {
    return (
      <EmptyState
        icon='lucide:table'
        title='No tables in this file'
        hint='Put {{row:name}} markers in a row of your sheet, then use Replace file. The table shows up here for test rows.'
      />
    )
  }

  // Same summary as the Word editor: how many tables still need test data, with a filter.
  const isMissing = (t: ExcelTableItem) => !tableReadiness(t).dataFilled
  const missing = items.filter(isMissing).length
  const noStructure = items.filter(t => !tableReadiness(t).structureOk).length

  return (
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
        {items.map((item, index) =>
          showMissingOnly && !isMissing(item) ? null : (
            <div key={item.id} id={`row-${item.id}`} className='flex flex-col border-b border-divider'>
              <ExcelTableEditor
                item={item}
                index={index}
                onUpdate={u => onChange(items.map(x => (x.id === item.id ? u : x)))}
                errors={errors}
              />
            </div>
          )
        )}
      </div>
    </>
  )
}
