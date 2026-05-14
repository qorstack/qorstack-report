import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Viewer, Worker } from '@react-pdf-viewer/core'
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout'
import type { ToolbarProps, ToolbarSlot } from '@react-pdf-viewer/toolbar'
import { Spinner } from '@heroui/react'
import Icon from '@/components/icon'

import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'

interface PdfPreviewProps {
  file: string
  fileName?: string
  width?: number
  onLoadSuccess?: (numPages: number) => void
  loading?: React.ReactNode
  className?: string
  /** Dark toolbar + sidebar + background. Default: true */
  dark?: boolean
  /** Hide the page border/shadow around the PDF page. Default: false */
  noBorder?: boolean
  /** Minimal toolbar: hide sidebar/thumbnail, download, print. Keep only zoom + page nav. */
  minimal?: boolean
  /** Called when PDF fails to load (e.g. presigned URL expired / 403 / network). */
  onLoadError?: (error: { message: string }) => void
  /** If true, show "Reloading…" message instead of "Retry" button in the error state. */
  isReloading?: boolean
}

const baseStyles = `
  /* Page border (no shadow) — shows paper boundaries */
  :root {
    --rpv-core__page-layer-box-shadow: 0 0 0 1px rgba(0,0,0,0.08);
  }

  /* ── Zoom popover trigger ── */
  .rpv-zoom__popover-target {
    align-items: center !important;
    background-color: transparent !important;
    border: 1px solid hsl(var(--heroui-default-300)) !important;
    border-radius: 6px !important;
    cursor: pointer !important;
    display: inline-flex !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    gap: 4px !important;
    min-width: 72px !important;
    padding: 5px 10px !important;
    transition: background-color 0.15s, border-color 0.15s !important;
  }
  .rpv-zoom__popover-target:hover {
    background-color: hsl(var(--heroui-content3)) !important;
    border-color: hsl(var(--heroui-default-400)) !important;
  }
  .rpv-zoom__popover-target-scale {
    flex: 1 !important;
    text-align: center !important;
  }
`

const darkStyles = `
  /* Override rpv library CSS variables using project design-system tokens.
     Use .dark selector so portals (zoom popover) also pick up the right colors. */
  .dark {
    --rpv-core__popover-body-background-color: hsl(var(--heroui-content2));
    --rpv-core__popover-body-border-color:     hsl(var(--heroui-default-300));
    --rpv-core__popover-body-color:            hsl(var(--heroui-foreground));
    --rpv-core__menu-item-color:               hsl(var(--heroui-default-800));
    --rpv-core__menu-item--hover-background-color: hsl(var(--heroui-default-200));
    --rpv-core__menu-divider-border-bottom-color:  hsl(var(--heroui-default-200));
  }

  /* Toolbar */
  .rpv-viewer-dark .rpv-default-layout__toolbar {
    background-color: hsl(var(--heroui-content1)) !important;
    border-bottom: 1px solid hsl(var(--heroui-default-200)) !important;
  }
  /* Sidebar */
  .rpv-viewer-dark .rpv-default-layout__sidebar,
  .rpv-viewer-dark .rpv-default-layout__sidebar-headers {
    background-color: hsl(var(--heroui-content1)) !important;
    border-right: 1px solid hsl(var(--heroui-default-200)) !important;
  }
  .rpv-viewer-dark .rpv-default-layout__sidebar-content {
    background-color: hsl(var(--heroui-content1)) !important;
  }
  /* Toolbar text */
  .rpv-viewer-dark .rpv-default-layout__toolbar * {
    color: hsl(var(--heroui-default-800)) !important;
  }
  /* Zoom trigger — dark mode colors */
  .rpv-viewer-dark .rpv-zoom__popover-target {
    background-color: hsl(var(--heroui-content2)) !important;
    border-color: hsl(var(--heroui-default-300)) !important;
    color: hsl(var(--heroui-default-800)) !important;
  }
  .rpv-viewer-dark .rpv-zoom__popover-target:hover {
    background-color: hsl(var(--heroui-content3)) !important;
    border-color: hsl(var(--heroui-default-400)) !important;
  }
  /* Sidebar icon buttons */
  .rpv-viewer-dark .rpv-default-layout__sidebar-headers button {
    color: hsl(var(--heroui-default-700)) !important;
  }
  .rpv-viewer-dark .rpv-default-layout__sidebar-headers button:hover {
    background-color: hsl(var(--heroui-default-200)) !important;
  }
  /* Page canvas area — darker background makes paper edges pop */
  .rpv-viewer-dark .rpv-core__inner-pages {
    background-color: #2a2a2a !important;
  }
  /* Outer chrome */
  .rpv-viewer-dark {
    background-color: hsl(var(--heroui-content1));
  }
  /* Hide horizontal scrollbar */
  .rpv-viewer-dark .rpv-core__inner-container,
  .rpv-viewer-dark .rpv-core__viewer {
    overflow-x: hidden !important;
  }
`

interface ToolbarContentProps {
  slots: ToolbarSlot
  btnStyle: React.CSSProperties
  hoverClass: string
  iconColor: string
  isDownloading: boolean
  onDownload: (defaultClick: () => void) => void
  minimal?: boolean
}

const ToolbarContent: React.FC<ToolbarContentProps> = ({ slots, btnStyle, hoverClass, iconColor, isDownloading, onDownload, minimal }) => {
  const { CurrentPageLabel, Download, GoToNextPage, GoToPreviousPage, NumberOfPages, Print, Zoom, ZoomIn, ZoomOut } = slots
  return (
    <div style={{ alignItems: 'center', display: 'flex', width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', padding: '4px', gap: '8px' }}>
      {!minimal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <GoToPreviousPage>
            {props => (
              <button style={{ ...btnStyle, cursor: props.isDisabled ? 'not-allowed' : 'pointer' }} className={hoverClass} onClick={props.onClick} disabled={props.isDisabled} title='Previous Page'>
                <Icon icon='lucide:chevron-left' className='h-4 w-4' />
              </button>
            )}
          </GoToPreviousPage>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: iconColor }}>
            <CurrentPageLabel /> / <NumberOfPages />
          </div>
          <GoToNextPage>
            {props => (
              <button style={{ ...btnStyle, cursor: props.isDisabled ? 'not-allowed' : 'pointer' }} className={hoverClass} onClick={props.onClick} disabled={props.isDisabled} title='Next Page'>
                <Icon icon='lucide:chevron-right' className='h-4 w-4' />
              </button>
            )}
          </GoToNextPage>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <ZoomOut>
          {props => (
            <button style={btnStyle} className={hoverClass} onClick={props.onClick} title='Zoom Out'>
              <Icon icon='lucide:zoom-out' className='h-4 w-4' />
            </button>
          )}
        </ZoomOut>
        <Zoom />
        <ZoomIn>
          {props => (
            <button style={btnStyle} className={hoverClass} onClick={props.onClick} title='Zoom In'>
              <Icon icon='lucide:zoom-in' className='h-4 w-4' />
            </button>
          )}
        </ZoomIn>
      </div>

      {!minimal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Download>
            {props => (
              <button
                style={{ ...btnStyle, cursor: isDownloading ? 'not-allowed' : 'pointer' }}
                className={hoverClass}
                onClick={() => onDownload(props.onClick)}
                disabled={isDownloading}
                title='Download'>
                {isDownloading ? <Spinner size='sm' /> : <Icon icon='lucide:download' className='h-4 w-4' />}
              </button>
            )}
          </Download>
          <Print>
            {props => (
              <button style={btnStyle} className={hoverClass} onClick={props.onClick} title='Print'>
                <Icon icon='lucide:printer' className='h-4 w-4' />
              </button>
            )}
          </Print>
        </div>
      )}
    </div>
  )
}

const PdfPreview: React.FC<PdfPreviewProps> = ({
  file,
  fileName,
  width,
  onLoadSuccess,
  loading,
  className,
  dark = true,
  noBorder = false,
  minimal = false,
  onLoadError,
  isReloading
}) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const reportedErrorRef = useRef<string | null>(null)

  // Reset reported-error tracker when file URL changes, so a fresh URL can re-report if it also fails.
  useEffect(() => {
    reportedErrorRef.current = null
  }, [file])

  const handleDownload = useCallback(async (fileUrl: string, name: string) => {
    setIsDownloading(true)
    try {
      const response = await fetch(fileUrl)
      const blob = await response.blob()
      const url = globalThis.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      document.body.appendChild(link)
      link.click()
      link.remove()
      globalThis.URL.revokeObjectURL(url)
    } catch {
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = name
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      link.remove()
    } finally {
      setIsDownloading(false)
    }
  }, [])

  const iconColor = dark ? 'rgb(209, 213, 219)' : 'rgb(31, 41, 55)'
  const hoverClass = dark ? 'hover:bg-white/10' : 'hover:bg-content3'

  const btnStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: iconColor,
    borderRadius: '4px'
  }

  const renderToolbar = useCallback(
    (Toolbar: (props: ToolbarProps) => React.ReactElement) => (
      <Toolbar>
        {(slots: ToolbarSlot) => (
          <ToolbarContent
            slots={slots}
            btnStyle={btnStyle}
            hoverClass={hoverClass}
            iconColor={iconColor}
            isDownloading={isDownloading}
            onDownload={defaultClick => (fileName ? handleDownload(file, fileName) : defaultClick())}
            minimal={minimal}
          />
        )}
      </Toolbar>
    ),
    [file, fileName, isDownloading, handleDownload, iconColor, hoverClass, btnStyle, minimal]
  )

  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    renderToolbar,
    sidebarTabs: minimal ? () => [] : defaultTabs => [defaultTabs[0]]
  })

  return (
    <>
      <style>{baseStyles}</style>
      {dark && <style>{darkStyles}</style>}
      {noBorder && <style>{`
        :root { --rpv-core__page-layer-box-shadow: none !important; }
        .rpv-core__page-layer { box-shadow: none !important; border: none !important; }
      `}</style>}
      <div
        className={`${className ?? ''} ${dark ? 'rpv-viewer-dark' : ''}`}
        style={{ height: '100%', width: width ?? '100%', overflow: 'hidden', overflowX: 'hidden' }}>
        <Worker workerUrl='https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'>
          <div style={{ height: '100%' }}>
            <Viewer
              fileUrl={file}
              plugins={[defaultLayoutPluginInstance]}
              onDocumentLoad={e => onLoadSuccess?.(e.doc.numPages)}
              renderLoader={() => <div className='h-full w-full'>{loading}</div>}
              renderError={error => {
                const message = error?.message || 'Failed to load preview'
                // Report once per URL — re-mounting on a fresh `file` resets the ref.
                if (reportedErrorRef.current !== message) {
                  reportedErrorRef.current = message
                  onLoadError?.({ message })
                }
                const isExpired = /403|Unexpected server response|expired|Forbidden/i.test(message)
                return (
                  <div className='flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center'>
                    <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10'>
                      <Icon
                        icon={isReloading ? 'lucide:refresh-cw' : 'lucide:file-warning'}
                        className={`h-6 w-6 text-white/50 ${isReloading ? 'animate-spin' : ''}`}
                      />
                    </div>
                    <div>
                      <p className='text-[13px] font-bold text-white/80'>
                        {isReloading ? 'Refreshing preview…' : isExpired ? 'Preview link expired' : 'Unable to load preview'}
                      </p>
                      <p className='mt-1 max-w-xs text-[11.5px] text-white/40'>
                        {isReloading
                          ? 'Fetching a new signed URL from the server.'
                          : isExpired
                            ? 'Signed URLs expire after 1 hour. Reloading automatically…'
                            : 'Something went wrong while fetching the PDF.'}
                      </p>
                    </div>
                  </div>
                )
              }}
            />
          </div>
        </Worker>
      </div>
    </>
  )
}

export default PdfPreview
