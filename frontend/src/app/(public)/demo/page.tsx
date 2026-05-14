'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'
import { CodeBlock } from '@/components/docs/CodeBlock'
import VideoDemoSection from '@/views/marketing/video-demo-section'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] as const }
}

const apiSampleCode = `POST /render/word/template
{
  "templateKey": "invoice.docx",
  "replace": {
    "customer_name": "John Doe",
    "invoice_date": "2026-04-07",
    "total": "$1,070.00"
  }
}

// Response: PDF stream or presigned URL`

export default function DemoPage() {
  return (
    <div className='min-h-screen bg-background'>
      {/* Hero */}
      <section className='border-b border-default-200 bg-content1 py-20'>
        <div className='mx-auto max-w-4xl px-6 text-center'>
          <motion.div {...fadeUp} className='mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary ring-1 ring-inset ring-primary/20'>
            <Icon icon='lucide:play-circle' className='h-3 w-3' />
            Live Demo
          </motion.div>

          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.05 }}
            className='mb-4 font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl'>
            See Qorstack in Action
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className='mx-auto max-w-xl text-lg text-default-600'>
            Watch the full workflow — from uploading a Word template to receiving a pixel-perfect PDF via REST API.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.15 }}
            className='mt-8 flex flex-wrap justify-center gap-3'>
            <a
              href='/docs'
              className='flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90'>
              <Icon icon='lucide:book-open' className='h-4 w-4' />
              Read Docs
            </a>
            <a
              href='https://github.com/qorstack/qorstack-report'
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-2 rounded-md bg-content2 px-6 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-content3'>
              <Icon icon='lucide:github' className='h-4 w-4 text-default-600' />
              GitHub
            </a>
          </motion.div>
        </div>
      </section>

      {/* Video demo (4-step) */}
      <VideoDemoSection />

      {/* API Preview */}
      <section className='border-t border-default-200 py-16'>
        <div className='mx-auto max-w-4xl px-6'>
          <motion.div {...fadeUp} className='mb-8'>
            <h2 className='mb-2 text-2xl font-bold text-foreground'>Simple REST API</h2>
            <p className='text-default-600'>
              Send your data as JSON, get a PDF back. No SDK required — works with any HTTP client.
            </p>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
            <CodeBlock code={apiSampleCode} language='json' />
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className='border-t border-default-200 bg-content1 py-16'>
        <div className='mx-auto max-w-4xl px-6 text-center'>
          <motion.div {...fadeUp}>
            <div className='mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10'>
              <Icon icon='lucide:layout-dashboard' className='h-6 w-6 text-primary' />
            </div>
            <h2 className='mb-3 text-2xl font-bold text-foreground'>Ready to start?</h2>
            <p className='mb-8 text-default-600'>
              Go to your dashboard and create your first template.
            </p>
            <div className='flex flex-wrap justify-center gap-3'>
              <a
                href='/project'
                className='flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90'>
                <Icon icon='lucide:arrow-right' className='h-4 w-4' />
                Go to Dashboard
              </a>
              <a
                href='/docs'
                className='flex items-center gap-2 rounded-md bg-content2 px-6 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-content3'>
                <Icon icon='lucide:book-open' className='h-4 w-4 text-default-600' />
                Documentation
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
