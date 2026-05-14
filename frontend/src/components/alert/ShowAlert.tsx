import React, { useState, useEffect, Fragment } from 'react'
import { Button, Modal, ModalBody, ModalContent, useDisclosure, cn } from "@heroui/react"
import { Icon } from '@iconify/react/dist/iconify.js'
import { createRoot } from 'react-dom/client'

export type ShowAlertProps = {
  icon?: 'info' | 'error' | 'warning' | 'success' | React.ReactNode
  noIcon?: boolean
  color?: 'primary' | 'default' | 'secondary' | 'success' | 'warning' | 'danger'
  content: string | React.ReactNode
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
  noButton?: boolean
  isDismissable?: boolean
  hideCloseButton?: boolean
}
export type ButtonCancle = {
  onCancle?: () => void
  labelCancle?: string
}
export type ButtonSubmit = {
  onSubmit?: () => void
  labelSubmit?: string
}

const Alert = (props: ShowAlertProps & ButtonCancle & ButtonSubmit) => {
  const {
    icon,
    noIcon = false,
    color = 'default',
    content,
    size,
    noButton,
    onCancle,
    labelCancle,
    onSubmit,
    labelSubmit,
    isDismissable = true,
    hideCloseButton = false
  } = props

  const { isOpen, onOpen, onClose } = useDisclosure()

  useEffect(() => {
    function openModal() {
      onOpen()
    }
    openModal()
  }, [onOpen])

  const handleCancle = async () => {
    onCancle && (await onCancle())
    onClose()
  }

  const handleSubmit = async () => {
    onSubmit && (await onSubmit())
    onClose()
  }

  return (
    <Modal
      size={size || 'sm'}
      isOpen={isOpen}
      onClose={onClose}
      isDismissable={isDismissable}
      hideCloseButton={hideCloseButton}
      placement={'center'}>
      <ModalContent>
        <ModalBody>
          <div className='m-5 flex flex-col items-center gap-3'>
            {!noIcon && (
              <div className={cn(`text-6xl text-${color}`)}>{icon || <Icon icon='icon-park-twotone:info' />}</div>
            )}
            {content}
            {!noButton && (
              <div className='flex gap-2'>
                {labelCancle && (
                  <Button color={color} variant='bordered' onClick={handleCancle}>
                    {labelCancle}
                  </Button>
                )}
                {labelSubmit && (
                  <Button color={color} onClick={handleSubmit}>
                    {labelSubmit}
                  </Button>
                )}
              </div>
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

const ShowAlert = ({
  icon,
  noIcon,
  color,
  content,
  size,
  noButton,
  onCancle,
  labelCancle,
  onSubmit,
  labelSubmit,
  isDismissable,
  hideCloseButton
}: ShowAlertProps & ButtonCancle & ButtonSubmit) => {
  const div = document.createElement('div')
  document.body.append(document.createElement('div'))
  const root = createRoot(div)
  root.render(
    <Alert
      icon={icon}
      noIcon={noIcon}
      color={color}
      content={content}
      size={size}
      noButton={noButton}
      onCancle={onCancle}
      labelCancle={labelCancle}
      onSubmit={onSubmit}
      labelSubmit={labelSubmit}
      isDismissable={isDismissable}
      hideCloseButton={hideCloseButton}
    />
  )
}

export default ShowAlert
