'use client'

import Icon from '@/components/icon'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { DemoShell } from './demo-shell'

type Phase = 'idle' | 'filling' | 'generating' | 'rendered'

const PHASES: { key: Phase; duration: number }[] = [
  { key: 'idle', duration: 1000 },
  { key: 'filling', duration: 2400 },
  { key: 'generating', duration: 1200 },
  { key: 'rendered', duration: 3400 }
]

const VARIABLES = [
  { name: 'VISA_CERT_ID', value: 'V-2026-A4F2' },
  { name: 'DATE_NOW', value: '15 Mar 2026' },
  { name: 'NAME', value: 'John Doe' },
  { name: 'COMPANY_NAME_TH', value: 'บริษัท เอซมี จำกัด' },
  { name: 'JURISTIC_NUMBER', value: '0105561234567' }
]

/** Mirrors /pdf/templates/[id] sandbox builder + preview layout. */
export const DemoStepBuild = ({ onComplete }: { onComplete?: () => void }) => {
  const [phase, setPhase] = useState<Phase>('idle')
  const [filledCount, setFilledCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let fillTimer: ReturnType<typeof setTimeout>

    const cycle = (idx: number) => {
      if (cancelled) return
      const { key, duration } = PHASES[idx]
      setPhase(key)

      if (key === 'filling') {
        setFilledCount(0)
        let i = 0
        const tick = () => {
          if (cancelled) return
          i += 1
          setFilledCount(i)
          if (i < VARIABLES.length) fillTimer = setTimeout(tick, 400)
        }
        fillTimer = setTimeout(tick, 200)
      } else if (key === 'generating' || key === 'rendered') {
        setFilledCount(VARIABLES.length)
      } else {
        setFilledCount(0)
      }

      timer = setTimeout(() => {
        if (idx + 1 < PHASES.length) cycle(idx + 1)
        else onComplete?.()
      }, duration)
    }
    cycle(0)
    return () => {
      cancelled = true
      clearTimeout(timer)
      clearTimeout(fillTimer)
    }
  }, [onComplete])

  const rendered = phase === 'rendered'

  return (
    <DemoShell active='templates' projectName='test'>
      {/* Sub-toolbar: breadcrumb + template name + badges */}
      <div className='flex items-center justify-between border-b border-default-200/70 px-3 py-1.5 dark:border-default-200/10'>
        <div className='flex items-center gap-2'>
          <span className='font-label text-[9px] text-default-400'>Templates / Builder</span>
          <span className='font-headline text-[11px] font-bold text-foreground'>Digital Signed Visa_v2</span>
          <span className='inline-flex items-center gap-0.5 rounded bg-danger/15 px-1 py-0.5 font-label text-[8px] font-bold uppercase tracking-wider text-danger'>
            PDF
          </span>
          <span className='inline-flex items-center gap-0.5 rounded bg-content2 px-1 py-0.5 font-mono text-[8px] text-default-500 dark:bg-content3'>
            QOR-7381-600-435-3132
          </span>
        </div>
        <div className='flex items-center gap-1'>
          <Icon icon='lucide:trash-2' className='h-3 w-3 text-default-400' />
          <Icon icon='lucide:download' className='h-3 w-3 text-default-400' />
          <span className='rounded bg-content2 px-1.5 py-0.5 font-label text-[8.5px] font-bold uppercase tracking-wider text-default-500 dark:bg-content3'>
            v1
          </span>
          <span className='inline-flex items-center gap-0.5 rounded bg-foreground px-1.5 py-0.5 font-label text-[8.5px] font-bold uppercase tracking-wider text-background'>
            <Icon icon='lucide:upload' className='h-2.5 w-2.5' />
            Update
          </span>
        </div>
      </div>

      {/* Body: builder + preview */}
      <div className='flex h-[calc(100%-26px)]'>
        {/* Left: Builder pane */}
        <div className='flex w-[55%] flex-col border-r border-default-200/70 dark:border-default-200/10'>
          {/* Tabs */}
          <div className='flex items-center gap-1 px-2 pt-1.5'>
            <button className='rounded bg-content2 px-2 py-0.5 font-label text-[9px] font-bold uppercase tracking-wider text-foreground dark:bg-content3'>
              <Icon icon='lucide:layout-panel-left' className='inline h-2.5 w-2.5' /> Fields
            </button>
            <button className='rounded px-2 py-0.5 font-label text-[9px] font-bold uppercase tracking-wider text-default-500'>
              <Icon icon='lucide:code' className='inline h-2.5 w-2.5' /> Code
            </button>
          </div>

          <div className='flex flex-1 overflow-hidden p-2'>
            {/* Vertical category nav */}
            <nav className='flex w-[88px] shrink-0 flex-col gap-0.5'>
              <span className='px-1 pb-1 font-label text-[7.5px] font-bold uppercase tracking-wider text-default-400'>Content</span>
              {[
                { i: 'lucide:type', t: 'Text fields', count: 23, active: true },
                { i: 'lucide:table', t: 'Tables', count: 0 },
                { i: 'lucide:image', t: 'Images', count: 3 },
                { i: 'lucide:qr-code', t: 'QR Codes', count: 2 },
                { i: 'lucide:scan-line', t: 'Barcodes', count: 3 }
              ].map(row => (
                <div
                  key={row.t}
                  className={`flex items-center gap-1 rounded px-1.5 py-1 text-[8.5px] font-semibold ${
                    row.active ? 'bg-foreground/8 text-foreground' : 'text-default-500'
                  }`}>
                  <Icon icon={row.i} className='h-2.5 w-2.5' />
                  <span className='truncate'>{row.t}</span>
                  <span className='ml-auto text-[7.5px] text-default-500'>{row.count}</span>
                </div>
              ))}
              <span className='mt-1 px-1 pb-1 font-label text-[7.5px] font-bold uppercase tracking-wider text-default-400'>Output</span>
              <div className='flex items-center gap-1 rounded px-1.5 py-1 text-[8.5px] font-semibold text-default-500'>
                <Icon icon='lucide:settings' className='h-2.5 w-2.5' />
                <span>Output settings</span>
                <span className='ml-auto text-[7.5px]'>0</span>
              </div>
            </nav>

            {/* Variables panel */}
            <div className='flex-1 overflow-hidden pl-2'>
              <div className='mb-1.5 flex items-center justify-between'>
                <div>
                  <h3 className='text-[11px] font-bold text-foreground'>Text fields</h3>
                  <p className='text-[8.5px] text-default-500'>Each {'{{name}}'} in your Word file is replaced with the value you type here.</p>
                </div>
                <button className='inline-flex items-center gap-0.5 rounded bg-content2 px-1.5 py-0.5 text-[8.5px] font-bold text-default-600 dark:bg-content3'>
                  <Icon icon='lucide:plus' className='h-2.5 w-2.5' />
                  Add text field
                </button>
              </div>
              <div className='mb-1.5 flex items-center justify-between text-[8.5px]'>
                <span className='text-default-500'>
                  <span className='font-bold text-foreground'>{filledCount}/{VARIABLES.length}</span> filled · <span className='text-warning'>{VARIABLES.length - filledCount} empty</span>
                </span>
                <span className='text-default-400'>Next empty ↓</span>
              </div>
              <div className='space-y-1'>
                {VARIABLES.map((v, i) => {
                  const isFilled = i < filledCount
                  return (
                    <div
                      key={v.name}
                      className='flex items-center gap-1 rounded bg-content2 p-1 dark:bg-content3'>
                      <Icon icon='lucide:grip-vertical' className='h-2.5 w-2.5 text-default-400' />
                      <div className='flex h-5 min-w-[80px] items-center rounded bg-content1 px-1.5 dark:bg-content2'>
                        <span className='font-mono text-[8.5px] text-foreground'>{`{{${v.name}}}`}</span>
                      </div>
                      <div className='flex h-5 flex-1 items-center rounded bg-content1 px-1.5 dark:bg-content2'>
                        <span className={`font-mono text-[8.5px] ${isFilled ? 'text-foreground' : 'text-default-400'}`}>
                          {isFilled ? v.value : 'Type a value'}
                        </span>
                      </div>
                      <Icon icon='lucide:trash-2' className='h-2.5 w-2.5 text-default-400' />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Preview pane */}
        <div className='flex flex-1 flex-col'>
          <div className='flex items-center justify-between border-b border-default-200/70 px-2 py-1 dark:border-default-200/10'>
            <div className='flex items-center gap-1'>
              <Icon icon='lucide:file-text' className='h-3 w-3 text-foreground' />
              <span className='text-[10px] font-bold text-foreground'>Template</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <div className='flex rounded bg-content2 p-[1px] dark:bg-content3'>
                <span className='rounded bg-content1 px-1.5 py-0.5 font-label text-[8px] font-bold uppercase tracking-wider text-foreground dark:bg-content2'>
                  Template
                </span>
                <span className='px-1.5 py-0.5 font-label text-[8px] font-bold uppercase tracking-wider text-default-500'>
                  Preview
                </span>
              </div>
              <div className='flex items-center gap-1'>
                <div className='flex h-3 w-5 items-center rounded-full bg-primary p-[1px]'>
                  <span className='ml-auto h-2 w-2 rounded-full bg-white' />
                </div>
                <span className='font-label text-[8px] font-bold uppercase tracking-wider text-default-500'>Auto-preview</span>
              </div>
              <button
                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-label text-[8.5px] font-bold uppercase tracking-wider transition-colors ${
                  phase === 'generating' ? 'bg-primary/70 text-primary-foreground' : 'bg-foreground text-background'
                }`}>
                {phase === 'generating' ? (
                  <>
                    <Icon icon='lucide:loader-2' className='h-2.5 w-2.5 animate-spin' />
                    Generating
                  </>
                ) : (
                  <>
                    <Icon icon='lucide:zap' className='h-2.5 w-2.5' />
                    Generate
                    <Icon icon='lucide:chevron-down' className='h-2 w-2' />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Source info bar */}
          {!rendered && (
            <div className='flex items-center gap-1 border-b border-default-200/70 bg-content2/50 px-2 py-1 dark:border-default-200/10 dark:bg-content3/30'>
              <Icon icon='lucide:info' className='h-2.5 w-2.5 text-default-400' />
              <span className='text-[8.5px] text-default-500'>
                This is your template file. Values appear after you press Generate.
              </span>
            </div>
          )}

          <div className='relative flex-1 overflow-hidden p-2'>
            <AnimatePresence mode='wait'>
              {rendered ? (
                <motion.div
                  key='rendered'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className='h-full overflow-hidden rounded bg-white p-2 ring-1 ring-default-300/40 dark:ring-default-200/10'>
                  <div className='mb-1 text-right font-mono text-[8px] text-slate-500'>1 / 3</div>
                  <p className='text-[9px] text-slate-900'>ที่ <span className='font-mono text-blue-600'>V-2026-A4F2</span></p>
                  <p className='mt-1 text-[9px] text-slate-900'>เรื่อง <span className='font-mono text-blue-600'>John Doe</span> รับรองสิทธิประโยชน์เพื่อขอรับการตรวจลงตรา</p>
                  <p className='mt-2 text-[8px] leading-snug text-slate-600'>
                    ตามที่ <span className='font-mono text-blue-600'>บริษัท เอซมี จำกัด</span> เลขทะเบียนนิติบุคคล <span className='font-mono text-blue-600'>0105561234567</span> ผู้ประกอบกิจการ
                  </p>
                  <div className='mt-2 space-y-1'>
                    <div className='h-1 w-3/4 bg-slate-200' />
                    <div className='h-1 w-4/5 bg-slate-100' />
                    <div className='h-1 w-2/3 bg-slate-200' />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key='source'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className='h-full overflow-hidden rounded bg-white p-2 ring-1 ring-default-300/40 dark:ring-default-200/10'>
                  <div className='mb-1 text-right font-mono text-[8px] text-slate-500'>1 / 3</div>
                  <p className='text-[9px] text-slate-900'>ที่ <span className='font-mono text-blue-600'>{`{{VISA_CERT_ID}}`}</span></p>
                  <p className='mt-1 text-[9px] text-slate-900'>เรื่อง <span className='font-mono text-blue-600'>{`{{NAME}}`}</span> รับรองสิทธิประโยชน์</p>
                  <p className='mt-2 text-[8px] leading-snug text-slate-600'>
                    ตามที่ <span className='font-mono text-blue-600'>{`{{COMPANY_NAME_TH}}`}</span> เลขทะเบียนนิติบุคคล <span className='font-mono text-blue-600'>{`{{JURISTIC_NUMBER}}`}</span>
                  </p>
                  <div className='mt-2 space-y-1'>
                    <div className='h-1 w-3/4 bg-slate-200' />
                    <div className='h-1 w-4/5 bg-slate-100' />
                    <div className='h-1 w-2/3 bg-slate-200' />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {phase === 'generating' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='absolute inset-2 flex items-center justify-center rounded bg-foreground/25 backdrop-blur-sm'>
                <Icon icon='lucide:loader-2' className='h-5 w-5 animate-spin text-background' />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </DemoShell>
  )
}
