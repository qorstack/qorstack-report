import React from 'react'
import { Modal, ModalContent } from "@heroui/react"
import { Spinner } from "@heroui/react"

type Props = {
  isLoading: boolean
}

const LoadingScreen = (props: Props) => {
  const { isLoading } = props
  return (
    <Modal
      isOpen={isLoading}
      isDismissable={false}
      hideCloseButton={true}
      placement='center'
      className='border-none bg-transparent text-primary shadow-none'>
      <ModalContent>
        <Spinner color='primary' size='lg' />
      </ModalContent>
    </Modal>
  )
}

export default LoadingScreen
