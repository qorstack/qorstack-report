import React from 'react'
import dynamic from 'next/dynamic'
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, Skeleton } from '@heroui/react'
import Icon from '@/components/icon'

const PdfPreview = dynamic(() => import('@/components/pdf/PdfPreview'), {
  ssr: false,
  loading: () => <Skeleton className='h-full w-full' />
})

interface PdfPreviewDrawerProps {
  isOpen: boolean
  onClose: () => void
  file: string
  fileName?: string
}

const PdfPreviewDrawer: React.FC<PdfPreviewDrawerProps> = ({ isOpen, onClose, file, fileName }) => {
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
            <span>PDF Preview</span>
            <button
              onClick={onClose}
              className='flex items-center justify-center rounded p-1 text-default-500 transition-colors hover:bg-default-100 hover:text-foreground'
              title='Close'>
              <Icon icon='lucide:x' className='h-5 w-5' />
            </button>
          </DrawerHeader>
          <DrawerBody className='overflow-hidden p-0'>
            {file ? (
              <PdfPreview key={file} file={file} fileName={fileName} loading={<Skeleton className='h-full w-full' />} />
            ) : (
              <div className='flex h-full items-center justify-center text-default-400'>No preview available</div>
            )}
          </DrawerBody>
        </>
      </DrawerContent>
    </Drawer>
  )
}

export default PdfPreviewDrawer
