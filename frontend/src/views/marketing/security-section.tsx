'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'

const statusRows = [
  { label: 'Data Stored', value: 'None', icon: 'lucide:database', valueColor: 'text-success' },
  { label: 'Logs Retained', value: 'Zero', icon: 'lucide:scroll-text', valueColor: 'text-success' },
  { label: 'Encryption', value: 'TLS 1.3', icon: 'lucide:lock', valueColor: 'text-[#60B8FF]' },
  { label: 'Processing', value: 'In-Memory Only', icon: 'lucide:cpu', valueColor: 'text-[#FBBF24]' }
]

const SecuritySection = () => {
  return (
    <section className='bg-background py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='flex flex-col items-center gap-16 lg:flex-row'>
          {/* Text (Left) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className='lg:w-1/2'>
            <div className='mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary'>
              <Icon icon='lucide:shield' className='h-4 w-4' /> Enterprise-Grade Security
            </div>
            <h2 className='mb-6 font-headline text-3xl font-bold text-foreground md:text-4xl'>
              Enterprise-grade <br />
              <span className='text-primary'>security.</span>
            </h2>
            <p className='mb-8 text-lg leading-relaxed text-default-600'>
              We understand that documents like invoices and contracts contain sensitive PII. Qorstack Report is built
              with a privacy-first architecture to ensure your data stays yours.
            </p>

            <div className='space-y-6'>
              <div className='flex gap-4'>
                <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl text-primary'>
                  <Icon icon='lucide:trash-2' className='h-5 w-5' />
                </div>
                <div>
                  <h4 className='text-lg font-bold text-foreground'>Strict Production Privacy</h4>
                  <p className='mt-1 text-sm text-default-600'>
                    In <strong>Production Mode</strong>, JSON payloads are processed in memory and discarded instantly.
                    (<strong>Sandbox Mode</strong> temporarily retains logs to help you test and debug easily).
                  </p>
                </div>
              </div>
              <div className='flex gap-4'>
                <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success/10 text-xl text-success'>
                  <Icon icon='lucide:lock' className='h-5 w-5' />
                </div>
                <div>
                  <h4 className='text-lg font-bold text-foreground'>End-to-End Encryption</h4>
                  <p className='mt-1 text-sm text-default-600'>
                    All data transmitted between your servers and our API is encrypted using industry-standard TLS 1.3.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Graphic (Right) — Dark Security Dashboard */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className='relative mt-12 w-full lg:mt-0 lg:w-1/2'>
            <div
              className='relative z-10 mx-auto max-w-md overflow-hidden rounded-2xl '
              style={{ background: '#0A0E16' }}>
              {/* Top bar */}
              <div
                className='flex items-center justify-between px-5 py-3'
                style={{ background: '#10131C', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className='flex items-center gap-2'>
                  <div
                    className='h-1.5 w-1.5 animate-pulse rounded-full bg-success'
                    style={{ boxShadow: '0 0 6px rgba(74,222,128,0.7)' }}
                  />
                  <span className='font-mono text-[10px] font-medium tracking-widest' style={{ color: '#7C8090' }}>
                    SECURITY STATUS
                  </span>
                </div>
                <span
                  className='rounded px-2 py-0.5 font-mono text-[9px] font-medium'
                  style={{
                    background: 'rgba(74,222,128,0.12)',
                    border: '1px solid rgba(74,222,128,0.28)',
                    color: '#4ade80'
                  }}>
                  PROTECTED
                </span>
              </div>

              {/* Data flow */}
              <div className='px-6 py-7'>
                <div className='flex items-center justify-between gap-2'>
                  {/* Your Data */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                    className='flex flex-col items-center gap-2.5'>
                    <div
                      className='flex h-14 w-14 items-center justify-center rounded-xl'
                      style={{ background: 'rgba(96,184,255,0.15)', border: '1px solid rgba(96,184,255,0.35)' }}>
                      <Icon icon='lucide:braces' className='h-6 w-6' style={{ color: '#85C7FF' }} />
                    </div>
                    <span
                      className='font-mono text-[9px] font-normal uppercase tracking-wider'
                      style={{ color: '#7C8090' }}>
                      Your Data
                    </span>
                  </motion.div>

                  {/* Arrow + TLS */}
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    whileInView={{ opacity: 1, scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.35 }}
                    className='flex flex-1 flex-col items-center gap-1.5'>
                    <div
                      className='h-px w-full'
                      style={{ background: 'linear-gradient(to right, rgba(133,199,255,0.5), rgba(74,222,128,0.5))' }}
                    />
                    <div className='flex items-center gap-1'>
                      <Icon icon='lucide:lock' className='h-2.5 w-2.5' style={{ color: '#4ade80' }} />
                      <span className='font-mono text-[8px] font-bold' style={{ color: '#4ade80' }}>
                        TLS 1.3
                      </span>
                    </div>
                  </motion.div>

                  {/* Render shield */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4, type: 'spring' }}
                    className='flex flex-col items-center gap-2.5'>
                    <div
                      className='relative flex h-14 w-14 items-center justify-center rounded-xl'
                      style={{ background: 'rgba(74,222,128,0.18)', border: '1px solid rgba(74,222,128,0.4)' }}>
                      <Icon icon='lucide:shield-check' className='h-6 w-6' style={{ color: '#4ade80' }} />
                      <div
                        className='absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full'
                        style={{
                          background: '#4ade80',
                          boxShadow: '0 0 8px rgba(74,222,128,0.8)',
                          border: '2px solid #0A0E16'
                        }}
                      />
                    </div>
                    <span
                      className='font-mono text-[9px] font-normal uppercase tracking-wider'
                      style={{ color: '#7C8090' }}>
                      Render
                    </span>
                  </motion.div>

                  {/* Return arrow */}
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    whileInView={{ opacity: 1, scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.45 }}
                    className='flex flex-1 flex-col items-center gap-1.5'>
                    <div className='h-px w-full' style={{ background: 'rgba(255,255,255,0.12)' }} />
                    <span
                      className='font-mono text-[8px] font-normal uppercase tracking-widest'
                      style={{ color: '#55596A' }}>
                      RETURN
                    </span>
                  </motion.div>

                  {/* Document */}
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                    className='flex flex-col items-center gap-2.5'>
                    <div
                      className='flex h-14 w-14 items-center justify-center rounded-xl'
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <Icon icon='lucide:file-output' className='h-6 w-6' style={{ color: '#9FA3B3' }} />
                    </div>
                    <span
                      className='font-mono text-[9px] font-normal uppercase tracking-wider'
                      style={{ color: '#7C8090' }}>
                      Document
                    </span>
                  </motion.div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0 24px' }} />

              {/* Status rows */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.55 }}
                className='px-6 py-4'>
                {statusRows.map((row, i) => (
                  <div
                    key={row.label}
                    className='flex items-center justify-between py-2.5'
                    style={
                      i < statusRows.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.06)' } : undefined
                    }>
                    <div className='flex items-center gap-2.5'>
                      <Icon icon={row.icon} className='h-3.5 w-3.5' style={{ color: '#55596A' }} />
                      <span className='font-mono text-xs font-normal' style={{ color: '#7C8090' }}>
                        {row.label}
                      </span>
                    </div>
                    <span className={`font-mono text-xs font-bold ${row.valueColor}`}>{row.value}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default SecuritySection
