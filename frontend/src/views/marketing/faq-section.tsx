'use client'

import { motion } from 'framer-motion'

const faqItems = [
  {
    q: 'Is QorstackReport open source?',
    a: 'Yes, the core rendering engine is MIT licensed. We offer enterprise features and hosted cloud solutions for teams that need extra power.'
  },
  {
    q: 'Can I use my own fonts?',
    a: 'Absolutely. While Google Fonts are native, you can upload WOFF/WOFF2 files directly to your account or self-hosted instance.'
  },
  {
    q: 'What output formats are supported?',
    a: 'Currently we support PDF, PNG, and HTML canvas. PDFA and CSV export options are coming in the next quarter.'
  },
  {
    q: 'How do I integrate it?',
    a: 'We provide SDKs for Node.js, Python, and Go, as well as a REST API that works with any language.'
  }
]

const FAQSection = () => (
  <section className='bg-content1 py-20'>
    <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className='mb-12'>
        <h2 className='font-headline text-2xl font-bold text-foreground md:text-3xl'>Common Questions</h2>
      </motion.div>

      <div className='grid gap-x-16 gap-y-10 md:grid-cols-2'>
        {faqItems.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}>
            <h3 className='mb-2 text-sm font-bold text-foreground'>{item.q}</h3>
            <p className='text-sm leading-relaxed text-default-600'>{item.a}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
)

export default FAQSection
