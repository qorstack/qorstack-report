import React, { useState, useCallback } from 'react'
import { Viewer, Worker, SpecialZoomLevel } from '@react-pdf-viewer/core'
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout'
import type { ToolbarProps, ToolbarSlot } from '@react-pdf-viewer/toolbar'
import { Spinner } from '@heroui/react'
import Icon from '@/components/icon'

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'

interface PdfPreviewProps {
  file: string
  fileName?: string
  width?: number
  onLoadSuccess?: (numPages: number) => void
  loading?: React.ReactNode
  className?: string
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ file, fileName, width, onLoadSuccess, loading, className }) => {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = useCallback(async (fileUrl: string, name: string) => {
    setIsDownloading(true)
    try {
      const response = await fetch(fileUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed', error)
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = name
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      setIsDownloading(false)
    }
  }, [])

  const renderToolbar = React.useCallback(
    (Toolbar: (props: ToolbarProps) => React.ReactElement) => (
      <Toolbar>
        {(slots: ToolbarSlot) => {
          const {
            CurrentPageLabel,
            Download,
            EnterFullScreen,
            GoToNextPage,
            GoToPreviousPage,
            NumberOfPages,
            Print,
            Zoom,
            ZoomIn,
            ZoomOut
          } = slots
          return (
            <div
              style={{
                alignItems: 'center',
                display: 'flex',
                width: '100%',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                padding: '4px',
                gap: '8px'
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <GoToPreviousPage>
                  {props => (
                    <button
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: props.isDisabled ? 'not-allowed' : 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgb(31, 41, 55)',
                        borderRadius: '4px'
                      }}
                      className='hover:bg-content3'
                      onClick={props.onClick}
                      disabled={props.isDisabled}
                      title='Previous Page'>
                      <Icon icon='lucide:chevron-left' className='h-4 w-4' />
                    </button>
                  )}
                </GoToPreviousPage>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                  <CurrentPageLabel /> / <NumberOfPages />
                </div>
                <GoToNextPage>
                  {props => (
                    <button
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: props.isDisabled ? 'not-allowed' : 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgb(31, 41, 55)',
                        borderRadius: '4px'
                      }}
                      className='hover:bg-content3'
                      onClick={props.onClick}
                      disabled={props.isDisabled}
                      title='Next Page'>
                      <Icon icon='lucide:chevron-right' className='h-4 w-4' />
                    </button>
                  )}
                </GoToNextPage>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ZoomOut>
                  {props => (
                    <button
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgb(31, 41, 55)',
                        borderRadius: '4px'
                      }}
                      className='hover:bg-content3'
                      onClick={props.onClick}
                      title='Zoom Out'>
                      <Icon icon='lucide:zoom-out' className='h-4 w-4' />
                    </button>
                  )}
                </ZoomOut>
                <Zoom />
                <ZoomIn>
                  {props => (
                    <button
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgb(31, 41, 55)',
                        borderRadius: '4px'
                      }}
                      className='hover:bg-content3'
                      onClick={props.onClick}
                      title='Zoom In'>
                      <Icon icon='lucide:zoom-in' className='h-4 w-4' />
                    </button>
                  )}
                </ZoomIn>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Download>
                  {props => (
                    <button
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: isDownloading ? 'not-allowed' : 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgb(31, 41, 55)', // gray-800
                        borderRadius: '4px'
                      }}
                      className='hover:bg-content3'
                      onClick={() => {
                        if (fileName) {
                          handleDownload(file, fileName)
                        } else {
                          props.onClick()
                        }
                      }}
                      disabled={isDownloading}
                      title='Download'>
                      {isDownloading ? <Spinner size='sm' /> : <Icon icon='lucide:download' className='h-4 w-4' />}
                    </button>
                  )}
                </Download>
                <Print>
                  {props => (
                    <button
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgb(31, 41, 55)',
                        borderRadius: '4px'
                      }}
                      className='hover:bg-content3'
                      onClick={props.onClick}
                      title='Print'>
                      <Icon icon='lucide:printer' className='h-4 w-4' />
                    </button>
                  )}
                </Print>
              </div>
            </div>
          )
        }}
      </Toolbar>
    ),
    [file, fileName, isDownloading, handleDownload]
  )

  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    renderToolbar,
    sidebarTabs: defaultTabs => [defaultTabs[0]]
  })

  return (
    <div className={className} style={{ height: '100%', width: width ?? '100%', overflow: 'hidden' }}>
      <Worker workerUrl='https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'>
        <div style={{ height: '100%' }}>
          <Viewer
            fileUrl={file}
            plugins={[defaultLayoutPluginInstance]}
            onDocumentLoad={e => {
              if (onLoadSuccess) onLoadSuccess(e.doc.numPages)
            }}
            renderLoader={() => <div className='h-full w-full'>{loading}</div>}
          />
        </div>
      </Worker>
    </div>
  )
}

export default PdfPreview
