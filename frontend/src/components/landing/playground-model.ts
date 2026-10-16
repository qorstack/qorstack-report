import { GITHUB_URL, toNumber } from './constants'

export type PlaygroundMode = 'word' | 'excel'
export type PlaygroundView = 'form' | 'json'

export interface LineRow {
  id: number
  name: string
  qty: string
  price: string
}

export interface PlaygroundDraft {
  first: string
  second: string
  rows: LineRow[]
}

export interface FieldConfig {
  marker: string
  ariaLabel: string
}

export interface ModeConfig {
  id: PlaygroundMode
  switchLabel: string
  endpoint: string
  generateLabel: string
  stamp: string
  fields: [FieldConfig, FieldConfig]
  rowMarker: string
  rowColumns: string
  rowNouns: { name: string; qty: string; price: string }
  newRow: Omit<LineRow, 'id'>
}

export const MAX_ROWS = 5
/** Amounts below this are coloured red in the Excel preview (conditional format). */
export const LOW_AMOUNT = 1000

export const MODES: Record<PlaygroundMode, ModeConfig> = {
  word: {
    id: 'word',
    switchLabel: 'Word → PDF',
    endpoint: '/render/word/template',
    generateLabel: 'Generate PDF',
    stamp: 'PDF · READY',
    fields: [
      { marker: '{{customer}}', ariaLabel: 'Customer' },
      { marker: '{{invoice_no}}', ariaLabel: 'Invoice number' }
    ],
    rowMarker: '{{row:item}}',
    rowColumns: 'QTY · PRICE',
    rowNouns: { name: 'Item', qty: 'Quantity', price: 'Price' },
    newRow: { name: 'New item', qty: '1', price: '500' }
  },
  excel: {
    id: 'excel',
    switchLabel: 'Excel → XLSX',
    endpoint: '/render/excel/template',
    generateLabel: 'Generate XLSX',
    stamp: 'XLSX · READY',
    fields: [
      { marker: '{{period}}', ariaLabel: 'Report period' },
      { marker: '{{prepared_by}}', ariaLabel: 'Prepared by' }
    ],
    rowMarker: '{{row:product}}',
    rowColumns: 'UNITS · PRICE',
    rowNouns: { name: 'Product', qty: 'Units', price: 'Unit price' },
    newRow: { name: 'New product', qty: '1', price: '500' }
  }
}

export const INITIAL_DRAFTS: Record<PlaygroundMode, PlaygroundDraft> = {
  word: {
    first: 'ACME Co., Ltd.',
    second: 'INV-2026-0042',
    rows: [
      { id: 1, name: 'Template setup', qty: '1', price: '4500' },
      { id: 2, name: 'Monthly reports', qty: '3', price: '1200' }
    ]
  },
  excel: {
    first: 'Q1 2026',
    second: 'Finance team',
    rows: [
      { id: 3, name: 'Starter plan', qty: '12', price: '290' },
      { id: 4, name: 'Pro licence', qty: '4', price: '4900' },
      { id: 5, name: 'Support hours', qty: '3', price: '250' }
    ]
  }
}

export const lineAmount = (row: LineRow): number => toNumber(row.qty) * toNumber(row.price)

export const draftTotal = (draft: PlaygroundDraft): number =>
  draft.rows.reduce((sum, row) => sum + lineAmount(row), 0)

export const slugify = (value: string, fallback: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}

export const outputName = (mode: PlaygroundMode, draft: PlaygroundDraft): string =>
  mode === 'word' ? `${slugify(draft.second, 'invoice')}.pdf · 1 page · ready` : 'sales-q1.xlsx · 1 sheet · ready'

const str = (value: string): string => JSON.stringify(value)
const kv = (key: string, value: string | number): string =>
  `{ "key": ${str(key)}, "value": ${typeof value === 'number' ? value : str(value)} }`

const cellJson = (value: string | number): string => (typeof value === 'number' ? String(value) : str(value))
const rowLines = (rows: (string | number)[][], indent: string): string =>
  rows.map(row => `${indent}[${row.map(cellJson).join(', ')}]`).join(',\n')
const columnsLine = (columns: string[]): string => `[${columns.map(str).join(', ')}]`

/** The exact request body the playground would send (v2 API shape: keyed items, columns + rows tables). */
export const buildRequestJson = (mode: PlaygroundMode, draft: PlaygroundDraft): string => {
  if (mode === 'word') {
    const rows = rowLines(
      draft.rows.map(r => [r.name, toNumber(r.qty), toNumber(r.price)]),
      '      '
    )
    return [
      '{',
      '  "templateKey": "invoice",',
      '  "fileType": "pdf",',
      '  "replace": [',
      `    ${kv('customer', draft.first)},`,
      `    ${kv('invoice_no', draft.second)}`,
      '  ],',
      '  "table": [{',
      `    "columns": ${columnsLine(['item', 'qty', 'price'])},`,
      '    "rows": [',
      rows,
      '    ]',
      '  }],',
      `  "qrcode": [{ "key": "link", "text": ${str(GITHUB_URL)} }]`,
      '}',
      '// the exact body your code sends'
    ].join('\n')
  }

  const rows = rowLines(
    draft.rows.map(r => [r.name, toNumber(r.qty), toNumber(r.price), lineAmount(r)]),
    '      '
  )
  return [
    '{',
    '  "templateKey": "sales-report",',
    '  "fileName": "sales-q1",',
    '  "replace": [',
    `    ${kv('period', draft.first)},`,
    `    ${kv('prepared_by', draft.second)}`,
    '  ],',
    '  "table": [{',
    `    "columns": ${columnsLine(['product', 'units', 'price', 'amount'])},`,
    '    "rows": [',
    rows,
    '    ],',
    `    "generateTotals": [${kv('amount', 'SUM')}],`,
    `    "numberFormat": [${kv('amount', '#,##0.00')}],`,
    '    "conditionalFormat": [{ "field": "amount", "rules": [',
    `      { "operator": "lessThan", "value": ${LOW_AMOUNT}, "fontColor": "#F2271C" }`,
    '    ] }]',
    '  }]',
    '}',
    '// one call → a finished .xlsx'
  ].join('\n')
}
