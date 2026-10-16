'use client'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/icon'

type UpgradeToProModalProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  eyebrow?: string
  title?: string
  description?: string
  features?: string[]
  primaryCtaLabel?: string
  primaryCtaHref?: string
}

const DEFAULT_FEATURES = ['PDF password protection & watermarks', 'Async renders, ZIP output', 'Project export & import']

export const UpgradeToProModal = ({
  isOpen,
  onOpenChange,
  eyebrow = 'Pro feature',
  title = 'Upgrade to Pro',
  description = 'This feature needs a Pro license.',
  features = DEFAULT_FEATURES,
  primaryCtaLabel = 'See Pro Plans',
  primaryCtaHref = '/settings/billing'
}: UpgradeToProModalProps) => {
  const router = useRouter()

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size='md'
      backdrop='blur'
      classNames={{
        backdrop: 'z-[200] bg-black/70',
        wrapper: 'z-[201]',
        base: 'border border-divider bg-content1',
        header: 'pb-2',
        body: 'pt-0',
        footer: 'pt-2'
      }}>
      <ModalContent>
        {onClose => (
          <>
            <ModalHeader className='flex flex-col gap-2'>
              <div className='flex h-11 w-11 items-center justify-center border border-default-300'>
                <Icon icon='lucide:zap' className='h-5 w-5 text-default-500' />
              </div>
              <div>
                <p className='text-[13px] font-normal text-default-500'>{eyebrow}</p>
                <h3 className='mt-1 text-[20px] font-semibold text-foreground'>{title}</h3>
              </div>
            </ModalHeader>
            <ModalBody>
              <p className='text-[14px] leading-relaxed text-default-500'>{description}</p>
              <ul className='mt-3 flex flex-col gap-2 text-[14px] text-foreground'>
                {features.map(feature => (
                  <li key={feature} className='flex items-start gap-2'>
                    <Icon icon='lucide:check-circle-2' className='mt-0.5 h-4 w-4 shrink-0 text-success' />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </ModalBody>
            <ModalFooter>
              <Button variant='light' onPress={onClose} className='h-10 font-medium'>
                Maybe later
              </Button>
              <Button
                color='primary'
                onPress={() => {
                  onClose()
                  router.push(primaryCtaHref)
                }}
                className='h-10 font-medium'
                startContent={<Icon icon='lucide:arrow-up-right' className='h-3.5 w-3.5' strokeWidth={3} />}>
                {primaryCtaLabel}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
