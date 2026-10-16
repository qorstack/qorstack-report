'use client'

import Link from 'next/link'
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
  "templateKey": "invoice-template",
  "fileName": "invoice-2026-001",
  "fileType": "pdf",
  "replace": [
    { "key": "customer_name", "value": "Acme Co., Ltd." },
    { "key": "invoice_no", "value": "INV-2026-001" }
  ],
  "table": [
    {
      "columns": ["item", "qty", "total"],
      "rows": [
        ["Design", 2, 2400],
        ["Implementation", 1, 5200]
      ],
      "repeatHeader": true
    }
  ],
  "qrcode": [
    { "key": "payment", "text": "https://pay.example/inv-2026-001", "size": 160 }
  ],
  // Pro options ↓
  "pdfPassword": {
    "userPassword": "viewer-pass",
    "restrictPrinting": true
  },
  "watermark": {
    "text": "CONFIDENTIAL",
    "opacity": 0.14,
    "rotation": -45
  },
  "zipOutput": false
}

// Response:
// {
//   "downloadUrl": "https://report.your-domain.com/api/files/eyJ…",
//   "expiresIn": 3600,
//   "status": "success"
// }`

const steps = [
  { no: '01', title: 'Upload', desc: 'Drop in a Word or Excel template with {{placeholders}}.' },
  { no: '02', title: 'Map fields', desc: 'Qorstack detects variables, tables, images and codes.' },
  { no: '03', title: 'Send JSON', desc: 'POST your data with an API key from any language.' },
  { no: '04', title: 'Get the file', desc: 'Download a PDF, DOCX or XLSX from the returned URL.' }
]

const WRAP = 'mx-auto max-w-6xl px-4 sm:px-6'

const SectionHeader = ({ no, label, children }: { no: string; label: string; children: React.ReactNode }) => (
  <div className='mb-10'>
    <p className='mb-5 inline-block border-t-2 border-primary pr-6 pt-2 font-mono text-[12px] uppercase tracking-[0.16em] text-default-500'>
      <b className='font-bold text-primary'>{no}</b> — {label}
    </p>
    <h2 className='press-display text-[clamp(2rem,1.4rem+2.6vw,3.5rem)] text-foreground'>{children}</h2>
  </div>
)

export default function DemoPage() {
  return (
    <div className='min-h-screen bg-background'>
      {/* Hero */}
      <section className='border-b border-divider pb-16 pt-28 sm:pt-32'>
        <div className={WRAP}>
          <motion.div {...fadeUp} className='mb-6 flex items-center gap-3'>
            <span className='inline-flex items-center gap-1.5 bg-primary px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-primary-foreground'>
              <Icon icon='lucide:play' aria-hidden='true' className='h-3 w-3' />
              Product walkthrough
            </span>
            <span className='press-label'>4 steps · 1 request</span>
          </motion.div>

          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.05 }}
            className='press-display text-[clamp(3rem,1.8rem+6vw,7rem)] text-foreground'>
            See it <span className='text-primary'>print.</span>
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className='mt-6 max-w-xl text-[17px] leading-relaxed text-default-500 sm:text-[19px]'>
            A guided, automatic walkthrough of the app — from uploading a Word or Excel template to generating the
            document through the REST API. To try it yourself, self-host it in a few minutes.
          </motion.p>

          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.15 }} className='mt-8 flex flex-wrap gap-3'>
            <a
              href='/docs'
              className='group inline-flex h-12 items-center gap-3 bg-primary px-6 text-[14px] font-bold uppercase tracking-[0.04em] text-primary-foreground transition-colors hover:bg-primary-600'>
              <Icon icon='lucide:book-open' aria-hidden='true' className='h-4 w-4' />
              Read docs
            </a>
            <a
              href='https://github.com/qorstack/qorstack-report'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex h-12 items-center gap-3 border border-default-300 px-6 text-[14px] font-bold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-foreground'>
              <Icon icon='lucide:github' aria-hidden='true' className='h-4 w-4' />
              GitHub
            </a>
          </motion.div>

          <motion.ol
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.2 }}
            className='mt-12 grid border-l border-t border-divider sm:grid-cols-2 lg:grid-cols-4'>
            {steps.map(step => (
              <li key={step.no} className='border-b border-r border-divider bg-content1 p-5'>
                <span className='font-mono text-[12px] font-bold tracking-[0.1em] text-primary'>{step.no}</span>
                <p className='mt-2 text-[16px] font-bold uppercase tracking-[0.01em] text-foreground'>{step.title}</p>
                <p className='mt-1 text-[14px] leading-snug text-default-500'>{step.desc}</p>
              </li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* Video demo (4-step) */}
      <VideoDemoSection />

      {/* API Preview */}
      <section className='border-t border-divider py-20'>
        <div className={WRAP}>
          <motion.div {...fadeUp}>
            <SectionHeader no='01' label='REST API'>
              One request. <span className='text-primary'>Any</span> stack.
            </SectionHeader>
            <p className='-mt-4 mb-8 max-w-xl text-[16px] text-default-500'>
              Send your data as JSON, get a download URL back. No SDK required; works with any HTTP client.
            </p>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className='crop'>
            <span className='crop-cm' />
            <CodeBlock code={apiSampleCode} language='json' title='POST /render/word/template' compact />
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className='border-t border-divider bg-content1 py-20'>
        <div className={WRAP}>
          <motion.div {...fadeUp} className='flex flex-col gap-8 md:flex-row md:items-end md:justify-between'>
            <div>
              <p className='press-label mb-4'>Next step</p>
              <h2 className='press-display text-[clamp(2rem,1.4rem+2.6vw,3.5rem)] text-foreground'>
                Ready to <span className='text-primary'>start?</span>
              </h2>
              <p className='mt-4 max-w-md text-[16px] text-default-500'>
                Go to your dashboard and create your first template.
              </p>
            </div>
            <div className='flex flex-wrap gap-3'>
              <Link
                href='/project'
                className='group inline-flex h-12 items-center gap-3 bg-primary px-6 text-[14px] font-bold uppercase tracking-[0.04em] text-primary-foreground transition-colors hover:bg-primary-600'>
                Go to dashboard
                <Icon
                  icon='lucide:arrow-right'
                  aria-hidden='true'
                  className='h-4 w-4 transition-transform group-hover:translate-x-1'
                />
              </Link>
              <a
                href='/docs'
                className='inline-flex h-12 items-center gap-3 border border-default-300 px-6 text-[14px] font-bold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-foreground'>
                <Icon icon='lucide:book-open' aria-hidden='true' className='h-4 w-4' />
                Documentation
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
