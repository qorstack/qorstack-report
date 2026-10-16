import type { JSX } from 'react'
import { Modal, ModalContent, Spinner } from '@heroui/react'

type Props = {
  isLoading: boolean
}

const LoadingScreen = ({ isLoading }: Props): JSX.Element => (
  <Modal
    isOpen={isLoading}
    isDismissable={false}
    hideCloseButton
    placement='center'
    size='xs'
    classNames={{ backdrop: 'bg-background/70', base: 'border-none bg-transparent shadow-none' }}>
    <ModalContent>
      <div role='status' aria-live='polite' className='flex flex-col items-center gap-3 py-6'>
        <Spinner color='default' size='lg' />
        <span className='text-[14px] text-default-500'>Loading…</span>
      </div>
    </ModalContent>
  </Modal>
)

export default LoadingScreen
