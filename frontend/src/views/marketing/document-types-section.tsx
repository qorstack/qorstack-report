'use client'

import Icon from '@/components/icon'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useState } from 'react'

const documentTypes = [
  {
    title: 'Tax Invoice',
    desc: 'Dynamic tables, tax calculations, multi-currency with automatic pagination.',
    icon: 'lucide:receipt',
    image: '/images/example-template-render/01_invoice.png'
  },
  {
    title: 'Quotation',
    desc: 'Sponsor quotations with item lists, terms, and company branding.',
    icon: 'lucide:file-text',
    image: '/images/example-template-render/02_quotation.png'
  },
  {
    title: 'Quotation (DOCX)',
    desc: 'Same template exported as Word document with accurate formatting.',
    icon: 'lucide:file-type',
    image: '/images/example-template-render/02_quotation-docx.png'
  },
  {
    title: 'Sales Report',
    desc: 'Multi-page reports with charts, grouped tables, and summary sections.',
    icon: 'lucide:bar-chart-3',
    image: '/images/example-template-render/03.png'
  },
  {
    title: 'Certificate',
    desc: 'Dynamic certificates with QR codes, signatures, and custom fonts.',
    icon: 'lucide:award',
    image: '/images/example-template-render/04.png'
  },
  {
    title: 'Shipping Label',
    desc: 'Compact labels with barcodes, tracking numbers, and addresses.',
    icon: 'lucide:tag',
    image: '/images/example-template-render/05.png'
  },
  {
    title: 'Receipt',
    desc: 'Point-of-sale receipts with itemized lists, payment details, and QR codes.',
    icon: 'lucide:scroll-text',
    image: '/images/example-template-render/01_invoice.png'
  },
  {
    title: 'Contract',
    desc: 'Legal agreements with dynamic clauses, signature fields, and watermarks.',
    icon: 'lucide:file-check',
    image: '/images/example-template-render/03.png'
  },
  {
    title: 'Payslip',
    desc: 'Employee payslips with earnings breakdown, deductions, and tax details.',
    icon: 'lucide:wallet',
    image: '/images/example-template-render/04.png'
  },
  {
    title: 'Delivery Note',
    desc: 'Shipment documents with item lists, quantities, and receiver signatures.',
    icon: 'lucide:truck',
    image: '/images/example-template-render/05.png'
  }
]

// Number of cards visible per breakpoint in one row
const VISIBLE_COUNT = 5

const DocumentTypesSection = () => {
  const [isExpanded, setIsExpanded] = useState(false)

  const visibleDocs = isExpanded ? documentTypes : documentTypes.slice(0, VISIBLE_COUNT)
  const hiddenCount = documentTypes.length - VISIBLE_COUNT

  return (
    <section className='bg-content1 py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className='mb-14 max-w-2xl'>
          <span className='font-label mb-3 block text-[11px] font-bold uppercase tracking-widest text-primary'>
            Versatile Output
          </span>
          <h2 className='font-headline mb-4 text-[clamp(1.5rem,3vw,2.5rem)] font-bold leading-tight text-foreground'>
            One engine, infinite documents.
          </h2>
          <p className='text-base leading-relaxed text-default-600'>
            From pixel-perfect invoices to complex analytical reports, Qorstack Report handles your most demanding layouts.
          </p>
        </motion.div>

        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5'>
          <AnimatePresence initial={false}>
            {visibleDocs.map((doc, i) => (
              <motion.div
                key={doc.title}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.35, delay: i >= VISIBLE_COUNT ? (i - VISIBLE_COUNT) * 0.05 : 0 }}
                layout
                className='group overflow-hidden rounded-lg bg-background ring-1 ring-default-300/20 dark:bg-content2'>
                <div className='relative aspect-[3/4] overflow-hidden bg-background sm:aspect-[4/5] dark:bg-content1'>
                  <Image
                    src={doc.image}
                    alt={doc.title}
                    fill
                    className='object-contain p-4 transition-transform duration-300 group-hover:scale-105'
                    sizes='(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw'
                  />
                </div>
                <div className='border-t border-default-200 p-3 sm:p-5'>
                  <div className='mb-2 flex items-center gap-2'>
                    <Icon icon={doc.icon} className='h-4 w-4 text-primary' />
                    <h3 className='text-sm font-bold text-foreground'>{doc.title}</h3>
                  </div>
                  <p className='text-xs leading-relaxed text-default-500'>{doc.desc}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Expand / Collapse toggle */}
        {hiddenCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className='mt-6 flex justify-center'>
            <button
              onClick={() => setIsExpanded(prev => !prev)}
              className='group flex items-center gap-2 rounded-full border border-default-200 bg-content2 px-5 py-2.5 text-sm font-medium text-default-600 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary'>
              <Icon
                icon={isExpanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                className='text-base transition-transform group-hover:scale-110'
              />
              {isExpanded ? 'Show less' : `Show all ${documentTypes.length} templates`}
            </button>
          </motion.div>
        )}
      </div>
    </section>
  )
}

export default DocumentTypesSection
