'use client'

import Icon from '@/components/icon'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { useAuth } from '@/providers/AuthContext'
import { motion } from 'framer-motion'
import Image from 'next/image'

const easeExpoOut = [0.16, 1, 0.3, 1] as const

const apiRequestCode = `{
  "templateKey": "invoice.docx",
  "replace": {
    "customer_name": "John Doe",
    "total": "$1,070.00"
  }
}`

const HeroSection = () => {
  const { openAuthModal, user, navigateHome } = useAuth()

  return (
    <section className='relative flex min-h-screen flex-col justify-center overflow-hidden pb-12 pt-28 sm:pt-32 lg:pt-36 lg:pb-16'>
      {/* Dot grid — light mode texture */}
      <div className='pointer-events-none absolute inset-0 bg-dots opacity-20 dark:hidden' />

      {/* Light mode: soft primary glow */}
      <div className='pointer-events-none absolute -left-48 -top-48 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px] dark:hidden' />

      {/* Decorative grid lines — architectural blueprint feel (desktop only) */}
      <div className='pointer-events-none absolute inset-y-0 right-[8%] hidden w-px bg-gradient-to-b from-transparent via-default-300/25 to-transparent dark:via-default-500/10 lg:block' />
      <div className='pointer-events-none absolute inset-y-0 left-[8%] hidden w-px bg-gradient-to-b from-transparent via-default-300/15 to-transparent dark:via-default-500/6 lg:block' />

      <div className='relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16'>

          {/* ── LEFT: Text ── */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: easeExpoOut }}
              className='mb-5 inline-flex items-center gap-2 rounded bg-primary/8 px-3 py-1.5 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-primary ring-1 ring-inset ring-primary/20'>
              <Icon icon='mdi:sparkles' className='h-3 w-3' />
              Open-Source · Self-Hosted · Free
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.06, ease: easeExpoOut }}
              className='mb-5 font-headline font-bold leading-[1.02] tracking-[-0.028em] text-foreground'
              style={{ fontSize: 'clamp(2.25rem, 1.6rem + 3.4vw, 3.85rem)' }}>
              Templates to
              <br />
              <span className='text-primary italic'>PDFs & Excel,</span>
              <br />
              on demand.
            </motion.h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.14, ease: easeExpoOut }}
              className='mb-7 max-w-md text-[15px] leading-relaxed text-default-700'>
              Design your layout in Word or Excel, send data via REST API, and receive a
              pixel-perfect PDF or Excel file in milliseconds. No HTML, no CSS — just templates
              your team already knows how to edit.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2, ease: easeExpoOut }}
              className='mb-7 flex flex-wrap gap-2.5'>
              <button
                onClick={() => (user ? navigateHome() : openAuthModal('login'))}
                className='flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 font-label text-sm font-bold tracking-wide text-primary-foreground transition-opacity hover:opacity-90'>
                {user ? 'Go to Dashboard' : 'Get Started Free'}
                <Icon icon='lucide:arrow-right' className='h-3.5 w-3.5' />
              </button>
              <a
                href='#demo'
                className='flex items-center gap-2 rounded-md bg-content2 px-6 py-2.5 font-label text-sm font-bold tracking-wide text-foreground transition-colors hover:bg-content3'>
                <Icon icon='lucide:play-circle' className='h-3.5 w-3.5 text-default-600' />
                Watch Demo
              </a>
            </motion.div>

            {/* Tags */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.27, ease: easeExpoOut }}
              className='flex flex-wrap gap-1.5'>
              {['MIT Licensed', 'PDF & Excel Output', 'No HTML/CSS', 'REST API'].map(tag => (
                <span
                  key={tag}
                  className='rounded bg-content2 px-2.5 py-1 font-label text-[9.5px] font-bold uppercase tracking-[0.07em] text-default-600'>
                  {tag}
                </span>
              ))}
            </motion.div>
          </div>

          {/* ── RIGHT: Terminal + Preview ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease: easeExpoOut }}
            className='relative flex flex-col gap-2.5'>

            {/* ─ API Terminal card ─ */}
            <div className='overflow-hidden rounded-lg' style={{ background: '#0A0E16' }}>

              {/* Custom chrome with traffic lights + endpoint */}
              <div
                className='flex items-center justify-between px-4 py-2.5'
                style={{ background: '#10131C' }}>
                <div className='flex items-center gap-3'>
                  <div className='flex gap-1.5'>
                    <div className='h-2.5 w-2.5 rounded-full bg-danger/50' />
                    <div className='h-2.5 w-2.5 rounded-full bg-warning/50' />
                    <div className='h-2.5 w-2.5 rounded-full bg-success/50' />
                  </div>
                  <span className='font-mono text-[11px]' style={{ color: '#7C8090' }}>
                    POST /render/word/template
                  </span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <div className='h-1.5 w-1.5 rounded-full bg-success' />
                  <span
                    className='font-label text-[9px] font-bold uppercase tracking-wider'
                    style={{ color: '#7C8090' }}>
                    Live
                  </span>
                </div>
              </div>

              {/* CodeBlock body — header hidden, using our custom chrome above */}
              <CodeBlock
                code={apiRequestCode}
                language='json'
                showHeader={false}
                compact
                className='rounded-none'
              />

              {/* Response footer */}
              <div
                className='flex items-center justify-between px-4 py-2.5'
                style={{ background: '#10131C' }}>
                <div className='flex items-center gap-2.5'>
                  <span className='font-mono text-[11px] font-bold text-success'>200 OK</span>
                  <span className='font-mono text-[11px]' style={{ color: '#7C8090' }}>
                    invoice.pdf · ready
                  </span>
                </div>
                <span className='font-mono text-[10px]' style={{ color: '#55596A' }}>
                  0.82s
                </span>
              </div>
            </div>

            {/* ─ PDF Preview strip ─ */}
            <div className='overflow-hidden rounded-lg' style={{ background: '#0A0E16' }}>
              <div
                className='flex items-center gap-2 px-4 py-2'
                style={{ background: '#10131C' }}>
                <div className='h-1.5 w-1.5 animate-pulse rounded-full bg-success' />
                <span
                  className='font-label text-[9px] font-bold uppercase tracking-wider'
                  style={{ color: '#7C8090' }}>
                  PDF Output
                </span>
              </div>
              <Image
                src='/images/hero-core-report.png'
                alt='Generated PDF report preview'
                width={800}
                height={300}
                className='h-36 w-full object-cover object-top sm:h-40'
                priority
              />
            </div>

            {/* Floating stat badge — bottom-left */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.55, ease: easeExpoOut }}
              className='absolute -bottom-3 -left-4 flex items-center gap-2.5 rounded-lg bg-background px-3 py-2 ring-1 ring-inset ring-default-300/40 dark:ring-default-400/15'>
              <div className='flex h-6 w-6 items-center justify-center rounded bg-success/10 text-success'>
                <Icon icon='lucide:github' className='h-3 w-3' />
              </div>
              <div>
                <div className='font-label text-[8px] font-bold uppercase tracking-wider text-default-600'>
                  Open Source
                </div>
                <div className='font-headline text-xs font-bold text-foreground'>MIT Licensed</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom ruler */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className='mt-10 flex items-center gap-4 lg:mt-14'>
          <div className='h-px flex-1 bg-gradient-to-r from-transparent to-default-300/25 dark:to-default-500/10' />
          <span className='font-label text-[9px] font-bold uppercase tracking-[0.12em] text-default-600'>
            Open Source · Self-Hosted · Production Ready
          </span>
          <div className='h-px flex-1 bg-gradient-to-l from-transparent to-default-300/25 dark:to-default-500/10' />
        </motion.div>
      </div>
    </section>
  )
}

export default HeroSection
