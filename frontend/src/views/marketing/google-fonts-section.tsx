'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'

const showcaseFonts = [
  { sample: 'Ag', font: 'font-playfair', name: 'Playfair', weight: 'font-light', letterColor: 'text-foreground/70', colBg: '' },
  { sample: 'Ag', font: 'font-montserrat', name: 'Montserrat', weight: 'font-black', letterColor: 'text-primary', colBg: 'bg-primary/8' },
  { sample: 'Ag', font: 'font-outfit', name: 'Outfit', weight: 'font-medium', letterColor: 'text-foreground', colBg: '' },
  { sample: 'Ag', font: 'font-headline', name: 'Space Grotesk', weight: 'font-semibold', letterColor: 'text-primary/70', colBg: 'bg-primary/5' }
]

const thaiFontSamples = [
  { word: 'สวัสดี', label: 'ใบเสนอราคา', font: 'font-kanit', weight: 'font-bold', name: 'Kanit', colBg: '' },
  { word: 'รายงาน', label: 'รายงานประจำปี', font: 'font-noto-sans-thai', weight: 'font-normal', name: 'Noto Sans', colBg: '' },
  { word: 'เอกสาร', label: 'เอกสารสำคัญ', font: 'font-pridi', weight: 'font-medium', name: 'Pridi', colBg: '' }
]

const fontBadges = [
  { name: 'Inter', font: 'font-sans' },
  { name: 'Montserrat', font: 'font-montserrat' },
  { name: 'Playfair Display', font: 'font-playfair' },
  { name: 'Space Grotesk', font: 'font-headline' },
  { name: 'Outfit', font: 'font-outfit' }
]

const easeExpoOut = [0.16, 1, 0.3, 1] as const

const GoogleFontsSection = () => {
  return (
    <section className='overflow-hidden bg-content1 py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='flex flex-col items-center gap-16 lg:flex-row-reverse'>

          {/* Text (Right) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: easeExpoOut }}
            className='lg:w-1/2'>
            <div className='mb-6 inline-flex items-center gap-2 rounded-md bg-secondary/10 px-3 py-1.5 font-label text-[11px] font-bold uppercase tracking-[0.05em] text-secondary'>
              <Icon icon='lucide:type' className='h-4 w-4' /> Typography First
            </div>
            <h2 className='mb-4 font-headline text-3xl font-bold leading-tight text-foreground md:text-4xl'>
              Access 1,500+ <br />
              <span className='text-primary'>premium fonts.</span>
            </h2>
            <p className='mb-8 max-w-[50ch] text-base leading-relaxed text-default-600'>
              Beautiful typography shouldn&apos;t be hard. Qorstack Report renders any Google Font natively, ensuring
              your reports look stunning on any device or in print.
            </p>
            <div className='flex flex-wrap gap-2'>
              {fontBadges.map(f => (
                <div
                  key={f.name}
                  className={`${f.font} cursor-default rounded-lg bg-content2 px-3.5 py-1.5 text-sm text-foreground transition-transform hover:-translate-y-0.5`}>
                  {f.name}
                </div>
              ))}
              <div className='flex items-center rounded-lg bg-content3 px-3.5 py-1.5 text-xs font-medium text-default-500'>
                +1,495 more
              </div>
            </div>
          </motion.div>

          {/* Showcase (Left) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: easeExpoOut }}
            className='w-full lg:w-1/2'>
            <div className='mx-auto flex max-w-[420px] flex-col gap-3'>

              {/* Font specimen strip — 4 columns, compact */}
              <div className='grid grid-cols-4 divide-x divide-default-200/60 overflow-hidden rounded-xl bg-content2'>
                {showcaseFonts.map((f, i) => (
                  <motion.div
                    key={f.name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: 0.1 + i * 0.06, ease: easeExpoOut }}
                    className={`${f.colBg} flex flex-col items-center justify-center gap-1.5 py-6`}>
                    <span className={`${f.font} ${f.weight} text-3xl leading-none ${f.letterColor}`}>
                      {f.sample}
                    </span>
                    <span className='text-center font-label text-[9px] font-medium text-default-400'>
                      {f.name}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Thai Font Support */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.35, ease: easeExpoOut }}
                className='overflow-hidden rounded-xl bg-content2'>
                {/* Header */}
                <div className='flex items-center gap-2 border-b border-default-200/60 px-4 py-2.5'>
                  <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary/10'>
                    <Icon icon='lucide:languages' className='h-3.5 w-3.5 text-secondary' />
                  </div>
                  <span className='text-xs font-bold text-foreground'>Thai Font Support</span>
                  <span className='ml-auto font-label text-[9px] text-default-400'>All Google Fonts</span>
                </div>

                {/* 3-column preview */}
                <div className='grid grid-cols-3 divide-x divide-default-200/50'>
                  {thaiFontSamples.map((f, i) => (
                    <motion.div
                      key={f.name}
                      initial={{ opacity: 0, y: 6 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.4 + i * 0.08, ease: easeExpoOut }}
                      className='flex flex-col items-center gap-1.5 px-3 py-4'>
                      <span className={`${f.font} ${f.weight} text-2xl leading-none text-foreground`}>
                        {f.word}
                      </span>
                      <span className={`${f.font} text-center text-[10px] text-default-500`}>
                        {f.label}
                      </span>
                      <span className='font-label text-[8px] font-medium uppercase tracking-wider text-default-400'>
                        {f.name}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}

export default GoogleFontsSection
