import type { SortDefinition } from '@/api/generated/main-service/apiGenerated'
import type { ReplaceItem, ImageItem, QrCodeItem, BarcodeItem } from '@/components/pdf/SandboxInputs'

export interface ConditionalFormatRule {
  value?: string | number | null
  operator?: string
  fontColor?: string
  backgroundColor?: string
  bold?: boolean
  italic?: boolean
}

export interface ConditionalFormatConfig {
  field: string
  rules: ConditionalFormatRule[]
}

export interface SplitToSheetsConfig {
  field: string
  templateSheet?: string
}

export interface ExcelTableItem {
  id: string
  columns: string[]
  rows: Record<string, string>[]
  sort?: SortDefinition[]
  verticalMerge?: string[]
  collapse?: string[]
  freezeHeader?: boolean
  autoFilter?: boolean
  autoFitColumns?: boolean
  excelTableStyle?: string
  outline?: boolean
  /** Field → aggregation function (e.g. { "total": "sum", "quantity": "count" }) */
  generateTotals?: Record<string, string>
  /** Field → Excel number format string (e.g. { "price": "#,##0.00" }) */
  numberFormat?: Record<string, string>
  conditionalFormat?: ConditionalFormatConfig[]
  splitToSheets?: SplitToSheetsConfig
}

export interface ExcelUiState {
  templateKey: string
  fileName: string
  zipOutput?: boolean
  replace: ReplaceItem[]
  table: ExcelTableItem[]
  image: ImageItem[]
  qrcode: QrCodeItem[]
  barcode: BarcodeItem[]
}
