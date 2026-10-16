'use client'

import Icon from '@/components/icon'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

type Phase = 'masked' | 'revealed' | 'copying' | 'sent'

const PHASES: { key: Phase; duration: number }[] = [
  { key: 'masked', duration: 1200 },
  { key: 'revealed', duration: 1400 },
  { key: 'copying', duration: 1100 },
  { key: 'sent', duration: 3600 }
]

const REAL_KEY = 'QOR-LIVE-A4F2-9E81-2C70-7B14'

/** Mirrors /project/[id]/api-keys page + bottom curl preview. */
export const DemoStepApi = ({ onComplete }: { onComplete?: () => void }) => {
  const [phase, setPhase] = useState<Phase>('masked')

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const cycle = (idx: number) => {
      if (cancelled) return
      const { key, duration } = PHASES[idx]
      setPhase(key)
      timer = setTimeout(() => {
        if (idx + 1 < PHASES.length) cycle(idx + 1)
        else onComplete?.()
      }, duration)
    }
    cycle(0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [onComplete])

  const revealed = phase !== 'masked'
  const copied = phase === 'copying' || phase === 'sent'
  const sent = phase === 'sent'

  return (
    <div className='absolute inset-0 flex justify-center overflow-hidden bg-content2 px-4 py-4 dark:bg-content1'>
      <div className='flex w-full max-w-[460px] flex-col gap-3'>
        {/* Breadcrumb */}
        <div className='flex items-center gap-1 font-label text-[9px] font-bold uppercase tracking-wider text-default-500'>
          <span>Projects</span>
          <Icon icon='lucide:chevron-right' className='h-2.5 w-2.5 text-default-400' />
          <span className='text-foreground'>Invoice Service</span>
        </div>
        <div>
          <h1 className='font-headline text-[16px] font-bold text-foreground'>API Keys</h1>
          <p className='text-[10.5px] text-default-500'>Manage your project's API authentication key.</p>
        </div>

        {/* Key card */}
        <div className='rounded-md bg-content1 ring-hairline dark:bg-content2'>
          <div className='px-3 py-2'>
            <span className='font-label text-[8.5px] font-bold uppercase tracking-wider text-primary'>Active Key</span>
            <p className='text-[10px] text-default-500'>Use this key to authenticate your requests.</p>
          </div>
          <div className='border-t border-default-200/70 px-3 py-2.5 dark:border-default-200/10'>
            <span className='block font-label text-[8.5px] font-bold uppercase tracking-wider text-default-500'>
              Your API Key
            </span>
            <div className='mt-1 flex items-center gap-1.5 rounded bg-content3 px-2 py-1.5 dark:bg-content1'>
              <Icon icon='lucide:key' className='h-3 w-3 text-default-500' />
              <span className='flex-1 truncate font-mono text-[10px] text-foreground'>
                {revealed ? REAL_KEY : '•'.repeat(28)}
              </span>
              <button className='inline-flex h-5 w-5 items-center justify-center rounded text-default-500'>
                <Icon icon={revealed ? 'lucide:eye-off' : 'lucide:eye'} className='h-3 w-3' />
              </button>
              <button
                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-label text-[8.5px] font-bold uppercase tracking-wider transition-colors ${
                  copied ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground'
                }`}>
                <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} className='h-2.5 w-2.5' />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div className='flex items-start gap-1.5 border-t border-default-200/70 bg-warning-50 px-3 py-2 dark:border-default-200/10 dark:bg-warning-100/10'>
            <Icon icon='lucide:alert-triangle' className='mt-0.5 h-3 w-3 shrink-0 text-warning-600' />
            <div>
              <p className='text-[9.5px] font-bold text-warning-800 dark:text-warning-200'>Keep your API key secure</p>
              <p className='text-[9px] leading-snug text-warning-700/90 dark:text-warning-200/80'>
                Don't share your API key in public repositories or client-side code.
              </p>
            </div>
          </div>
        </div>

        {/* Terminal call preview */}
        <AnimatePresence>
          {(copied || sent) && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className='overflow-hidden rounded bg-[#050505] ring-1 ring-default-300/30 dark:ring-default-200/10'>
              <div className='flex items-center gap-2 border-b border-white/10 bg-[#0b0b0b] px-3 py-1'>
                <div className='flex gap-1'>
                  <span className='h-2 w-2 rounded-full bg-red-500/60' />
                  <span className='h-2 w-2 rounded-full bg-amber-400/60' />
                  <span className='h-2 w-2 rounded-full bg-green-500/60' />
                </div>
                <span className='font-mono text-[9px] text-[#8C8882]'>~/qorstack — bash</span>
                {sent && (
                  <span className='ml-auto inline-flex items-center gap-1 rounded bg-[#3DDC84]/15 px-1.5 py-0.5 font-label text-[8.5px] font-bold uppercase tracking-wider text-[#3DDC84]'>
                    <Icon icon='lucide:check' className='h-2.5 w-2.5' />
                    200 OK · 0.82s
                  </span>
                )}
              </div>
              <pre className='m-0 px-3 py-1.5 font-mono text-[9.5px] leading-snug'>
                <code>
                  <span className='text-pink-400'>import</span>
                  <span className='text-white/70'>{' { '}</span>
                  <span className='text-sky-300'>Qorstack</span>
                  <span className='text-white/70'>{' } '}</span>
                  <span className='text-pink-400'>from</span>
                  <span className='text-emerald-300'>{' \'qorstack-report-sdk\''}</span>
                  <span className='text-white/70'>;</span>
                  {'\n\n'}
                  <span className='text-pink-400'>const</span>
                  <span className='text-sky-300'> qorstack </span>
                  <span className='text-white/70'>= </span>
                  <span className='text-pink-400'>new</span>
                  <span className='text-sky-300'> Qorstack</span>
                  <span className='text-white/70'>{'({ apiKey: '}</span>
                  <span className='relative inline-flex items-center rounded-sm bg-amber-300/20 px-0.5 text-amber-200 ring-1 ring-amber-300/40'>
                    <span className='absolute -inset-px animate-pulse rounded-sm bg-amber-300/10' aria-hidden />
                    <span className='relative'>{`'${REAL_KEY}'`}</span>
                  </span>
                  <span className='text-white/70'>{' });'}</span>
                  <span className='ml-1.5 inline-flex items-center gap-0.5 rounded bg-amber-300/15 px-1 py-0 font-label text-[7.5px] font-bold uppercase tracking-wider text-amber-200'>
                    <Icon icon='lucide:arrow-up' className='h-2 w-2' />
                    key from above
                  </span>
                  {'\n\n'}
                  <span className='text-pink-400'>const</span>
                  <span className='text-sky-300'> result </span>
                  <span className='text-white/70'>= </span>
                  <span className='text-pink-400'>await</span>
                  <span className='text-sky-300'> qorstack.render</span>
                  <span className='text-white/70'>{'({'}</span>
                  {'\n  '}
                  <span className='text-sky-300'>templateKey</span>
                  <span className='text-white/70'>: </span>
                  <span className='text-emerald-300'>{`'invoice-template'`}</span>
                  <span className='text-white/70'>,</span>
                  {'\n  '}
                  <span className='text-sky-300'>replace</span>
                  <span className='text-white/70'>{': { customer_name: '}</span>
                  <span className='text-emerald-300'>{`'Acme Co., Ltd.'`}</span>
                  <span className='text-white/70'>{' }'}</span>
                  {'\n'}
                  <span className='text-white/70'>{'});'}</span>
                </code>
              </pre>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result card — appears after API call completes */}
        <AnimatePresence>
          {sent && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className='overflow-hidden rounded-md bg-content1 ring-hairline dark:bg-content2'>
              <div className='flex items-center justify-between border-b border-default-200/70 px-3 py-1.5 dark:border-default-200/10'>
                <span className='font-label text-[8.5px] font-bold uppercase tracking-wider text-default-500'>
                  Generated file
                </span>
                <div className='flex items-center gap-1'>
                  {(['PDF', 'DOCX', 'XLSX', 'ZIP'] as const).map(fmt => (
                    <span
                      key={fmt}
                      className={`rounded px-1 py-0.5 font-label text-[8px] font-bold uppercase tracking-wider ${
                        fmt === 'PDF' ? 'bg-danger/15 text-danger' : 'bg-content2 text-default-400 dark:bg-content3'
                      }`}>
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>
              <div className='flex items-center gap-2.5 p-2.5'>
                {/* Mini PDF thumbnail */}
                <div className='flex h-14 w-10 shrink-0 flex-col overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-default-200'>
                  <div className='h-1.5 w-full bg-slate-900' />
                  <div className='flex-1 p-1'>
                    <div className='mb-0.5 h-0.5 w-3/4 bg-slate-300' />
                    <div className='h-0.5 w-1/2 bg-slate-200' />
                    <div className='mt-1 h-0.5 w-2/3 bg-slate-200' />
                    <div className='mt-0.5 h-0.5 w-3/4 bg-slate-200' />
                    <div className='mt-1 h-1 w-full bg-slate-900' />
                  </div>
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-1.5'>
                    <span className='truncate text-[11px] font-bold text-foreground'>invoice-2026-001.pdf</span>
                    <span className='inline-flex items-center gap-0.5 rounded bg-success/15 px-1 py-0.5 font-label text-[8.5px] font-bold uppercase tracking-wider text-success'>
                      <Icon icon='lucide:check' className='h-2.5 w-2.5' />
                      200 OK
                    </span>
                  </div>
                  <p className='text-[9px] text-default-500'>142 KB · rendered in 0.82s</p>
                  <p className='mt-0.5 truncate font-mono text-[8.5px] text-default-400'>
                    localhost:8080/api/files/eyJhIjoi...
                  </p>
                </div>
                <button className='inline-flex shrink-0 items-center gap-1 rounded bg-foreground px-2 py-1 font-label text-[9px] font-bold uppercase tracking-wider text-background'>
                  <Icon icon='lucide:download' className='h-2.5 w-2.5' />
                  Download
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
