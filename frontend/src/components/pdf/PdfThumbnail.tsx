import React, { useState, useEffect, useRef } from 'react'
import { Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Skeleton } from '@heroui/react'
import Icon from '@/components/icon'
import * as pdfjsLib from 'pdfjs-dist'
import dynamic from 'next/dynamic'

// Use local worker file from public folder
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
}

const PdfPreview = dynamic(() => import('@/components/pdf/PdfPreview'), {
  ssr: false,
  loading: () => (
    <div className='flex items-center gap-2 p-4'>
      <Spinner size='sm' color='primary' />
      <span className='text-sm text-default-500'>Initializing Preview...</span>
    </div>
  )
})

export const PdfThumbnail = ({ url }: { url: string }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderIdRef = useRef(0)
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)

  // Render first page to canvas
  useEffect(() => {
    if (!url) return

    // Ensure worker is set
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
    }

    // Increment render ID to cancel any previous render
    renderIdRef.current += 1
    const currentRenderId = renderIdRef.current
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null
    let cancelled = false

    setIsLoading(true)
    setError(null)

    // Cleanup previous PDF document
    if (pdfDocRef.current) {
      pdfDocRef.current.destroy()
      pdfDocRef.current = null
    }

    const renderPage = async (retryCount = 0) => {
      const maxRetries = 2

      try {
        // Check if this render is still valid
        if (cancelled || currentRenderId !== renderIdRef.current) return

        // Wait for container to be ready
        const container = containerRef.current
        if (!container) {
          // Container not ready, retry after a short delay
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100))
            return renderPage(retryCount + 1)
          }
          return
        }

        // Load PDF document with caching disabled to avoid CORS issues
        loadingTask = pdfjsLib.getDocument({
          url: url,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
          disableAutoFetch: false,
          disableStream: false
        })

        const pdf = await loadingTask.promise

        // Check if this render is still valid
        if (cancelled || currentRenderId !== renderIdRef.current) {
          pdf.destroy()
          return
        }

        pdfDocRef.current = pdf

        // Get first page
        const page = await pdf.getPage(1)

        // Check if this render is still valid
        if (cancelled || currentRenderId !== renderIdRef.current) return

        // Get container dimensions
        const containerWidth = container.clientWidth || 200
        const containerHeight = container.clientHeight || 160

        // Get page dimensions at scale 1
        const viewport = page.getViewport({ scale: 1 })

        // Calculate scale to fill the container (cover)
        const scaleX = containerWidth / viewport.width
        const scaleY = containerHeight / viewport.height
        const scale = Math.max(scaleX, scaleY)

        const scaledViewport = page.getViewport({ scale })

        // Set canvas dimensions to match container exactly
        const canvas = canvasRef.current
        if (!canvas) return

        canvas.width = containerWidth
        canvas.height = containerHeight

        // Render page to canvas
        const context = canvas.getContext('2d')
        if (!context) return

        context.clearRect(0, 0, canvas.width, canvas.height)

        const offsetX = (containerWidth - scaledViewport.width) / 2
        const offsetY = 0 // Top align to show header

        const renderTask = page.render({
          canvasContext: context,
          viewport: scaledViewport,
          transform: [1, 0, 0, 1, offsetX, offsetY]
        })

        await renderTask.promise

        // Check if this render is still valid
        if (cancelled || currentRenderId !== renderIdRef.current) return

        setIsLoading(false)
        setError(null)
      } catch (err: unknown) {
        // Ignore errors from cancelled/destroyed operations
        if (cancelled || currentRenderId !== renderIdRef.current) return

        const errorMessage = err instanceof Error ? err.message : String(err)
        if (errorMessage.includes('Transport destroyed') || errorMessage.includes('Worker was destroyed')) return

        console.error('Failed to render PDF thumbnail:', err)

        // Retry on network errors
        if (
          retryCount < maxRetries &&
          (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('CORS'))
        ) {
          await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)))
          return renderPage(retryCount + 1)
        }

        setError('Failed to load')
        setIsLoading(false)
      }
    }

    // Small delay to ensure container is mounted and has dimensions
    const timeoutId = setTimeout(() => {
      renderPage()
    }, 50)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      // Cancel in-progress loading
      if (loadingTask) {
        loadingTask.destroy()
        loadingTask = null
      }
      // Cleanup on unmount or URL change
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy()
        pdfDocRef.current = null
      }
    }
  }, [url])

  return (
    <>
      <div
        ref={containerRef}
        className='group relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden bg-content1 transition-transform duration-300'
        onClick={() => setIsExpanded(true)}>
        {/* Loading state */}
        {isLoading && (
          <div className='absolute inset-0 z-10 flex items-center justify-center bg-content2'>
            <Spinner size='sm' color='primary' />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className='absolute inset-0 flex items-center justify-center bg-content2'>
            <span className='text-[8px] text-danger'>{error}</span>
          </div>
        )}

        {/* Canvas - Pure image, NO scrollbars possible */}
        <canvas
          ref={canvasRef}
          className={`max-h-full max-w-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        />

        {/* Expand Button */}
        <div className='absolute inset-0 z-10 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/10'>
          <div className='opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
            <Icon icon='lucide:maximize-2' className='h-4 w-4 text-white drop-shadow-md' />
          </div>
        </div>
      </div>

      {/* Full Preview Modal - Uses Viewer with scrolling */}
      <Modal isOpen={isExpanded} onOpenChange={setIsExpanded} size='5xl' scrollBehavior='inside'>
        <ModalContent className='h-[90vh]'>
          {(onClose: () => void) => (
            <>
              <ModalHeader className='flex flex-col gap-1'>PDF Preview</ModalHeader>
              <ModalBody className='p-0'>
                <div className='h-full w-full overflow-hidden bg-content3'>
                  {url && (
                    <div className='flex h-full w-full items-center justify-center p-4'>
                      <PdfPreview
                        file={url}
                        loading={<Skeleton className='h-full w-full' />}
                        className='h-full w-full shadow-lg'
                      />
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color='danger' variant='flat' onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}
