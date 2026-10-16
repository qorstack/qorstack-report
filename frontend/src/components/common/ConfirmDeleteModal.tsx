'use client'

import React, { useEffect, useState } from 'react'
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** Confirm action — return a promise to show loading state until it resolves. */
  onConfirm: () => Promise<void> | void
  title?: string
  /** Display name of the resource being deleted (shown in bold in the message). */
  resourceName: string
  /** Override the body message. Default: "Do you want to delete X?" */
  message?: React.ReactNode
  /**
   * When provided, the user must type this string to enable the delete button.
   * Defaults to `resourceName` for high-risk deletes. Pass `false` to skip the typed confirmation.
   */
  confirmText?: string | false
  confirmLabel?: string
  cancelLabel?: string
  /** Warning text shown in red box. Set to null to hide. */
  warning?: React.ReactNode | null
}

const DEFAULT_WARNING = 'This action cannot be undone. All associated data will be permanently deleted.'

/**
 * Shared confirm-delete modal — supports type-to-confirm gating for high-risk deletes,
 * or plain confirm for lower-risk actions. Used across templates, fonts, projects, etc.
 */
export const ConfirmDeleteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete',
  resourceName,
  message,
  confirmText,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  warning = DEFAULT_WARNING
}) => {
  const requiredText = confirmText === undefined ? resourceName : confirmText
  const requiresTyping = requiredText !== false

  const [typed, setTyped] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTyped('')
      setIsLoading(false)
    }
  }, [isOpen])

  const canConfirm = !requiresTyping || typed === requiredText

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={open => !open && !isLoading && onClose()}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader className='flex flex-col gap-1'>{title}</ModalHeader>
            <ModalBody>
              <p className='text-[14px] text-default-500'>
                {message ?? (
                  <>
                    Do you want to delete <span className='font-bold text-foreground'>&quot;{resourceName}&quot;</span>?
                  </>
                )}
              </p>
              {warning && (
                <p className='text-[14px] text-danger'>{warning}</p>
              )}
              {requiresTyping && (
                <div className='mt-2'>
                  <label className='mb-1 block text-[13px] font-medium text-default-500'>
                    Enter <span className='font-bold'>{requiredText}</span> to confirm
                  </label>
                  <Input
                    value={typed}
                    onValueChange={setTyped}
                    placeholder='Type it here'
                    variant='bordered'
                    color={typed && !canConfirm ? 'danger' : 'default'}
                  />
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant='light' onPress={onClose} isDisabled={isLoading}>
                {cancelLabel}
              </Button>
              <Button
                variant={canConfirm ? 'bordered' : 'flat'}
                color={canConfirm ? 'danger' : 'default'}
                onPress={handleConfirm}
                isLoading={isLoading}
                isDisabled={!canConfirm}>
                {confirmLabel}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
