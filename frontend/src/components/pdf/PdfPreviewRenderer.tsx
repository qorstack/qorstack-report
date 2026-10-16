'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, Thumbnail, pdfjs } from 'react-pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { Spinner } from '@heroui/react'
import Icon from '@/components/icon'
import { downloadFileFromUrl } from '@/utils/download-file'
import type { PdfPreviewProps } from './PdfPreview'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Copied from the same resolved PDF.js package by prebuild/postinstall.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
// Page width tracks the pane but is clamped so the page never shrinks to nothing or grows absurdly wide.
const PAGE_MIN_WIDTH = 360
const PAGE_MAX_WIDTH = 960
const ZOOM_MIN = 0.5
const ZOOM_MAX = 3
const ZOOM_STEP = 0.25
const ZOOM_LEVELS = Array.from({ length: (ZOOM_MAX - ZOOM_MIN) / ZOOM_STEP + 1 }, (_, i) => ZOOM_MIN + i * ZOOM_STEP)

const pdfOptions = {
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  isEvalSupported: false
}

const PdfPreviewRenderer: React.FC<PdfPreviewProps> = ({
  file, fileName, width, onLoadSuccess, loading, className, dark = false,
  noBorder = false, minimal = false, onLoadError, isReloading, onFullscreen,
  onDownloadResult, onDownloadOriginal, initialPage = 0, pageRange, hideDownload = false
}) => {
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(initialPage + 1)
  const [zoom, setZoom] = useState(1)
  const [showSidebar, setShowSidebar] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contentWidth, setContentWidth] = useState(600)
  const pageWidth = Math.min(PAGE_MAX_WIDTH, Math.max(PAGE_MIN_WIDTH, contentWidth))
  const containerRef = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<HTMLDivElement>(null)
  const pageNodes = useRef(new Map<number, HTMLDivElement>())
  const requestedPage = useRef(initialPage + 1)
  const reportedError = useRef<string | null>(null)

  const first = Math.max(1, pageRange?.[0] ?? 1)
  const last = Math.min(numPages, pageRange?.[1] ?? numPages)
  const visiblePages = useMemo(() => Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => first + i), [first, last])

  useEffect(() => {
    setNumPages(0)
    setError(null)
    setCurrentPage(initialPage + 1)
    requestedPage.current = initialPage + 1
    reportedError.current = null
    pageNodes.current.clear()
  }, [file, initialPage])

  useEffect(() => {
    const container = pagesRef.current
    if (!container) return
    const resize = new ResizeObserver(() => setContentWidth(Math.max(100, container.clientWidth - 40)))
    resize.observe(container)
    return () => resize.disconnect()
  }, [showSidebar, numPages])

  const goToPage = useCallback((page: number) => {
    const value = Math.max(first, Math.min(last, page))
    setCurrentPage(value)
    pageNodes.current.get(value)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [first, last])

  const handleScroll = () => {
    const viewport = pagesRef.current
    if (!viewport) return
    const top = viewport.getBoundingClientRect().top
    let nearest = first
    let distance = Infinity
    pageNodes.current.forEach((node, page) => {
      const delta = Math.abs(node.getBoundingClientRect().top - top)
      if (delta < distance) { distance = delta; nearest = page }
    })
    setCurrentPage(nearest)
  }

  const handleError = (loadError: Error) => {
    const message = loadError.message || 'Failed to load preview'
    setError(message)
    if (reportedError.current !== message) {
      reportedError.current = message
      onLoadError?.({ message })
    }
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      if (onDownloadResult) onDownloadResult(file, fileName ?? 'download.pdf')
      else if (onDownloadOriginal) await onDownloadOriginal()
      else await downloadFileFromUrl(file, fileName ?? 'download.pdf')
    } finally { setIsDownloading(false) }
  }

  const handlePrint = async () => {
    const canvases = pagesRef.current?.querySelectorAll<HTMLCanvasElement>('.react-pdf__Page__canvas')
    if (!canvases?.length) return
    const popup = window.open('', '_blank')
    if (!popup) return
    popup.document.title = fileName ?? 'PDF preview'
    const style = popup.document.createElement('style')
    style.textContent = '@page{margin:0}body{margin:0}img{display:block;width:100%;break-after:page}img:last-child{break-after:auto}'
    popup.document.head.appendChild(style)
    await Promise.all(Array.from(canvases).map(canvas => new Promise<void>((resolve) => {
      const img = popup.document.createElement('img')
      img.onload = () => resolve()
      img.onerror = () => resolve()
      img.src = canvas.toDataURL('image/png')
      popup.document.body.appendChild(img)
    })))
    popup.focus()
    popup.print()
  }

  const buttonClass =
    'flex h-8 w-8 items-center justify-center border border-transparent text-default-500 transition-colors hover:border-default-300 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent'
  const button = (icon: string, title: string, action: () => void, disabled = false, pressed?: boolean) => (
    <button
      type='button'
      className={`${buttonClass} ${pressed ? 'border-default-300 text-foreground' : ''}`}
      onClick={action}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={pressed}>
      <Icon icon={icon} className='h-4 w-4' />
    </button>
  )
  const isExpired = /403|Unexpected server response|expired|Forbidden/i.test(error ?? '')
  const errorContent = (
    <div className='flex h-full min-h-48 flex-col items-center justify-center gap-3 p-8 text-center' role='alert'>
      <Icon icon={isReloading ? 'lucide:refresh-cw' : 'lucide:file-warning'} className={`h-6 w-6 text-default-500 ${isReloading ? 'animate-spin' : ''}`} />
      <p className='text-[15px] font-semibold'>{isReloading ? 'Refreshing preview…' : isExpired ? 'Preview link expired' : 'Unable to load preview'}</p>
      <p className='max-w-xs text-[13px] text-default-500'>
        {isReloading ? 'Fetching a new signed URL from the server.' : isExpired ? 'Signed URLs expire after 1 hour. Reloading automatically…' : 'Something went wrong while fetching the PDF.'}
      </p>
    </div>
  )

  return (
    <div ref={containerRef} className={`${className ?? ''} ${dark ? 'dark' : ''} flex h-full flex-col overflow-hidden border border-divider bg-content1 text-foreground`} style={{ width: width ?? '100%' }}>
      <div className='flex flex-wrap items-center justify-between gap-2 border-b border-divider bg-content1 px-1.5 py-1'>
        <div className='flex items-center gap-0.5'>
          {!minimal && button('lucide:panel-left', 'Show page thumbnails', () => setShowSidebar(v => !v), false, showSidebar)}
          {button('lucide:chevron-left', 'Previous page', () => goToPage(currentPage - 1), !numPages || currentPage <= first)}
          <span className='min-w-[64px] px-1 text-center font-mono text-[12px] tabular-nums text-default-500' aria-live='polite'>
            <span className='text-foreground'>{numPages ? currentPage : 0}</span> / {numPages}
          </span>
          {button('lucide:chevron-right', 'Next page', () => goToPage(currentPage + 1), !numPages || currentPage >= last)}
        </div>
        <div className='flex items-center gap-0.5'>
          {button('lucide:zoom-out', 'Zoom out', () => setZoom(z => Math.max(ZOOM_MIN, z - ZOOM_STEP)), zoom <= ZOOM_MIN)}
          <select
            aria-label='Zoom'
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className='h-8 border border-default-300 bg-content2 px-1.5 font-mono text-[12px] text-foreground outline-none focus:border-foreground'>
            {ZOOM_LEVELS.map(value => <option key={value} value={value}>{Math.round(value * 100)}%</option>)}
          </select>
          {button('lucide:zoom-in', 'Zoom in', () => setZoom(z => Math.min(ZOOM_MAX, z + ZOOM_STEP)), zoom >= ZOOM_MAX)}
        </div>
        <div className='flex items-center gap-0.5'>
          {!hideDownload && (!minimal || onDownloadResult) && (isDownloading ? <span className='flex h-8 w-8 items-center justify-center'><Spinner size='sm' color='default' /></span> : button('lucide:download', 'Download', () => { void handleDownload() }))}
          {!minimal && button('lucide:printer', 'Print', () => { void handlePrint() }, !numPages)}
          {onFullscreen && !onDownloadResult && button('lucide:maximize-2', 'Full screen', onFullscreen)}
        </div>
      </div>
      <Document
        key={file}
        file={file}
        options={pdfOptions}
        className='flex min-h-0 flex-1 overflow-hidden'
        loading={<div className='flex w-full items-center justify-center bg-background p-5'>{loading ?? <Spinner color='default' />}</div>}
        error={errorContent}
        onLoadError={handleError}
        onSourceError={handleError}
        onLoadSuccess={(doc: PDFDocumentProxy) => { setNumPages(doc.numPages); onLoadSuccess?.(doc.numPages) }}>
        {showSidebar && !minimal && (
          <aside className='w-28 shrink-0 overflow-auto border-r border-divider bg-content1 p-2' aria-label='Page thumbnails'>
            {visiblePages.map(page => <button key={page} type='button' className={`mb-3 w-full border p-1 ${page === currentPage ? 'border-foreground' : 'border-transparent hover:border-default-300'}`} onClick={() => goToPage(page)} aria-label={`Go to page ${page}`} aria-current={page === currentPage ? 'page' : undefined}>
              <Thumbnail pageNumber={page} width={90} onItemClick={() => goToPage(page)} />
              <span className='font-mono text-[12px] text-default-500'>{page}</span>
            </button>)}
          </aside>
        )}
        <div ref={pagesRef} onScroll={handleScroll} className='min-h-0 min-w-0 flex-1 overflow-auto bg-[repeating-linear-gradient(135deg,#E7E7EA_0_10px,#EDEDF0_10px_20px)] dark:bg-[repeating-linear-gradient(135deg,#0B0B0B_0_10px,#0E0E0E_10px_20px)] p-5'>
          {visiblePages.map(page => <div key={page} ref={node => { if (node) pageNodes.current.set(page, node); else pageNodes.current.delete(page) }} className={`mx-auto mb-5 w-fit bg-[#FFFFFF] shadow-[0_16px_40px_-20px_rgba(20,20,20,.35)] dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,.8)] ${noBorder ? '' : 'outline outline-1 outline-default-300'}`}>
            <Page pageNumber={page} width={pageWidth} scale={zoom} loading={<Spinner color='default' />}
              onRenderSuccess={() => {
                if (requestedPage.current && page === Math.max(first, Math.min(last, requestedPage.current))) {
                  pageNodes.current.get(page)?.scrollIntoView({ block: 'start' })
                  setCurrentPage(page)
                  requestedPage.current = 0
                }
              }} />
          </div>)}
        </div>
      </Document>
    </div>
  )
}

export default PdfPreviewRenderer
