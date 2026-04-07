import React, { useState, useEffect } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  addToast
} from '@heroui/react'
import { api } from '@/api/generated/main-service'

interface DeleteTemplateModalProps {
  isOpen: boolean
  onClose?: () => void
  onSuccess?: () => void
  templateName: string
  templateKey: string
}

export const DeleteTemplateModal: React.FC<DeleteTemplateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  templateName,
  templateKey
}) => {
  const [confirmName, setConfirmName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setConfirmName('')
    }
  }, [isOpen])

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await api.templates.templatesDelete(templateKey)
      addToast({ title: 'Success', description: 'Template deleted successfully', color: 'success' })
      onSuccess?.()
      if (onClose) {
        onClose()
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Failed to delete template', error)
      addToast({ title: 'Error', description: 'Failed to delete template', color: 'danger' })
      setIsLoading(false)
    }
  }

  const isConfirmEnabled = confirmName === templateName

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose && onClose()}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader className='flex flex-col gap-1'>Delete Template</ModalHeader>
            <ModalBody>
              <p className='text-sm text-default-500'>
                Do you want to delete the template <span className='font-bold text-foreground'>&quot;{templateName}&quot;</span>?
              </p>
              <p className='text-sm text-danger-500 bg-danger-50 p-2 rounded-sm font-medium'>
                This action cannot be undone. All associated data will be permanently deleted.
              </p>
              <div className='mt-2'>
                <label className='mb-1 block text-xs font-medium text-default-700'>
                  Enter <span className='font-bold'>{templateName}</span> to confirm
                </label>
                <Input
                  value={confirmName}
                  onValueChange={setConfirmName}
                  placeholder={templateName}
                  variant='bordered'
                  color={confirmName && !isConfirmEnabled ? 'danger' : 'default'}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color='default' variant='light' onPress={onClose} isDisabled={isLoading || !onClose}>
                Cancel
              </Button>
              <Button
              variant={isConfirmEnabled ?'solid':'flat'}
                color={isConfirmEnabled ?'danger':'default'}
                onPress={handleDelete}
                isLoading={isLoading}
                isDisabled={!isConfirmEnabled}>
                Delete
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
