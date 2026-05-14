'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'

const showcaseFonts = [
  { sample: 'Ag', font: 'font-playfair',    name: 'Playfair',     weight: 'font-light',    letterColor: 'text-foreground/70', colBg: '' },
  { sample: 'Ag', font: 'font-montserrat',  name: 'Montserrat',   weight: 'font-black',    letterColor: 'text-primary',       colBg: 'bg-primary/8' },
  { sample: 'Ag', font: 'font-outfit',      name: 'Outfit',       weight: 'font-medium',   letterColor: 'text-foreground',    colBg: '' },
  { sample: 'Ag', font: 'font-headline',    name: 'Space Grotesk',weight: 'font-semibold', letterColor: 'text-primary/70',    colBg: 'bg-primary/5' },
]

const thaiFontSamples = [
  { word: 'สวัสดี', label: 'ใบเสนอราคา',    font: 'font-kanit',          weight: 'font-bold',   name: 'Kanit' },
  { word: 'รายงาน', label: 'รายงานประจำปี', font: 'font-noto-sans-thai', weight: 'font-normal', name: 'Noto Sans' },
  { word: 'เอกสาร', label: 'เอกสารสำคัญ',  font: 'font-pridi',          weight: 'font-medium', name: 'Pridi' },
]

const fontBadges = [
  { name: 'Inter',          font: 'font-sans' },
  { name: 'Montserrat',     font: 'font-montserrat' },
  { name: 'Playfair',       font: 'font-playfair' },
  { name: 'Space Grotesk',  font: 'font-headline' },
  { name: 'Outfit',         font: 'font-outfit' },
]

const customFontFiles = [
  { name: 'BrandSans-Regular.woff2',  size: '42 KB', preview: 'Aa',  font: 'font-sans',    active: true  },
  { name: 'BrandSans-Bold.woff2',     size: '44 KB', preview: 'Aa',  font: 'font-sans',    active: true  },
  { name: 'BrandSerif-Light.woff2',   size: '38 KB', preview: 'Aa',  font: 'font-playfair',active: false },
]

const fontSources = [
  { icon: 'lucide:settings-2',  label: 'Config file',          desc: 'Mount fonts via docker volume' },
  { icon: 'lucide:upload',      label: 'Upload via dashboard', desc: 'WOFF / WOFF2 · instant preview' },
]

const easeExpoOut = [0.16, 1, 0.3, 1] as const

const GoogleFontsSection = () => (
  <section className='overflow-hidden bg-content1 py-24'>
    <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
      <div className='flex flex-col items-start gap-16 lg:flex-row-reverse'>

        {/* ── Text (right) ── */}
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
            Any font,<br />
            <span className='text-primary'>your way.</span>
          </h2>
          <p className='mb-8 max-w-[50ch] text-base leading-relaxed text-default-600'>
            Use Google Fonts out of the box, mount a config file, or upload WOFF/WOFF2 directly through the dashboard — fonts render identically in every generated document.
          </p>

          {/* 3 sources */}
          <div className='mb-8 space-y-3'>
            {fontSources.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.07, ease: easeExpoOut }}
                className='flex items-center gap-3'>
                <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-content2'>
                  <Icon icon={s.icon} className='h-4 w-4 text-primary' />
                </div>
                <div>
                  <p className='text-sm font-semibold text-foreground'>{s.label}</p>
                  <p className='text-xs text-default-400'>{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Font badges */}
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

        {/* ── Showcase (left) ── */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1, ease: easeExpoOut }}
          className='w-full lg:w-1/2'>
          <div className='flex flex-col gap-3'>

            {/* Font specimen strip */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.1, ease: easeExpoOut }}
              className='grid grid-cols-4 divide-x divide-default-200/60 overflow-hidden rounded-xl bg-content2'>
              {showcaseFonts.map((f, i) => (
                <motion.div
                  key={f.name}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.12 + i * 0.05, ease: easeExpoOut }}
                  className={`${f.colBg} flex flex-col items-center justify-center gap-1.5 py-5`}>
                  <span className={`${f.font} ${f.weight} text-3xl leading-none ${f.letterColor}`}>{f.sample}</span>
                  <span className='font-label text-[9px] font-medium text-default-400'>{f.name}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Bottom row: Thai + Custom side by side */}
            <div className='grid grid-cols-2 gap-3'>

              {/* Thai Font Support */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3, ease: easeExpoOut }}
                className='overflow-hidden rounded-xl bg-content2'>
                <div className='flex items-center gap-2 border-b border-default-200/60 px-3 py-2'>
                  <Icon icon='lucide:languages' className='h-3 w-3 text-secondary' />
                  <span className='text-[11px] font-bold text-foreground'>Thai Fonts</span>
                </div>
                <div className='divide-y divide-default-200/50'>
                  {thaiFontSamples.map((f, i) => (
                    <motion.div
                      key={f.name}
                      initial={{ opacity: 0, x: -6 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.25, delay: 0.35 + i * 0.06, ease: easeExpoOut }}
                      className='flex items-center justify-between px-3 py-2'>
                      <span className={`${f.font} ${f.weight} text-base leading-none text-foreground`}>{f.word}</span>
                      <span className='font-label text-[8px] uppercase tracking-wider text-default-400'>{f.name}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Custom Fonts */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.35, ease: easeExpoOut }}
                className='overflow-hidden rounded-xl bg-content2'>
                <div className='flex items-center gap-2 border-b border-default-200/60 px-3 py-2'>
                  <Icon icon='lucide:upload' className='h-3 w-3 text-primary' />
                  <span className='text-[11px] font-bold text-foreground'>Custom Fonts</span>
                  <span className='ml-auto font-label text-[8px] text-default-400'>WOFF2</span>
                </div>
                <div className='space-y-1 p-2'>
                  {customFontFiles.map((f, i) => (
                    <motion.div
                      key={f.name}
                      initial={{ opacity: 0, x: -6 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.25, delay: 0.4 + i * 0.06, ease: easeExpoOut }}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${f.active ? 'bg-primary/5' : 'opacity-40'}`}>
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${f.active ? 'border-primary/20 bg-primary/8 text-primary' : 'border-default-200 bg-content3 text-default-400'}`}>
                        <span className={f.font}>{f.preview}</span>
                      </div>
                      <p className={`min-w-0 flex-1 truncate text-[10px] font-medium ${f.active ? 'text-foreground' : 'text-default-400'}`}>
                        {f.name}
                      </p>
                      {f.active && (
                        <div className='flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-success'>
                          <Icon icon='lucide:check' className='h-2 w-2 text-white' />
                        </div>
                      )}
                    </motion.div>
                  ))}
                  <div className='flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-default-200 py-2'>
                    <Icon icon='lucide:plus' className='h-3 w-3 text-default-300' />
                    <span className='text-[10px] text-default-300'>Drop to upload</span>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </motion.div>

      </div>
    </div>
  </section>
)

export default GoogleFontsSection
