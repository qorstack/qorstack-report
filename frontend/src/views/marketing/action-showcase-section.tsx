'use client'

import Icon from '@/components/icon'
import { CodeSwitcher, useSharedLanguage } from '@/components/docs/CodeSwitcher'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback, useMemo } from 'react'
import { getSdkCodeExamples } from '@/utils/code-gen'

const SHOWCASE_DATA = {
  templateKey: 'YOUR_TEMPLATE_KEY',
  replace: {
    customer_name: 'John Doe',
    total: '$1,070.00'
  }
}

const ActionShowcaseSection = () => {
  const [activeLang, setActiveLang] = useSharedLanguage('nodejs')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const showcaseExamples = useMemo(() => getSdkCodeExamples(SHOWCASE_DATA), [])

  const simulateGeneration = useCallback(() => {
    if (isGenerating) return
    setIsGenerating(true)
    setIsGenerated(false)
    setTimeout(() => {
      setIsGenerating(false)
      setIsGenerated(true)
    }, 2000)
  }, [isGenerating])

  return (
    <section className='relative overflow-hidden bg-background py-24'>
      <div className='relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className='mb-16 max-w-2xl'>
          <span className='font-label mb-3 block text-[11px] font-bold uppercase tracking-widest text-primary'>
            Developer Experience
          </span>
          <h2 className='font-headline mb-4 text-[clamp(1.5rem,3vw,2.5rem)] font-bold leading-tight text-foreground'>
            Code your documents like a pro.
          </h2>
          <p className='text-base leading-relaxed text-default-600'>
            Install the{' '}
            <code className='font-label rounded bg-content3 px-1.5 py-0.5 text-sm text-primary'>@qorstack/sdk</code>,
            pass your extracted variables, and generate PDFs in seconds.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className='mx-auto max-w-7xl'>
          <div className='flex flex-col items-stretch gap-8 md:flex-row'>
            {/* Left: CodeSwitcher */}
            <div className='w-full md:w-1/2'>
              <CodeSwitcher
                examples={showcaseExamples}
                activeLang={activeLang}
                onLangChange={setActiveLang}
                isDisableMarginY
              />
            </div>

            {/* Right: Document Result */}
            <div className='hidden w-full flex-col md:flex md:w-1/2'>
              <div className='relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-xl bg-background p-6 ring-2 ring-default-300/30 dark:bg-content2 dark:ring-default-300/20'>
                {/* Loading Overlay */}
                <AnimatePresence>
                  {isGenerating && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className='absolute inset-0 z-20 flex flex-col items-center justify-center bg-content1/90 backdrop-blur-sm'>
                      <Icon icon='lucide:loader-2' className='mb-4 h-10 w-10 animate-spin text-primary' />
                      <p className='font-label text-sm font-bold uppercase tracking-wide text-default-600'>
                        Generating...
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* PDF Content */}
                <div className='h-full w-full'>
                  <div className='mb-4 flex items-start justify-between border-b-2 border-default-200 pb-3'>
                    <div>
                      <div className='text-lg font-black tracking-tight text-foreground'>INVOICE</div>
                      <div className='font-label mt-0.5 text-[10px] font-medium text-default-500'>Qorstack Corp.</div>
                    </div>
                    <div className='text-right font-mono text-[9px] text-default-400'>
                      INV-2026-001
                      <br />
                      15/03/2026
                    </div>
                  </div>
                  <div className='space-y-3'>
                    <div className='h-1.5 w-28 rounded-full bg-default-200' />
                    <div className='h-1.5 w-40 rounded-full bg-default-100' />
                    <div className='mt-5 rounded-lg border border-default-200 bg-content2 p-3 dark:bg-content1'>
                      <div className='font-label mb-2 flex justify-between border-b border-default-200 pb-2 text-[9px] font-bold uppercase tracking-widest text-default-500'>
                        <span>Customer</span>
                        <span>Total</span>
                      </div>
                      <div className='flex items-center justify-between text-xs'>
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors duration-300 ${
                            isGenerated
                              ? 'bg-success/20 text-success dark:bg-success/10'
                              : 'bg-primary/20 text-primary dark:bg-primary/10'
                          }`}>
                          {isGenerated ? 'John Doe' : '{{customer_name}}'}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors duration-300 ${
                            isGenerated
                              ? 'bg-success/20 text-success dark:bg-success/10'
                              : 'bg-primary/20 text-primary dark:bg-primary/10'
                          }`}>
                          {isGenerated ? '$1,070.00' : '{{total}}'}
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center justify-between border-t border-default-200 pt-3'>
                      <div className='font-label text-[10px] font-bold uppercase tracking-widest text-default-500'>
                        Total Due
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-xs font-bold transition-colors duration-300 ${
                          isGenerated
                            ? 'bg-success/20 text-success dark:bg-success/10'
                            : 'bg-primary/20 text-primary dark:bg-primary/10'
                        }`}>
                        {isGenerated ? '$1,070.00' : '{{total}}'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Generate Button */}
          <div className='mt-8 flex justify-center'>
            <button
              onClick={simulateGeneration}
              disabled={isGenerating}
              className='flex items-center gap-3 rounded-md bg-primary px-10 py-3.5 font-sans text-base font-bold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50'>
              {isGenerating ? (
                <>
                  <Icon icon='lucide:loader-2' className='h-5 w-5 animate-spin' /> Generating...
                </>
              ) : (
                <>
                  <Icon icon='lucide:zap' className='h-5 w-5' /> Run Generate
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default ActionShowcaseSection
