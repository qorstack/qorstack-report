'use client'

import React from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, cn } from '@heroui/react'
import Icon from '@/components/icon'
import { useFileUpload } from '@/hooks/use-file-upload'

type TemplateType = 'pdf' | 'excel'

type Props = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  templateType: TemplateType
  isSaving: boolean
  onSubmit: (file: File) => void | Promise<void>
}

const CONFIG: Record<
  TemplateType,
  {
    accept: string[]
    acceptAttr: string
    hint: string
    invalidMessage: string
    fileIcon: string
    fileIconBg: string
  }
> = {
  pdf: {
    accept: ['.docx'],
    acceptAttr: '.docx',
    hint: 'Word .docx files only',
    invalidMessage: 'Please upload a .docx file only',
    fileIcon: 'lucide:file-check',
    fileIconBg: 'border-default-300 text-default-500'
  },
  excel: {
    accept: ['.xlsx', '.xls'],
    acceptAttr: '.xlsx,.xls',
    hint: 'Excel .xlsx files only',
    invalidMessage: 'Please upload an .xlsx or .xls file',
    fileIcon: 'lucide:file-spreadsheet',
    fileIconBg: 'border-default-300 text-default-500'
  }
}

/**
 * Shared "Replace file" modal — replaces the source .docx/.xlsx file
 * of an existing template. Auto-detects variables from the new file on save.
 */
export const UpdateFileModal: React.FC<Props> = ({ isOpen, onOpenChange, templateType, isSaving, onSubmit }) => {
  const cfg = CONFIG[templateType]
  const {
    uploadedFile,
    isDragOver,
    inputRef,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearFile,
    openPicker
  } = useFileUpload({ accept: cfg.accept, invalidMessage: cfg.invalidMessage })

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size='2xl' radius='none'>
      <ModalContent className='border border-divider bg-content1'>
        {onClose => (
          <>
            <ModalHeader className='flex flex-col gap-1'>
              <span className='text-[12px] font-normal text-default-500'>
                Template
              </span>
              <span className='text-[16px] font-semibold'>Replace file</span>
            </ModalHeader>
            <ModalBody>
              <div
                className={cn(
                  'relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center border border-dashed p-6 transition-colors duration-150',
                  isDragOver
                    ? 'border-foreground bg-content2'
                    : uploadedFile
                      ? 'border-default-500 bg-content2'
                      : 'border-default-300 bg-content2 hover:border-default-500',
                  isSaving && 'pointer-events-none opacity-50'
                )}
                onDrop={!isSaving ? handleDrop : undefined}
                onDragOver={!isSaving ? handleDragOver : undefined}
                onDragLeave={!isSaving ? handleDragLeave : undefined}
                onClick={() => !isSaving && openPicker()}
                role='button'
                tabIndex={0}
                aria-label='Choose a file to upload'
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isSaving) {
                    e.preventDefault()
                    openPicker()
                  }
                }}>
                <input
                  ref={inputRef}
                  type='file'
                  className='hidden'
                  accept={cfg.acceptAttr}
                  onChange={handleFileChange}
                />

                {uploadedFile ? (
                  <div className='flex flex-col items-center text-center'>
                    <div
                      className={cn(
                        'mb-3 flex h-12 w-12 shrink-0 items-center justify-center border',
                        cfg.fileIconBg
                      )}>
                      <Icon icon={cfg.fileIcon} className='h-6 w-6' />
                    </div>
                    <p className='text-[15px] font-bold text-foreground'>{uploadedFile.name}</p>
                    <p className='font-mono text-[12px] text-default-500'>{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                    <button
                      type='button'
                      onClick={e => {
                        e.stopPropagation()
                        clearFile()
                      }}
                      disabled={isSaving}
                      className='mt-3 flex items-center gap-1.5 text-[13px] text-default-500 hover:text-danger disabled:pointer-events-none disabled:opacity-50'>
                      <Icon icon='lucide:x' className='h-3.5 w-3.5' />
                      Remove file
                    </button>
                  </div>
                ) : (
                  <>
                    <Icon icon='lucide:upload' className='mb-3 h-7 w-7 text-default-500' />
                    <div className='text-center'>
                      <p className='text-[15px] font-bold text-foreground'>Drop a file here or click to choose</p>
                      <p className='mt-1 text-[13px] text-default-500'>{cfg.hint}</p>
                    </div>
                  </>
                )}
              </div>
              <div className='px-1 py-1'>
                <div className='flex items-center gap-2'>
                  <Icon icon='lucide:scan-search' className='h-5 w-5 shrink-0 text-default-500' />
                  <div>
                    <p className='text-[14px] font-medium text-foreground'>Fields are found for you</p>
                    <p className='text-[13px] text-default-500'>
                      Every <code className='bg-content2 px-1 font-mono text-foreground'>{`{{name}}`}</code> in the new file is added to the
                      field list automatically.
                    </p>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant='bordered'
                radius='none'
                className='border-1 border-default-300 font-medium'
                onPress={onClose}
                isDisabled={isSaving}>
                Cancel
              </Button>
              <Button
                color='primary'
                radius='none'
                className='font-semibold'
                isDisabled={!uploadedFile}
                isLoading={isSaving}
                onPress={() => uploadedFile && onSubmit(uploadedFile)}>
                Replace file
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
