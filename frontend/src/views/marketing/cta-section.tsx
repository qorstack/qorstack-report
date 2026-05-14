'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'
import Link from 'next/link'

const TERMINAL_LINES = [
  { id: 'cmd-clone',    type: 'cmd',  text: 'git clone https://github.com/qorstack/qorstack-report' },
  { id: 'cmd-cd',       type: 'cmd',  text: 'cd qorstack-report' },
  { id: 'cmd-up',       type: 'cmd',  text: 'docker compose up -d' },
  { id: 'gap-1',        type: 'gap' },
  { id: 'info-start',   type: 'info', text: 'Starting services...' },
  { id: 'ok-postgres',  type: 'ok',   text: 'postgres        ready' },
  { id: 'ok-minio',     type: 'ok',   text: 'minio           ready' },
  { id: 'ok-gotenberg', type: 'ok',   text: 'gotenberg       ready' },
  { id: 'ok-api',       type: 'ok',   text: 'qorstack-api    ready  :8080' },
  { id: 'ok-web',       type: 'ok',   text: 'qorstack-web    ready  :3000' },
  { id: 'gap-2',        type: 'gap' },
  { id: 'done-open',    type: 'done', text: '✓  Open http://localhost:3000' },
]

const CTASection = () => (
  <section className='bg-background py-24'>
    <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className='overflow-hidden rounded-3xl border border-default-200 bg-content1'>


        <div className='grid items-center gap-0 lg:grid-cols-2 lg:divide-x lg:divide-default-100'>

          {/* ── Left: CTA ── */}
          <div className='px-10 py-14 lg:px-14'>
            <p className='font-label mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary'>
              Open Source · Self-Hosted
            </p>
            <h2
              className='mb-4 font-bold tracking-tight text-foreground'
              style={{ fontSize: 'clamp(1.75rem, 1.25rem + 1.5vw, 2.5rem)', lineHeight: 1.15 }}>
              Deploy in minutes.<br />Own it forever.
            </h2>
            <p className='mb-8 text-base leading-relaxed text-default-500'>
              MIT licensed core. Full control over your data and infrastructure.
              Upgrade to Pro when your team is ready — no subscriptions, ever.
            </p>

            <div className='mb-10 flex flex-col gap-3 sm:flex-row'>
              <Link
                href='/self-host'
                className='inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90'>
                <Icon icon='lucide:container' className='h-4 w-4' />
                Self-Host for Free
              </Link>
              <a
                href='#supporters'
                className='inline-flex items-center justify-center gap-2 rounded-xl border border-default-200 bg-content2 px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-content3'>
                <Icon icon='lucide:shield-check' className='h-4 w-4' />
                Get Pro License
              </a>
            </div>

            {/* Trust row */}
            <div className='flex flex-wrap gap-x-5 gap-y-2'>
              {[
                { icon: 'lucide:scale',        text: 'MIT License' },
                { icon: 'lucide:lock',          text: 'No vendor lock-in' },
                { icon: 'mdi:docker',           text: 'Docker ready' },
                { icon: 'lucide:infinity',      text: 'Lifetime Pro' },
              ].map(t => (
                <div key={t.text} className='flex items-center gap-1.5 text-xs text-default-400'>
                  <Icon icon={t.icon} className='h-3.5 w-3.5 text-default-300' />
                  {t.text}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Terminal ── */}
          <div className='flex items-center justify-center px-8 py-10 lg:px-10'>
            <div className='w-full max-w-md overflow-hidden rounded-lg bg-code-body'>

              {/* Chrome — matches hero-section style */}
              <div className='flex items-center justify-between bg-code-chrome px-4 py-2.5'>
                <div className='flex items-center gap-3'>
                  <div className='flex gap-1.5'>
                    <div className='h-2.5 w-2.5 rounded-full bg-danger/50' />
                    <div className='h-2.5 w-2.5 rounded-full bg-warning/50' />
                    <div className='h-2.5 w-2.5 rounded-full bg-success/50' />
                  </div>
                  <span className='font-mono text-[11px] text-code-muted'>terminal</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <div className='h-1.5 w-1.5 animate-pulse rounded-full bg-success' />
                  <span className='font-label text-[9px] font-bold uppercase tracking-wider text-code-muted'>
                    bash
                  </span>
                </div>
              </div>

              {/* Lines */}
              <div className='space-y-1 px-4 py-4 font-mono text-[12px] leading-relaxed'>
                {TERMINAL_LINES.map(line => {
                  if (line.type === 'gap') return <div key={line.id} className='h-2' />
                  return (
                    <motion.div
                      key={line.id}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: TERMINAL_LINES.indexOf(line) * 0.07, duration: 0.2 }}
                      className='flex items-start gap-2'>
                      {line.type === 'cmd'  && <span className='shrink-0 text-success'>$</span>}
                      {line.type === 'ok'   && <span className='shrink-0 text-success'>✓</span>}
                      {line.type === 'info' && <span className='shrink-0 text-code-subtle'>·</span>}
                      {line.type === 'done' && <span className='shrink-0 opacity-0'>·</span>}
                      <span className={
                        line.type === 'cmd'  ? 'text-code-fg' :
                        line.type === 'ok'   ? 'text-code-muted' :
                        line.type === 'info' ? 'text-code-subtle' :
                        'text-code-ok'
                      }>
                        {line.text}
                      </span>
                    </motion.div>
                  )
                })}
                <div className='mt-1 flex items-center gap-2'>
                  <span className='text-success'>$</span>
                  <span className='inline-block h-3.5 w-1.5 animate-pulse bg-code-muted' />
                </div>
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  </section>
)

export default CTASection
