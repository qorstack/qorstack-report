'use client'

import Icon from '@/components/icon'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useState } from 'react'

const PromptPaySection = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className='flex w-full items-center gap-2 rounded-xl border border-default-200 bg-content2 px-4 py-2.5 text-sm font-semibold text-default-600 transition-colors hover:bg-content3'>
        <Image
          src='/images/prompt-pay-logo.png'
          alt='PromptPay'
          width={16}
          height={16}
          className='h-4 w-4 object-contain'
        />
        PromptPay
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'
            onClick={() => setIsOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              className='relative w-full max-w-sm overflow-hidden rounded-2xl border border-default-200 bg-content1 shadow-2xl'>
              {/* Header */}
              <div className='flex items-center justify-between border-b border-default-200 px-6 py-4'>
                <div className='flex items-center gap-2.5'>
                  <Image
                    src='/images/prompt-pay-logo.png'
                    alt='PromptPay'
                    width={24}
                    height={24}
                    className='h-6 w-6 object-contain'
                  />
                  <span className='text-sm font-bold text-foreground'>Support Qorstack Report</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className='flex h-7 w-7 items-center justify-center rounded-lg text-default-400 transition-colors hover:bg-content3 hover:text-default-600'>
                  <Icon icon='lucide:x' className='h-4 w-4' />
                </button>
              </div>

              {/* Content */}
              <div className='px-6 py-6 text-center'>
                {/* QR Placeholder */}
                <div className='mx-auto mb-5 flex h-48 w-48 items-center justify-center rounded-xl border-2 border-dashed border-default-200 bg-content2'>
                  <div className='text-center'>
                    <Icon icon='lucide:qr-code' className='mx-auto mb-2 h-10 w-10 text-default-300' />
                    <p className='text-[10px] font-medium text-default-400'>QR Code</p>
                    <p className='text-[9px] text-default-300'>Coming soon</p>
                  </div>
                </div>

                <div className='space-y-1.5 text-[12px] text-default-400'>
                  <p>After payment, please send your receipt to:</p>
                  <a
                    href='mailto:qorstack@gmail.com?subject=Qorstack%20Report%20PromptPay%20Support'
                    className='font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/80'>
                    qorstack@gmail.com
                  </a>
                  <p className='pt-1 text-[11px] text-default-300'>
                    Include your name for Wall of Fame placement.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default PromptPaySection
