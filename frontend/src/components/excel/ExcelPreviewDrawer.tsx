import React from 'react'
import dynamic from 'next/dynamic'
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, Skeleton } from '@heroui/react'
import Icon from '@/components/icon'
import type { ExcelPreviewMode } from '@/components/excel/ExcelPreview'

const ExcelPreview = dynamic(() => import('@/components/excel/ExcelPreview'), {
  ssr: false,
  loading: () => <Skeleton className='h-full w-full' />
})

const PdfPreview = dynamic(() => import('@/components/pdf/PdfPreview'), {
  ssr: false,
  loading: () => <Skeleton className='h-full w-full' />
})

interface ExcelPreviewDrawerProps {
  isOpen: boolean
  onClose: () => void
  /** Either the filled Excel download URL (for result mode) or the template's PNG/PDF preview URL */
  file: string
  fileName?: string
  /** "xlsx" → spreadsheet preview, "pdf" → PDF viewer, "png" → image preview (Excel template snapshot) */
  format: 'xlsx' | 'pdf' | 'png'
  /** Passed through to ExcelPreview — highlights colored cells in "result" mode */
  mode?: ExcelPreviewMode
}

const ExcelPreviewDrawer: React.FC<ExcelPreviewDrawerProps> = ({ isOpen, onClose, file, fileName, format, mode }) => {
  const title = format === 'xlsx' ? 'Excel Preview' : 'Excel Template Preview'

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={open => !open && onClose()}
      placement='right'
      size='2xl'
      hideCloseButton
      classNames={{ base: 'rounded-none' }}>
      <DrawerContent>
        <>
          <DrawerHeader className='flex items-center justify-between border-b border-default-200 bg-content1 px-4 py-3 text-foreground'>
            <span>{title}</span>
            <button
              onClick={onClose}
              className='flex items-center justify-center rounded p-1 text-default-500 transition-colors hover:bg-default-100 hover:text-foreground'
              title='Close'>
              <Icon icon='lucide:x' className='h-5 w-5' />
            </button>
          </DrawerHeader>
          <DrawerBody className='overflow-hidden p-0'>
            {file ? (
              format === 'pdf' ? (
                <PdfPreview file={file} fileName={fileName} loading={<Skeleton className='h-full w-full' />} />
              ) : format === 'png' ? (
                <div className='flex h-full items-start justify-center overflow-auto bg-default-100 p-4'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file} alt={fileName ?? 'Preview'} className='max-w-full rounded-md border border-default-300 bg-white shadow-sm' />
                </div>
              ) : (
                <ExcelPreview url={file} fileName={fileName} mode={mode ?? 'template'} />
              )
            ) : (
              <div className='flex h-full items-center justify-center text-default-400'>No preview available</div>
            )}
          </DrawerBody>
        </>
      </DrawerContent>
    </Drawer>
  )
}

export default ExcelPreviewDrawer
