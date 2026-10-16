'use client'

import type React from 'react'
import dynamic from 'next/dynamic'

export interface PdfPreviewProps {
  file: string
  fileName?: string
  width?: number
  onLoadSuccess?: (numPages: number) => void
  loading?: React.ReactNode
  className?: string
  /** Force the dark theme on the viewer chrome. Default: false (follows the site theme) */
  dark?: boolean
  /** Hide the page border/shadow around the PDF page. Default: false */
  noBorder?: boolean
  /** Minimal toolbar: hide sidebar/thumbnail, download, print. Keep only zoom + page nav. */
  minimal?: boolean
  /** Called when PDF fails to load (e.g. presigned URL expired / 403 / network). */
  onLoadError?: (error: { message: string }) => void
  /** If true, show "Reloading…" message instead of "Retry" button in the error state. */
  isReloading?: boolean
  /** When provided, renders a fullscreen button at the end of the toolbar. */
  onFullscreen?: () => void
  /** When provided, renders a download button at the end of the toolbar (replaces fullscreen). */
  onDownloadResult?: (url: string, name: string) => void
  /** When provided, the toolbar Download button calls this instead of downloading the preview file. */
  onDownloadOriginal?: () => void | Promise<void>
  /** Hide the toolbar Download button (the page offers its own clearly labelled download). */
  hideDownload?: boolean
  /** Open the PDF at this page index (0-based). Changing this remounts the viewer. */
  initialPage?: number
  /** Restrict visible pages to this 1-based inclusive range [start, end]. Pages outside the range are hidden via CSS. */
  pageRange?: [number, number]
}


// PDF.js needs browser canvas APIs; render the viewer only on the client.
const PdfPreview = dynamic<PdfPreviewProps>(() => import('./PdfPreviewRenderer'), { ssr: false })

export default PdfPreview
