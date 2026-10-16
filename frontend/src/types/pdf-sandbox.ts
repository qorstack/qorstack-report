import type {
  ImageDataRequest,
  QrCodeDataRequest,
  BarcodeDataRequest,
  WordTableDataRequest,
  PdfWatermarkRequest,
  PdfPasswordRequest
} from '../api/generated/main-service/apiGenerated'

export type { PdfWatermarkRequest, PdfPasswordRequest } from '../api/generated/main-service/apiGenerated'

/**
 * Table data in the sandbox (builder) payload: one object per row, keyed by column name.
 * Converted to the API's { columns, rows } shape by `toWordRenderRequest` before calling the render API.
 */
export type SandboxTableData = Omit<WordTableDataRequest, 'rows' | 'columns' | 'sort'> & {
  rows?: Record<string, unknown>[]
  sort?: BuilderSortDefinition[]
}

/** Sort row as edited in the builder; the direction may be blank until chosen (normalized at the API boundary). */
export interface BuilderSortDefinition {
  field?: string
  direction?: string
}

/**
 * Sandbox (builder) payload — the object-map shape stored as the template's sandbox payload.
 * The public render API takes keyed arrays instead; see `@/utils/keyed-request`.
 */
export interface PdfFromTemplateRequest {
  templateKey: string
  fileName?: string
  /** Output format — backend supports "pdf" (default) or "docx" */
  fileType?: string
  pdfPassword?: PdfPasswordRequest
  watermark?: PdfWatermarkRequest
  replace?: Record<string, string>
  table?: SandboxTableData[]
  image?: Record<string, ImageDataRequest>
  qrcode?: Record<string, QrCodeDataRequest>
  barcode?: Record<string, BarcodeDataRequest>
  conditions?: Record<string, boolean>
  zipOutput?: boolean
}

export interface ExportPdfRequest {
  templateId: string
  options?: ExportOptions
  replace?: Record<string, string>
  table?: SandboxTableData[]
  image?: Record<string, ImageDataRequest>
  qrcode?: Record<string, QrCodeDataRequest>
  conditions?: Record<string, boolean>
}

export interface ExportOptions {
  async?: boolean
  return?: 'stream' | 'url'
}
