import { ImageDataRequest, QrCodeDataRequest, BarcodeDataRequest, WordTableDataRequest } from '../api/generated/main-service/apiGenerated'

export interface PdfFromTemplateRequest {
  templateKey: string
  fileName?: string
  filePassword?: string
  watermark?: string
  replace?: Record<string, string>
  table?: WordTableDataRequest[]
  image?: Record<string, ImageDataRequest>
  qrcode?: Record<string, QrCodeDataRequest>
  barcode?: Record<string, BarcodeDataRequest>
  conditions?: Record<string, boolean>
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
