'use client'

import React from 'react'
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react'
import Icon from '@/components/icon'
import { fieldClasses } from '@/components/template-editor/field-styles'

type Props = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  name: string
  templateKey: string
  onNameChange: (v: string) => void
  onKeyChange: (v: string) => void
  onGenerateKey: () => void
  onSave: () => void
  isGeneratingKey: boolean
  isSaving: boolean
}

/**
 * Rename dialog — edit the template name and key.
 * Opened from the "More" menu in the template header (kept under its old name for compatibility).
 */
export const EditTemplateDetailsPopover: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  name,
  templateKey,
  onNameChange,
  onKeyChange,
  onGenerateKey,
  onSave,
  isGeneratingKey,
  isSaving
}) => (
  <Modal isOpen={isOpen} onOpenChange={onOpenChange} size='md' radius='none'>
    <ModalContent className='border border-divider bg-content1'>
      {onClose => (
        <form
          onSubmit={e => {
            e.preventDefault()
            onSave()
          }}>
          <ModalHeader className='flex flex-col gap-1'>
            <span className='text-[12px] font-normal text-default-500'>
              Template
            </span>
            <span className='text-[16px] font-semibold'>Rename</span>
          </ModalHeader>
          <ModalBody className='gap-6'>
            <Input
              label='Name'
              labelPlacement='outside'
              variant='bordered'
              classNames={fieldClasses}
              value={name}
              onValueChange={onNameChange}
              autoFocus
            />
            <Input
              label='Template key'
              labelPlacement='outside'
              variant='bordered'
              placeholder='Optional'
              description='Used as "templateKey" in API calls. Changing it breaks code that uses the old key.'
              classNames={{ ...fieldClasses, input: `${fieldClasses.input} font-mono` }}
              value={templateKey}
              onValueChange={onKeyChange}
              endContent={
                <Button
                  isIconOnly
                  size='sm'
                  radius='none'
                  variant='light'
                  className='text-default-500 hover:text-foreground'
                  onPress={onGenerateKey}
                  isLoading={isGeneratingKey}
                  title='Generate a new key'
                  aria-label='Generate a new key'>
                  {!isGeneratingKey && <Icon icon='lucide:refresh-cw' className='h-4 w-4' />}
                </Button>
              }
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant='bordered'
              radius='none'
              className='border-1 border-default-300 font-medium'
              onPress={onClose}>
              Cancel
            </Button>
            <Button
              type='submit'
              color='primary'
              radius='none'
              className='font-semibold'
              isLoading={isSaving}>
              Save
            </Button>
          </ModalFooter>
        </form>
      )}
    </ModalContent>
  </Modal>
)
