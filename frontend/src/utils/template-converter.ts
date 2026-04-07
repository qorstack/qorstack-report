import { PdfFromTemplateRequest } from '@/types/pdf-sandbox'
import {
  ReplaceItem,
  TableItem,
  ImageItem,
  QrCodeItem,
  BarcodeItem,
  generateId,
  formatKey
} from '@/components/pdf/SandboxInputs'
import { WordTableDataRequest, SortDefinition } from '@/api/generated/main-service/apiGenerated'

// --- UI State Interface (Arrays for Ordering) ---
export interface UiState {
  templateKey: string
  fileName: string
  replace: ReplaceItem[]
  table: TableItem[]
  image: ImageItem[]
  qrcode: QrCodeItem[]
  barcode: BarcodeItem[]
}

export const DEFAULT_UI_STATE: UiState = {
  templateKey: '',
  fileName: 'My_Generated_Report',
  replace: [],
  table: [],
  image: [],
  qrcode: [],
  barcode: []
}

export const convertToUiState = (data: PdfFromTemplateRequest): UiState => {
  return {
    templateKey: data.templateKey || '',
    fileName: data.fileName || 'My_Generated_Report',
    replace: Object.entries(data.replace || {}).map(([k, v]) => ({
      id: generateId(),
      key: formatKey(k, 'replace'),
      value: v
    })),
    image: Object.entries(data.image || {}).map(([k, v]) => ({
      id: generateId(),
      key: formatKey(k, 'image'),
      data: v
    })),
    qrcode: Object.entries(data.qrcode || {}).map(([k, v]) => ({
      id: generateId(),
      key: formatKey(k, 'qrcode'),
      data: v
    })),
    barcode: Object.entries(data.barcode || {}).map(([k, v]) => ({
      id: generateId(),
      key: formatKey(k, 'barcode'),
      data: v
    })),
    table: (() => {
      const tablesData = data.table || (data as unknown as { tables: unknown[] }).tables

      if (Array.isArray(tablesData)) {
        return tablesData.map((t: unknown) => {
          let rows: unknown[] = []
          let tableReq: WordTableDataRequest | null = null

          // Handle rows
          if (Array.isArray(t)) {
            rows = t
          } else if (t && typeof t === 'object') {
            tableReq = t as WordTableDataRequest
            rows = tableReq.rows || []
          }

          let columns: string[] = []
          if (rows.length > 0) {
            const firstRow = rows[0]
            if (firstRow && typeof firstRow === 'object') {
              columns = Object.keys(firstRow).map(c => formatKey(c, 'table'))
            }
          }

          const verticalMerge = tableReq?.verticalMerge
          const collapse = tableReq?.collapse

          return {
            id: generateId(),
            columns: columns,
            rows: rows.map((r: unknown) => {
              const newRow: Record<string, string> = {}
              if (r && typeof r === 'object') {
                Object.entries(r).forEach(([rk, rv]) => {
                  const colKey = formatKey(rk, 'table')
                  newRow[colKey] = rv === null || rv === undefined ? '' : String(rv)
                })
              }
              return newRow
            }),
            sort: (() => {
              const sort = tableReq?.sort as (SortDefinition & { key?: string; order?: string })[] | undefined | null
              if (sort && Array.isArray(sort)) {
                return sort.map(s => ({
                  field: s.field,
                  direction: s.direction
                }))
              }
              return []
            })(),
            verticalMerge: Array.isArray(verticalMerge) ? verticalMerge : undefined,
            collapse: Array.isArray(collapse) ? collapse : undefined
          }
        })
      }
      return []
    })()
  }
}

export const convertFromUiState = (state: UiState): PdfFromTemplateRequest => {
  const stripKey = (key: string, type: 'replace' | 'table' | 'image' | 'qrcode' | 'barcode') => {
    let k = key.replace(/^\{\{/, '').replace(/\}\}$/, '')
    if (type !== 'replace') {
      const prefix = `${type}:`
      if (k.startsWith(prefix)) return k.substring(prefix.length)
    }
    if (type === 'table') {
      // If it's a table row like {{row:name}}, strip row:
      if (k.startsWith('row:')) return k.substring('row:'.length)
      // Legacy support for col:
      if (k.startsWith('col:')) return k.substring('col:'.length)
    }
    return k
  }

  return {
    templateKey: state.templateKey,
    fileName: state.fileName,
    replace: state.replace.reduce((acc, item) => ({ ...acc, [stripKey(item.key, 'replace')]: item.value }), {}),
    table: state.table.map(item => {
      const rows = (item.rows || []).map(row => {
        const newRow: Record<string, unknown> = {}
        // Ensure all columns are present, even if empty
        item.columns.forEach(colKey => {
          let cleanColKey = colKey.replace(/^\{\{/, '').replace(/\}\}$/, '')
          if (cleanColKey.startsWith('row:')) cleanColKey = cleanColKey.substring(4)
          else if (cleanColKey.startsWith('col:')) cleanColKey = cleanColKey.substring(4) // Legacy
          newRow[cleanColKey] = row[colKey] || ''
        })
        return newRow
      })

      const sort =
        item.sort?.map(s => ({
          field: s.field,
          direction: s.direction
        })) || []

      return {
        rows,
        sort: sort.length > 0 ? sort : [],
        ...(item.verticalMerge && item.verticalMerge.length > 0 ? { verticalMerge: item.verticalMerge } : {}),
        ...(item.collapse && item.collapse.length > 0 ? { collapse: item.collapse } : {})
      }
    }),
    image: state.image.reduce((acc, item) => ({ ...acc, [stripKey(item.key, 'image')]: item.data }), {}),
    qrcode: state.qrcode.reduce((acc, item) => ({ ...acc, [stripKey(item.key, 'qrcode')]: item.data }), {}),
    barcode: state.barcode.reduce((acc, item) => ({ ...acc, [stripKey(item.key, 'barcode')]: item.data }), {})
  }
}
