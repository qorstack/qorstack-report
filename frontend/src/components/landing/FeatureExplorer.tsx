'use client'

import { useEffect, useState, type FocusEvent, type JSX, type ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { GITHUB_URL } from './constants'
import { useInView, useReducedMotion } from './hooks'
import { PAPER_CLASS, PAPER_META } from './PlaygroundPreview'
import { QrCode } from './QrCode'

type ZoneId = 'text' | 'table' | 'image' | 'qr' | 'font' | 'totals' | 'sheets'
type StageKind = 'doc' | 'sheet'

interface Feature {
  zone: ZoneId
  stage: StageKind
  title: string
  body: string
  badge?: string
}

const FEATURES: Feature[] = [
  { zone: 'text', stage: 'doc', title: 'Text fields', body: 'Names, dates and totals anywhere — headers and footers too.' },
  { zone: 'table', stage: 'doc', title: 'Repeating tables', body: 'Rows from data with sorting, grouping, merged cells and repeated headers.' },
  { zone: 'image', stage: 'doc', title: 'Images & signatures', body: 'Logos, signatures and photos from a URL or base64, sized to fit.' },
  { zone: 'qr', stage: 'doc', title: 'QR & barcodes', body: 'Payment QR, tracking and product barcodes generated at render time.' },
  { zone: 'font', stage: 'doc', title: 'Thai & custom fonts', body: 'Upload TH Sarabun or your brand font — the PDF matches the template.' },
  {
    zone: 'totals',
    stage: 'sheet',
    title: 'Excel totals & formats',
    body: 'SUM rows, number formats like #,##0.00 and conditional colours — set from JSON.',
    badge: 'XLSX'
  },
  {
    zone: 'sheets',
    stage: 'sheet',
    title: 'One sheet per group',
    body: 'Split rows into a sheet per region or customer, copied from your template sheet.',
    badge: 'XLSX'
  }
]

const CYCLE_MS = 4000

interface ZoneProps {
  id: ZoneId
  lit: ZoneId
  tag: string
  className?: string
  children: ReactNode
}

const Zone = ({ id, lit, tag, className, children }: ZoneProps): JSX.Element => (
  <div className={cn('lp-zone', id === lit && 'is-lit', className)}>
    <span className='lp-ztag bg-primary px-1.5 py-0.5 font-mono text-[9.5px] text-white' aria-hidden='true'>
      {tag}
    </span>
    {children}
  </div>
)

const DocStage = ({ lit }: { lit: ZoneId }): JSX.Element => (
  <article className={cn(PAPER_CLASS, 'w-full max-w-[380px] px-5 pb-4 pt-5 text-[11.5px]')} aria-label='Sample invoice'>
    <div className='flex justify-between gap-2.5 border-b-2 border-[#141414] pb-2.5'>
      <Zone id='image' lit={lit} tag='{{image:logo}}'>
        <div className='flex items-center gap-[7px] text-[13px] font-extrabold uppercase tracking-[0.04em]'>
          <i className='block h-4 w-4 bg-primary' />
          Siam Logistics
        </div>
        <div className={PAPER_META}>Bangkok 10110</div>
      </Zone>
      <Zone id='font' lit={lit} tag='TH SARABUN' className='text-right'>
        <div lang='th' className='font-thai text-[20px] font-semibold leading-none'>
          ใบแจ้งหนี้
        </div>
        <div className={PAPER_META}>INVOICE</div>
      </Zone>
    </div>
    <Zone id='text' lit={lit} tag='{{customer}}'>
      <div className={PAPER_META}>
        BILL TO
        <br />
        <b className='text-[12px] text-[#141414]'>Bangkok Trading Co.</b>
        <br />
        Due 30 Nov 2026
      </div>
    </Zone>
    <Zone id='table' lit={lit} tag='{{row:*}}'>
      <table className='w-full border-collapse text-[10.5px]'>
        <thead>
          <tr className='border-b border-[#E4E4E7] font-mono text-[8.5px] uppercase tracking-[0.1em] text-[#63636B]'>
            <th className='py-[5px] text-left font-medium'>Service</th>
            <th className='py-[5px] text-right font-medium'>Qty</th>
            <th className='py-[5px] text-right font-medium'>Amount</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Express delivery', '12', '4,800.00'],
            ['Warehousing', '1', '9,500.00'],
            ['Insurance', '1', '1,200.00']
          ].map(([name, qty, amount]) => (
            <tr key={name} className='border-b border-[#E4E4E7]'>
              <td className='py-[5px]'>{name}</td>
              <td className='py-[5px] text-right'>{qty}</td>
              <td className='py-[5px] text-right font-mono'>{amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Zone>
    <div className='flex items-baseline justify-between bg-[#141414] px-[9px] py-[7px] font-bold text-[#FFFFFF]'>
      <span>TOTAL THB</span>
      <b className='font-mono text-[15px]'>15,500.00</b>
    </div>
    <div className='mt-1 flex items-end justify-between gap-3'>
      <Zone id='qr' lit={lit} tag='{{qr:payment}}'>
        <QrCode
          text={`${GITHUB_URL}#readme`}
          className='block h-16 w-16'
          label='QR code linking to the Qorstack Report readme'
        />
      </Zone>
      <Zone id='image' lit={lit} tag='{{image:signature}}' className='text-right'>
        <span className='inline-block -rotate-[5deg] text-[20px] font-light italic text-[#1F2C66] [font-variation-settings:"wdth"_125]'>
          K. Somchai
        </span>
        <div className={PAPER_META}>AUTHORISED SIGNATURE</div>
      </Zone>
    </div>
  </article>
)

const SHEET_ROWS: [string, string, string, boolean][] = [
  ['North', 'Somchai', '48,200.00', false],
  ['North', 'Anan', '12,900.00', false],
  ['North', 'Malee', '950.00', true]
]
const SHEET_GRID = 'grid grid-cols-[22px_minmax(0,1fr)_minmax(0,1fr)_88px]'
const SHEET_CELL = 'truncate border-b border-r border-[#E4E4E7] px-1.5 py-1'
const SHEET_HEAD = 'border-b border-r border-[#D4D4D8] bg-[#EDEDF0] py-0.5 text-center font-mono text-[9px] text-[#63636B]'

const SheetStage = ({ lit }: { lit: ZoneId }): JSX.Element => (
  <article className={cn(PAPER_CLASS, 'w-full max-w-[380px] gap-0 p-0 text-[11px]')} aria-label='Sample spreadsheet'>
    <div className='border-b border-[#D4D4D8] px-3 py-2.5'>
      <div className='text-[14px] font-black uppercase [font-variation-settings:"wdth"_80]'>Sales by region</div>
      <div className={PAPER_META}>sales-2026.xlsx · generated from JSON</div>
    </div>
    <div className={SHEET_GRID}>
      <div className={SHEET_HEAD} />
      {['A', 'B', 'C'].map(c => (
        <div key={c} className={SHEET_HEAD}>
          {c}
        </div>
      ))}
    </div>
    <div className={cn(SHEET_GRID, 'bg-[#141414] font-mono text-[9px] uppercase tracking-[0.06em] text-[#FFFFFF]')}>
      <div className={SHEET_HEAD}>1</div>
      <div className={cn(SHEET_CELL, 'border-[#33312F]')}>Region</div>
      <div className={cn(SHEET_CELL, 'border-[#33312F]')}>Rep</div>
      <div className={cn(SHEET_CELL, 'border-[#33312F] text-right')}>Amount</div>
    </div>
    {SHEET_ROWS.map(([region, rep, amount, low], i) => (
      <div key={rep} className={SHEET_GRID}>
        <div className={SHEET_HEAD}>{i + 2}</div>
        <div className={SHEET_CELL}>{region}</div>
        <div className={SHEET_CELL}>{rep}</div>
        <div className={cn(SHEET_CELL, 'text-right font-mono', low && 'bg-[#FDE7E5] font-bold text-primary')}>{amount}</div>
      </div>
    ))}
    <Zone id='totals' lit={lit} tag='generateTotals · #,##0.00'>
      <div className={cn(SHEET_GRID, 'font-bold')}>
        <div className={SHEET_HEAD}>5</div>
        <div className={cn(SHEET_CELL, 'border-t-2 border-t-[#141414]')}>TOTAL</div>
        <div className={cn(SHEET_CELL, 'border-t-2 border-t-[#141414]')} />
        <div className={cn(SHEET_CELL, 'border-t-2 border-t-[#141414] text-right font-mono')}>62,050.00</div>
      </div>
    </Zone>
    <div className={SHEET_GRID}>
      <div className={SHEET_HEAD}>6</div>
      <div className={cn(SHEET_CELL, 'col-span-3 font-mono text-[9.5px] text-[#63636B]')}>=SUM(C2:C4)</div>
    </div>
    <div className='h-10' />
    <Zone id='sheets' lit={lit} tag='splitToSheets · region'>
      <div className='flex border-t border-[#D4D4D8] font-mono text-[10px]'>
        <span className='border-r border-[#D4D4D8] bg-white px-3 py-1.5 font-bold shadow-[inset_0_2px_0_#F2271C]'>North</span>
        <span className='border-r border-[#D4D4D8] px-3 py-1.5 text-[#63636B]'>South</span>
        <span className='border-r border-[#D4D4D8] px-3 py-1.5 text-[#63636B]'>East</span>
        <span className='px-3 py-1.5 text-[#63636B]'>West</span>
      </div>
    </Zone>
  </article>
)

/** 02 list that cycles through features and lights the matching zone on a sample document or sheet. */
export const FeatureExplorer = (): JSX.Element => {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduce = useReducedMotion()
  const [ref, inView] = useInView<HTMLDivElement>()
  const running = inView && !paused && !reduce

  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => setActive(a => (a + 1) % FEATURES.length), CYCLE_MS)
    return () => clearTimeout(t)
  }, [active, running])

  const pick = (i: number): void => {
    setPaused(true)
    setActive(i)
  }

  const resumeOnBlur = (e: FocusEvent<HTMLDivElement>): void => {
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return
    setPaused(false)
  }

  const feature = FEATURES[active]

  return (
    <div ref={ref} className='grid border border-default-300 min-[980px]:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]'>
      <div
        className='border-b border-default-300 min-[980px]:border-b-0 min-[980px]:border-r'
        onMouseLeave={() => setPaused(false)}
        onBlur={resumeOnBlur}>
        {FEATURES.map((f, i) => {
          const isActive = i === active
          return (
            <button
              key={f.title}
              type='button'
              aria-pressed={isActive}
              aria-controls='fx-stage'
              onMouseEnter={() => pick(i)}
              onFocus={() => pick(i)}
              onClick={() => pick(i)}
              className={cn(
                'relative grid w-full grid-cols-[56px_1fr_24px] items-center gap-x-2.5 border-b border-default-300 px-6 py-6 text-left transition-colors last:border-b-0 hover:bg-content2 focus-visible:outline-offset-[-2px]',
                isActive && 'bg-content2'
              )}>
              <span className={cn('font-mono text-[12px]', isActive ? 'text-primary' : 'text-default-400')}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className='flex items-center gap-2.5'>
                <span className='text-[22px] font-extrabold uppercase leading-tight [font-variation-settings:"wdth"_82]'>
                  {f.title}
                </span>
                {f.badge && (
                  <span className='border border-success px-1.5 py-px font-mono text-[11px] tracking-[0.08em] text-success'>
                    {f.badge}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'transition-[transform,color] duration-200',
                  isActive ? 'translate-x-1 text-primary' : 'text-default-400'
                )}
                aria-hidden='true'>
                →
              </span>
              <span
                className={cn(
                  'col-start-2 col-end-4 overflow-hidden text-[15px] text-default-500 transition-[max-height,margin] duration-300',
                  isActive ? 'mt-1.5 max-h-20' : 'max-h-0'
                )}>
                {f.body}
              </span>
              {isActive && (
                <span
                  key={`${active}-${running}`}
                  className={cn('lp-prog absolute inset-y-0 left-0 w-[3px] bg-primary', running ? 'is-running' : 'is-full')}
                  aria-hidden='true'
                />
              )}
            </button>
          )
        })}
      </div>
      <div
        id='fx-stage'
        aria-live='polite'
        className='lp-stage-glow lp-stage-focus relative grid min-h-[560px] place-items-center px-4 py-14 sm:px-8'>
        <p className='sr-only'>Highlighted: {feature.title}</p>
        {feature.stage === 'doc' ? <DocStage lit={feature.zone} /> : <SheetStage lit={feature.zone} />}
      </div>
    </div>
  )
}

export default FeatureExplorer
