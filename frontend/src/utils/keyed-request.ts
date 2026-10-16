import type {
  ExcelFromTemplateRequest,
  ExcelTableDataRequest,
  KeyValueRequest,
  PdfFromTemplateRequest as RenderPdfRequest,
  SortDefinition,
  TableCellValue,
  WordTableDataRequest
} from '@/api/generated/main-service/apiGenerated'
import type { PdfFromTemplateRequest as SandboxPdfPayload, SandboxTableData } from '@/types/pdf-sandbox'

// The builder keeps payloads in the object-map shape (stored as the sandbox payload; older ones may still hold
// v1 forms such as single-string sort/verticalMerge). The render API (v2) takes one shape per field:
//   keyed items  [{ key, value }] / [{ key, ...item }]
//   tables       { columns: ["a", "b"], rows: [["x", 1]] }, sort [{ field, direction }], verticalMerge/collapse ["a"]
// These helpers convert at the API boundary.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toCellValue = (value: unknown): TableCellValue =>
  value === null || value === undefined || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? (value ?? null)
    : String(value)

export const toKeyValueList = (map?: Record<string, unknown> | KeyValueRequest[] | null): KeyValueRequest[] | undefined => {
  if (!map) return undefined
  if (Array.isArray(map)) return map
  return Object.entries(map).map(([key, value]) => ({ key, value: value == null ? '' : String(value) }))
}

export const toKeyedList = <T extends object>(
  map?: Record<string, T> | (T & { key: string })[] | null
): (T & { key: string })[] | undefined => {
  if (!map) return undefined
  if (Array.isArray(map)) return map
  return Object.entries(map).map(([key, item]) => ({ key, ...item }))
}

/** Object rows → { columns, rows }. Columns follow `columns` when given, else first-seen key order. */
export const toColumnsAndRows = (
  rows?: Record<string, unknown>[] | null,
  columns?: string[]
): { columns: string[]; rows: TableCellValue[][] } => {
  const list = (rows ?? []).filter(isRecord)
  const cols = columns?.length ? [...columns] : []
  if (!cols.length) {
    const seen = new Set<string>()
    list.forEach(row => Object.keys(row).forEach(key => seen.add(key)))
    cols.push(...seen)
  }
  return { columns: cols, rows: list.map(row => cols.map(col => toCellValue(row[col]))) }
}

/** A column list stored as a string (v1) or array → array; blanks dropped. */
const toColumnList = (value: unknown): string[] | undefined => {
  const list = typeof value === 'string' ? [value] : Array.isArray(value) ? value.filter(v => typeof v === 'string') : []
  const cleaned = list.map(v => v.trim()).filter(Boolean)
  return cleaned.length ? cleaned : undefined
}

/** Sort stored as "field desc" strings (v1) or objects → [{ field, direction }]; rows without a field dropped. */
const toSortList = (value: unknown): SortDefinition[] | undefined => {
  const items = typeof value === 'string' || isRecord(value) ? [value] : Array.isArray(value) ? value : []
  const sort = items
    .map((item): SortDefinition | null => {
      if (typeof item === 'string') {
        const [field, direction] = item.trim().split(/\s+/)
        return field ? { field, direction: direction?.toLowerCase() === 'desc' ? 'desc' : 'asc' } : null
      }
      if (isRecord(item) && typeof item.field === 'string' && item.field.trim()) {
        return { field: item.field.trim(), direction: String(item.direction).toLowerCase() === 'desc' ? 'desc' : 'asc' }
      }
      return null
    })
    .filter((s): s is SortDefinition => s !== null)
  return sort.length ? sort : undefined
}

const toTableOptions = (table: { sort?: unknown; verticalMerge?: unknown; collapse?: unknown }) => ({
  sort: toSortList(table.sort),
  verticalMerge: toColumnList(table.verticalMerge),
  collapse: toColumnList(table.collapse)
})

/** Sandbox payload (object maps) → POST /render/word/template request. */
export const toWordRenderRequest = (payload: SandboxPdfPayload): RenderPdfRequest => {
  const { conditions: _conditions, templateKey, fileType, ...rest } = payload
  return {
    templateKey,
    fileType: fileType === 'docx' ? 'docx' : 'pdf',
    ...rest,
    replace: toKeyValueList(payload.replace),
    table: payload.table?.map(
      ({ rows, sort, verticalMerge, collapse, ...options }: SandboxTableData): WordTableDataRequest => ({
        ...options,
        ...toColumnsAndRows(rows),
        ...toTableOptions({ sort, verticalMerge, collapse })
      })
    ),
    image: toKeyedList(payload.image),
    qrcode: toKeyedList(payload.qrcode),
    barcode: toKeyedList(payload.barcode)
  }
}

const asStringMap = (value: unknown): Record<string, string> | undefined =>
  isRecord(value) ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, String(v ?? '')])) : undefined

const asObjectMap = (value: unknown): Record<string, object> | undefined =>
  isRecord(value) ? Object.fromEntries(Object.entries(value).filter((e): e is [string, object] => isRecord(e[1]))) : undefined

/** Excel builder payload — object maps, tables as loose records (see the Excel template page). */
export interface SandboxExcelPayload {
  templateKey?: string
  fileName?: string
  zipOutput?: boolean
  replace?: Record<string, string>
  table?: Record<string, unknown>[]
  image?: Record<string, unknown>
  qrcode?: Record<string, unknown>
  barcode?: Record<string, unknown>
}

/** Sandbox payload (object maps) → POST /render/excel/template request. */
export const toExcelRenderRequest = (payload: SandboxExcelPayload): ExcelFromTemplateRequest => ({
  templateKey: payload.templateKey,
  fileName: payload.fileName,
  zipOutput: payload.zipOutput,
  replace: toKeyValueList(payload.replace),
  table: payload.table?.map(({ rows, columns, generateTotals, numberFormat, sort, verticalMerge, collapse, ...options }): ExcelTableDataRequest => ({
    ...(options as Omit<ExcelTableDataRequest, 'columns' | 'rows'>),
    ...toColumnsAndRows(
      Array.isArray(rows) ? rows.filter(isRecord) : [],
      Array.isArray(columns) ? columns.filter((c): c is string => typeof c === 'string') : undefined
    ),
    ...toTableOptions({ sort, verticalMerge, collapse }),
    generateTotals: toKeyValueList(asStringMap(generateTotals)),
    numberFormat: toKeyValueList(asStringMap(numberFormat))
  })),
  image: toKeyedList(asObjectMap(payload.image)),
  qrcode: toKeyedList(asObjectMap(payload.qrcode)),
  barcode: toKeyedList(asObjectMap(payload.barcode))
})
