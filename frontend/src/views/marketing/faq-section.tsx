'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'
import { useState } from 'react'

const FAQ_ITEMS = [
  {
    q: 'Is Qorstack Report open source?',
    a: 'Yes. The core engine is MIT licensed — you can self-host, modify, and use it commercially for free. Pro features (versioning, PDF security, team members) require a one-time license.'
  },
  {
    q: 'How does the Pro license work?',
    a: 'It\'s a one-time payment, per instance, with a lifetime license. No subscriptions. Price increases as early-bird seats fill — your rate is locked in at purchase.'
  },
  {
    q: 'What template format does it use?',
    a: 'Word (.docx) templates. Design your layout in Microsoft Word or Google Docs, add template variables, and the engine fills them at runtime with your data.'
  },
  {
    q: 'What output formats are supported?',
    a: 'Currently PDF and Excel. The engine uses Gotenberg under the hood for high-fidelity PDF rendering with full font and layout support.'
  },
  {
    q: 'Can I use custom fonts?',
    a: 'Yes. Google Fonts are built-in and resolve automatically. You can also upload WOFF/WOFF2 files directly to your self-hosted instance.'
  },
  {
    q: 'How do I integrate it into my app?',
    a: 'Via REST API or the typed SDK. Submit a template + JSON payload, get back a document. Works with any language or framework.'
  },
]

const FAQItem = ({ q, a, delay }: { q: string; a: string; delay: number }) => {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className='border-b border-default-200 last:border-b-0'>
      <button
        onClick={() => setOpen(v => !v)}
        className='flex w-full items-start justify-between gap-4 py-5 text-left'>
        <span className='text-sm font-semibold text-foreground'>{q}</span>
        <Icon
          icon='lucide:chevron-down'
          className={`mt-0.5 h-4 w-4 shrink-0 text-default-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className='pb-5 text-sm leading-relaxed text-default-600'>{a}</p>
      )}
    </motion.div>
  )
}

const FAQSection = () => (
  <section className='bg-content1 py-24'>
    <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
      <div className='grid gap-16 lg:grid-cols-[280px_1fr]'>

        {/* Left label */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}>
          <p className='font-label mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary'>FAQ</p>
          <h2 className='mb-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl'>
            Common Questions
          </h2>
          <p className='text-sm leading-relaxed text-default-500'>
            Can&apos;t find an answer?{' '}
            <a href='mailto:qorstack@gmail.com' className='text-primary underline underline-offset-2'>
              Email us
            </a>
          </p>
        </motion.div>

        {/* Right accordion */}
        <div className='divide-y-0'>
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} delay={i * 0.05} />
          ))}
        </div>
      </div>
    </div>
  </section>
)

export default FAQSection
