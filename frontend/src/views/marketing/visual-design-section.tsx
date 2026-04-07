'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useRef, useState, useEffect, useCallback } from 'react'

interface LineData {
  sx: number
  sy: number
  ex: number
  ey: number
  elbowX: number
  dotX: number
  dotY: number
}

const CODE_SNIPPET = `{
  "templateKey": "invoice-q4",
  "replace": {
    "customer": "Acme Corp",
    "invoice_no": "INV-0042",
    "total": "฿12,500"
  },
  "table": {
    "items": [
      { "name": "Service A", "qty": 2 }
    ]
  },
  "image": { "logo": "base64..." }
}`

const FEATURES = ['Auto-detect variables on upload', 'Visual field mapping interface', 'Copy-ready API snippet']

const VisualDesignSection = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const screenshotRef = useRef<HTMLDivElement>(null)
  const codeRef = useRef<HTMLDivElement>(null)
  const [lines, setLines] = useState<LineData[]>([])
  const [copied, setCopied] = useState(false)

  const calculateLines = useCallback(() => {
    const container = containerRef.current
    const list = listRef.current
    const screenshot = screenshotRef.current
    const code = codeRef.current
    if (!container || !list || !screenshot || !code) return

    const mobile = window.innerWidth < 1024
    const cRect = container.getBoundingClientRect()
    const sRect = screenshot.getBoundingClientRect()
    const codeRect = code.getBoundingClientRect()
    const textSpans = list.querySelectorAll('[data-line-anchor]')

    // Column boundary: lines only go vertical in the right half
    const colBoundary = cRect.width * (mobile ? 0.52 : 0.5)

    const newLines: LineData[] = []
    textSpans.forEach((span, i) => {
      const spanRect = span.getBoundingClientRect()
      const dotX = spanRect.right - cRect.left + 8
      const sy = spanRect.top - cRect.top + spanRect.height / 2

      let ex: number, ey: number

      if (i === 0) {
        ex = sRect.left - cRect.left + sRect.width * (mobile ? 0.3 : 0.25)
        ey = sRect.top - cRect.top + sRect.height * (mobile ? 0.3 : 0.45)
      } else if (i === 1) {
        ex = sRect.left - cRect.left + sRect.width * (mobile ? 0.5 : 0.4)
        ey = sRect.top - cRect.top + sRect.height * (mobile ? 0.55 : 0.72)
      } else {
        ex = codeRect.left - cRect.left + (mobile ? codeRect.width * 0.3 : 0)
        ey = codeRect.top - cRect.top + codeRect.height / 2
      }

      // elbowX is at colBoundary — all vertical movement stays in right column
      const elbowX = colBoundary + i * 12

      newLines.push({ sx: dotX, sy, ex, ey, elbowX, dotX, dotY: sy })
    })
    setLines(newLines)
  }, [])

  useEffect(() => {
    const timer = setTimeout(calculateLines, 500)
    window.addEventListener('resize', calculateLines)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', calculateLines)
    }
  }, [calculateLines])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CODE_SNIPPET)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error: any) {
      // silently fail
    }
  }, [])

  return (
    <section className='bg-content1 py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div ref={containerRef} className='relative'>
          {/* SVG connection lines */}
          {lines.length > 0 && (
            <svg
              className='pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible'
              style={{ width: '100%', height: '100%' }}>
              {lines.map((l, i) => {
                const r = 8
                const dy = l.ey - l.sy
                const dirY = dy > 0 ? 1 : -1
                const dx2 = l.ex - l.elbowX
                const dirX2 = dx2 > 0 ? 1 : -1
                const absR = Math.min(r, Math.abs(dy) / 2, Math.abs(dx2) / 2)

                const path = [
                  `M ${l.sx} ${l.sy}`,
                  `L ${l.elbowX - absR} ${l.sy}`,
                  `Q ${l.elbowX} ${l.sy} ${l.elbowX} ${l.sy + dirY * absR}`,
                  `L ${l.elbowX} ${l.ey - dirY * absR}`,
                  `Q ${l.elbowX} ${l.ey} ${l.elbowX + dirX2 * absR} ${l.ey}`,
                  `L ${l.ex} ${l.ey}`
                ].join(' ')

                return (
                  <motion.path
                    key={`line-${l.sy}`}
                    d={path}
                    stroke='var(--line-accent)'
                    strokeWidth='2'
                    strokeOpacity={0.8 - i * 0.05}
                    fill='none'
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.5 + i * 0.15 }}
                  />
                )
              })}
              {lines.map((l, i) => (
                <motion.circle
                  key={`ds-${l.sy}`}
                  cx={l.dotX}
                  cy={l.dotY}
                  r='4'
                  fill='var(--line-accent)'
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.12 }}
                />
              ))}
              {lines.map((l, i) => (
                <motion.circle
                  key={`de-${l.ey}`}
                  cx={l.ex}
                  cy={l.ey}
                  r='4'
                  fill='var(--line-accent)'
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
                />
              ))}
            </svg>
          )}

          <div className='flex flex-col items-center gap-16 lg:flex-row'>
            {/* Text (Left) */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className='relative z-40 lg:w-1/2'>
              <div className='mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary'>
                <Icon icon='lucide:layout-dashboard' className='h-4 w-4' /> Template Manager
              </div>
              <h2 className='mb-6 font-headline text-3xl font-bold leading-tight md:text-4xl'>
                <span className='text-foreground'>Manage templates visually,</span> <br />
                <span className='text-primary'>map variables automatically.</span>
              </h2>
              <p className='mb-8 text-lg leading-relaxed text-default-600'>
                Upload your .docx template and Qorstack Report auto-detects every variable tag. Map fields visually in
                the dashboard, then copy the ready-to-use API payload — no guesswork, no manual typing.
              </p>
              <ul ref={listRef} className='space-y-4'>
                {FEATURES.map(item => (
                  <li key={item} className='flex items-center text-default-700'>
                    <Icon icon='lucide:check-circle' className='mr-3 h-5 w-5 shrink-0 text-primary' />
                    <span data-line-anchor=''>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Graphic (Right) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className='relative z-10 mt-12 w-full lg:mt-0 lg:w-1/2'>
              <div ref={screenshotRef} className='overflow-hidden rounded-xl ring-1 ring-default-300/20'>
                <Image
                  src='/images/screen-short/builder-ui-variable.png'
                  alt='Template Manager UI showing auto variable mapping'
                  width={800}
                  height={600}
                  className='h-auto w-full'
                  onLoad={calculateLines}
                />
              </div>

              {/* Code snippet with copy */}
              <motion.div
                ref={codeRef}
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className='absolute -bottom-5 -right-2 z-30 w-[190px] overflow-hidden rounded-lg bg-white ring-1 ring-default-200/60 dark:bg-content2 dark:ring-default-300/20 sm:-bottom-6 sm:-right-3 sm:w-[210px]'>
                <div className='flex items-center justify-between border-b border-default-200 px-2.5 py-1.5'>
                  <div className='flex items-center gap-1.5'>
                    <Icon icon='lucide:braces' className='h-2.5 w-2.5 text-success' />
                    <span className='font-label text-[8px] font-bold text-default-500'>Payload Example</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1 rounded px-1.5 py-0.5 font-label text-[8px] font-bold transition-colors hover:bg-content2 ${copied ? 'text-success' : 'text-default-500'}`}>
                    <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} className='h-2 w-2' />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className='px-2.5 py-2'>
                  <pre className='font-mono text-[9px] leading-[1.5] text-default-700'>
                    {'{\n'}
                    {'  '}
                    <span className='text-secondary'>{'"templateKey"'}</span>
                    <span className='text-default-500'>{': '}</span>
                    <span className='text-success'>{'"invoice-q4"'}</span>
                    {',\n'}
                    {'  '}
                    <span className='text-secondary'>{'"replace"'}</span>
                    <span className='text-default-500'>{': {'}</span>
                    {'\n'}
                    {'    '}
                    <span className='text-secondary'>{'"customer"'}</span>
                    <span className='text-default-500'>{': '}</span>
                    <span className='text-success'>{'"Acme Corp"'}</span>
                    {',\n'}
                    {'    '}
                    <span className='text-secondary'>{'"total"'}</span>
                    <span className='text-default-500'>{': '}</span>
                    <span className='text-success'>{'"฿12,500"'}</span>
                    {'\n'}
                    {'  '}
                    <span className='text-default-500'>{'}'}</span>
                    {',\n'}
                    {'  '}
                    <span className='text-secondary'>{'"table"'}</span>
                    <span className='text-default-500'>{': '}</span>
                    <span className='text-warning'>{'[...]'}</span>
                    {',\n'}
                    {'  '}
                    <span className='text-secondary'>{'"image"'}</span>
                    <span className='text-default-500'>{': { '}</span>
                    <span className='text-success'>{'...'}</span>
                    <span className='text-default-500'>{' }'}</span>
                    {'\n}'}
                  </pre>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default VisualDesignSection
