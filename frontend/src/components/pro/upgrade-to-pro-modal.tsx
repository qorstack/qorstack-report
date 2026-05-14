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

const DEFAULT_FEATURES = [
  'Instant preview with every edit',
  'Unlimited cloud renders',
  'Priority rendering queue'
]

export const UpgradeToProModal = ({
  isOpen,
  onOpenChange,
  eyebrow = 'Real-time rendering',
  title = 'Upgrade to Pro',
  description = "Live Preview renders your document in real time as you edit — every keystroke, every variable change. It's a Pro feature because it runs a full cloud render on every change.",
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
        backdrop: 'z-[200] bg-black/70 backdrop-blur-sm',
        wrapper: 'z-[201]',
        base: 'bg-content1 ring-hairline',
        header: 'pb-2',
        body: 'pt-0',
        footer: 'pt-2'
      }}>
      <ModalContent>
        {onClose => (
          <>
            <ModalHeader className='flex flex-col gap-2'>
              <div className='flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/25'>
                <Icon icon='lucide:zap' className='h-5 w-5 text-primary' />
              </div>
              <div>
                <h3 className='text-[18px] font-black tracking-tight text-foreground'>{title}</h3>
                <p className='mt-0.5 text-[11.5px] font-semibold uppercase tracking-widest text-default-500'>
                  {eyebrow}
                </p>
              </div>
            </ModalHeader>
            <ModalBody>
              <p className='text-[13.5px] leading-relaxed text-default-600'>{description}</p>
              <ul className='mt-3 flex flex-col gap-2 text-[12.5px] text-default-700'>
                {features.map(feature => (
                  <li key={feature} className='flex items-start gap-2'>
                    <Icon icon='lucide:check-circle-2' className='mt-0.5 h-4 w-4 shrink-0 text-primary' />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </ModalBody>
            <ModalFooter>
              <Button variant='light' size='sm' onPress={onClose} className='font-semibold'>
                Maybe Later
              </Button>
              <Button
                size='sm'
                onPress={() => {
                  onClose()
                  router.push(primaryCtaHref)
                }}
                className='bg-primary font-bold text-primary-foreground hover:bg-primary/90'
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
