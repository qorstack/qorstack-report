'use client'

import Icon from '@/components/icon'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useState } from 'react'

const PromptPaySection = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className='mb-16 flex items-center justify-center'>
        <button
          onClick={() => setIsOpen(true)}
          className='inline-flex items-center gap-2.5 rounded-lg border border-default-300 bg-content2 px-4 py-2.5 text-[13px] text-default-500 transition-all hover:border-default-400 hover:bg-content3 hover:shadow-sm'>
          <Image
            src='/images/prompt-pay-logo.png'
            alt='PromptPay'
            width={20}
            height={20}
            className='h-5 w-5 object-contain'
          />
          <span>In Thailand? Pay direct via PromptPay</span>
          <Icon icon='lucide:chevron-right' className='h-3.5 w-3.5 text-default-400' />
        </button>
      </div>

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
                <p className='mb-5 text-sm text-default-500'>
                  Scan to support via PromptPay. 100% goes directly to development — no platform fees.
                </p>

                {/* Thai price reference */}
                <div className='mx-auto mb-5 max-w-xs overflow-hidden rounded-lg border border-default-200'>
                  <div className='grid grid-cols-3 border-b border-default-200 bg-content2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-default-400'>
                    <span>Tier</span>
                    <span className='text-center'>USD</span>
                    <span className='text-right'>THB</span>
                  </div>
                  {[
                    { tier: 'Coffee', usd: '$5', thb: '175 ฿' },
                    { tier: 'Early Adopter', usd: '$15', thb: '525 ฿' },
                    { tier: 'Sponsor', usd: '$100', thb: '3,500 ฿' },
                    { tier: 'Enterprise', usd: '$300', thb: '10,500 ฿' }
                  ].map((p, i) => (
                    <div
                      key={p.tier}
                      className={`grid grid-cols-3 px-3 py-2 text-[12px] ${i < 3 ? 'border-b border-default-100' : ''}`}>
                      <span className='text-default-600'>{p.tier}</span>
                      <span className='text-center text-default-400'>{p.usd}</span>
                      <span className='text-right font-semibold text-foreground'>{p.thb}</span>
                    </div>
                  ))}
                </div>

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
                    href='mailto:mastersatang@gmail.com?subject=Qorstack%20Report%20PromptPay%20Support'
                    className='font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/80'>
                    mastersatang@gmail.com
                  </a>
                  <p className='pt-1 text-[11px] text-default-300'>
                    Include your name and tier for Wall of Fame placement.
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
