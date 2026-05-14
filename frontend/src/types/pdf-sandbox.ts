import type {
  ImageDataRequest,
  QrCodeDataRequest,
  BarcodeDataRequest,
  WordTableDataRequest,
  PdfWatermarkRequest,
  PdfPasswordRequest
} from '../api/generated/main-service/apiGenerated'

export type { PdfWatermarkRequest, PdfPasswordRequest } from '../api/generated/main-service/apiGenerated'

export interface PdfFromTemplateRequest {
  templateKey: string
  fileName?: string
  /** Output format — backend supports "pdf" (default) or "docx" */
  fileType?: string
  pdfPassword?: PdfPasswordRequest
  watermark?: PdfWatermarkRequest
  replace?: Record<string, string>
  table?: WordTableDataRequest[]
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
  table?: WordTableDataRequest[]
  image?: Record<string, ImageDataRequest>
  qrcode?: Record<string, QrCodeDataRequest>
  conditions?: Record<string, boolean>
}

export interface ExportOptions {
  async?: boolean
  return?: 'stream' | 'url'
}
