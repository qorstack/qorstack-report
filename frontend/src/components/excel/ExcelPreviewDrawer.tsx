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
  const title = format === 'xlsx' ? 'Excel preview' : 'Template preview'

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={open => !open && onClose()}
      placement='right'
      size='2xl'
      hideCloseButton
      classNames={{ base: 'rounded-none border-l border-divider bg-background' }}>
      <DrawerContent>
        <>
          <DrawerHeader className='flex items-center justify-between border-b border-divider bg-content1 px-4 py-3 text-foreground'>
            <span className='text-[14px] font-medium text-foreground'>{title}</span>
            <button
              type='button'
              onClick={onClose}
              className='flex h-9 w-9 items-center justify-center border border-default-300 text-default-500 transition-colors hover:border-foreground hover:text-foreground'
              title='Close'
              aria-label='Close preview'>
              <Icon icon='lucide:x' className='h-4 w-4' />
            </button>
          </DrawerHeader>
          <DrawerBody className='overflow-hidden p-0'>
            {file ? (
              format === 'pdf' ? (
                <PdfPreview file={file} fileName={fileName} loading={<Skeleton className='h-full w-full' />} />
              ) : format === 'png' ? (
                <div className='flex h-full items-start justify-center overflow-auto bg-[repeating-linear-gradient(135deg,#E7E7EA_0_10px,#EDEDF0_10px_20px)] dark:bg-[repeating-linear-gradient(135deg,#0B0B0B_0_10px,#0E0E0E_10px_20px)] p-4'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file} alt={fileName ?? 'Preview'} className='max-w-full bg-[#FFFFFF] shadow-[0_16px_40px_-20px_rgba(20,20,20,.35)] dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,.8)]' />
                </div>
              ) : (
                <ExcelPreview url={file} fileName={fileName} mode={mode ?? 'template'} />
              )
            ) : (
              <div className='flex h-full items-center justify-center text-[14px] text-default-500'>No preview available</div>
            )}
          </DrawerBody>
        </>
      </DrawerContent>
    </Drawer>
  )
}

export default ExcelPreviewDrawer
