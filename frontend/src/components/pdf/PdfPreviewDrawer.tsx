import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, Skeleton, cn } from '@heroui/react'
import Icon from '@/components/icon'
import { api } from '@/api/generated/main-service'

const PdfPreview = dynamic(() => import('@/components/pdf/PdfPreview'), {
  ssr: false,
  loading: () => <Skeleton className='h-full w-full' />
})

export interface PdfPreviewDrawerView {
  id: string
  label: string
  file: string
  fileName?: string
}

interface PdfPreviewDrawerProps {
  isOpen: boolean
  onClose: () => void
  file: string
  fileName?: string
  /** When set, drawer header label adapts and the download button fetches the original source file. */
  templateKey?: string
  templateType?: 'pdf' | 'excel'
  templateName?: string
  /** Several files to switch between (e.g. last result / template file). Overrides `file` / `fileName`. */
  views?: PdfPreviewDrawerView[]
}

const PdfPreviewDrawer: React.FC<PdfPreviewDrawerProps> = ({
  isOpen,
  onClose,
  file,
  fileName,
  templateKey,
  templateType,
  templateName,
  views
}) => {
  const [viewId, setViewId] = useState<string | null>(null)
  const activeView = views?.find(v => v.id === viewId) ?? views?.[0]
  const shownFile = activeView ? activeView.file : file
  const shownFileName = activeView ? activeView.fileName : fileName

  const title =
    templateType === 'excel' ? 'Excel Preview' : templateType === 'pdf' ? 'PDF Preview' : 'Preview'

  const downloadOriginal = templateKey
    ? async () => {
        try {
          const res = await api.templates.downloadTemplate(templateKey)
          if (!res?.url) return
          const response = await fetch(res.url)
          const blob = await response.blob()
          const objectUrl = globalThis.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = objectUrl
          const ext = templateType === 'excel' ? '.xlsx' : '.pdf'
          link.download = `${templateName || 'template'}${ext}`
          document.body.appendChild(link)
          link.click()
          link.remove()
          globalThis.URL.revokeObjectURL(objectUrl)
        } catch (error) {
          console.error('Failed to download template:', error)
        }
      }
    : undefined

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
            {views && views.length > 1 ? (
              <div role='tablist' aria-label='Preview view' className='flex'>
                {views.map(v => (
                  <button
                    key={v.id}
                    type='button'
                    role='tab'
                    aria-selected={v.id === activeView?.id}
                    onClick={() => setViewId(v.id)}
                    className={cn(
                      'h-9 border-b-2 px-3 text-[13px] font-medium transition-colors',
                      v.id === activeView?.id
                        ? 'border-foreground text-foreground'
                        : 'border-transparent text-default-500 hover:text-foreground'
                    )}>
                    {v.label}
                  </button>
                ))}
              </div>
            ) : (
              <span className='text-[14px] font-medium text-foreground'>{activeView?.label ?? title}</span>
            )}
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
            {shownFile ? (
              <PdfPreview
                key={shownFile}
                file={shownFile}
                fileName={shownFileName}
                onDownloadOriginal={downloadOriginal}
                loading={<Skeleton className='h-full w-full' />}
              />
            ) : (
              <div className='flex h-full items-center justify-center text-[14px] text-default-500'>No preview available</div>
            )}
          </DrawerBody>
        </>
      </DrawerContent>
    </Drawer>
  )
}

export default PdfPreviewDrawer
