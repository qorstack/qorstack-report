import type { JSX, ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Barcode } from './Barcode'
import { GITHUB_URL, formatMoney, toNumber } from './constants'
import { LOW_AMOUNT, draftTotal, lineAmount, type PlaygroundDraft } from './playground-model'
import { QrCode } from './QrCode'

export type HitTarget = 'first' | 'second' | 'total' | null

interface PreviewProps {
  draft: PlaygroundDraft
  hit: HitTarget
}

export const PAPER_CLASS =
  'relative flex flex-col gap-2.5 bg-[#FFFFFF] font-sans text-[11px] text-[#141414] shadow-[0_24px_48px_-20px_rgba(20,20,20,.35)] ring-1 ring-[#E4E4E7] dark:shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)] dark:ring-0'
export const PAPER_META = 'text-[9.5px] leading-normal text-[#63636B]'

const bind = (active: boolean): string => cn('transition-colors duration-[400ms]', active && 'lp-hit')

export const InvoicePreview = ({ draft, hit }: PreviewProps): JSX.Element => (
  <>
    <div className='flex justify-between gap-2.5 border-b-2 border-[#141414] pb-2.5'>
      <div>
        <div className='flex items-center gap-[7px] text-[12px] font-extrabold uppercase tracking-[0.04em]'>
          <i className='block h-3 w-3 bg-primary' />
          Your Company
        </div>
        <div className={PAPER_META}>123 Sukhumvit Rd, Bangkok</div>
      </div>
      <div className='text-right'>
        <div className='text-[22px] font-black uppercase leading-none tracking-[-0.01em] [font-variation-settings:"wdth"_75]'>
          Invoice
        </div>
        <div className={cn(PAPER_META, 'font-mono')}>
          No. <span className={bind(hit === 'second')}>{draft.second || '—'}</span>
        </div>
      </div>
    </div>
    <div className={PAPER_META}>
      BILL TO
      <br />
      <b className={cn('text-[12px] text-[#141414]', bind(hit === 'first'))}>{draft.first || '—'}</b>
    </div>
    <table className='w-full border-collapse text-[10.5px]'>
      <thead>
        <tr className='border-b border-[#E4E4E7] font-mono text-[8.5px] uppercase tracking-[0.1em] text-[#63636B]'>
          <th className='py-[5px] text-left font-medium'>Item</th>
          <th className='py-[5px] text-right font-medium'>Qty</th>
          <th className='py-[5px] text-right font-medium'>Amount</th>
        </tr>
      </thead>
      <tbody>
        {draft.rows.map(row => (
          <tr key={row.id} className='border-b border-[#E4E4E7]'>
            <td className='py-[5px]'>{row.name || '—'}</td>
            <td className='py-[5px] text-right'>{toNumber(row.qty)}</td>
            <td className='py-[5px] text-right font-mono'>{formatMoney(lineAmount(row))}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className='flex items-baseline justify-between bg-[#141414] px-[9px] py-[7px] font-bold text-[#FFFFFF]'>
      <span>TOTAL THB</span>
      <b className={cn('font-mono text-[15px]', bind(hit === 'total'))}>{formatMoney(draftTotal(draft))}</b>
    </div>
    <div className='mt-1 flex items-end justify-between gap-3'>
      <div>
        <QrCode text={GITHUB_URL} className='block h-16 w-16' label='QR code linking to the Qorstack Report GitHub repository' />
        <div className='mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#63636B]'>Scan me</div>
      </div>
      <Barcode />
    </div>
  </>
)

const COLUMNS = ['A', 'B', 'C', 'D'] as const
const GRID = 'grid grid-cols-[20px_minmax(0,1fr)_34px_48px_64px]'
const CELL = 'border-b border-r border-[#E4E4E7] px-1 py-[3px] truncate'
const HEAD_CELL = 'border-b border-r border-[#D4D4D8] bg-[#EDEDF0] py-[2px] text-center font-mono text-[8.5px] text-[#63636B]'

interface SheetRowProps {
  n: number
  children: ReactNode
  className?: string
}

const SheetRow = ({ n, children, className }: SheetRowProps): JSX.Element => (
  <div className={cn(GRID, className)} role='row'>
    <div className={HEAD_CELL} role='rowheader'>
      {n}
    </div>
    {children}
  </div>
)

export const SheetPreview = ({ draft, hit }: PreviewProps): JSX.Element => {
  const firstDataRow = 4
  const lastDataRow = firstDataRow + Math.max(draft.rows.length, 1) - 1
  const totalRow = firstDataRow + draft.rows.length
  const formula = draft.rows.length ? `=SUM(D${firstDataRow}:D${lastDataRow})` : '=0'

  return (
    <>
      <div className='-mx-1 flex items-center border border-[#D4D4D8] bg-white font-mono text-[9.5px]'>
        <span className='border-r border-[#D4D4D8] px-2 py-1 text-[#63636B]'>D{totalRow}</span>
        <span className='border-r border-[#D4D4D8] px-2 py-1 italic text-[#63636B]'>fx</span>
        <span className='truncate px-2 py-1'>{formula}</span>
      </div>
      <div className='-mx-1 border-l border-t border-[#D4D4D8] text-[10px]' role='grid' aria-label='Spreadsheet preview'>
        <div className={GRID} role='row'>
          <div className={HEAD_CELL} />
          {COLUMNS.map(col => (
            <div key={col} className={HEAD_CELL} role='columnheader'>
              {col}
            </div>
          ))}
        </div>
        <SheetRow n={1}>
          <div className={cn(CELL, 'col-span-4 text-[12px] font-black uppercase [font-variation-settings:"wdth"_80]')} role='gridcell'>
            Sales report · <span className={bind(hit === 'first')}>{draft.first || '—'}</span>
          </div>
        </SheetRow>
        <SheetRow n={2}>
          <div className={cn(CELL, 'col-span-4 text-[#63636B]')} role='gridcell'>
            Prepared by <span className={bind(hit === 'second')}>{draft.second || '—'}</span>
          </div>
        </SheetRow>
        <SheetRow n={3} className='bg-[#141414] font-mono text-[8.5px] uppercase tracking-[0.06em] text-[#FFFFFF]'>
          <div className={cn(CELL, 'border-[#33312F]')} role='columnheader'>
            Product
          </div>
          <div className={cn(CELL, 'border-[#33312F] text-right')} role='columnheader'>
            Units
          </div>
          <div className={cn(CELL, 'border-[#33312F] text-right')} role='columnheader'>
            Price
          </div>
          <div className={cn(CELL, 'border-[#33312F] text-right')} role='columnheader'>
            Amount
          </div>
        </SheetRow>
        {draft.rows.map((row, i) => {
          const amount = lineAmount(row)
          const low = amount < LOW_AMOUNT
          return (
            <SheetRow key={row.id} n={firstDataRow + i}>
              <div className={CELL} role='gridcell'>
                {row.name || '—'}
              </div>
              <div className={cn(CELL, 'text-right font-mono')} role='gridcell'>
                {toNumber(row.qty)}
              </div>
              <div className={cn(CELL, 'text-right font-mono')} role='gridcell'>
                {formatMoney(toNumber(row.price))}
              </div>
              <div
                className={cn(CELL, 'text-right font-mono', low && 'bg-[#FDE7E5] font-bold text-primary')}
                role='gridcell'
                aria-label={low ? `${formatMoney(amount)} (below ${LOW_AMOUNT})` : undefined}>
                {formatMoney(amount)}
              </div>
            </SheetRow>
          )
        })}
        <SheetRow n={totalRow} className='font-bold'>
          <div className={cn(CELL, 'border-t-2 border-t-[#141414]')} role='gridcell'>
            TOTAL
          </div>
          <div className={cn(CELL, 'border-t-2 border-t-[#141414]')} role='gridcell' />
          <div className={cn(CELL, 'border-t-2 border-t-[#141414]')} role='gridcell' />
          <div
            className={cn(
              CELL,
              'border-t-2 border-t-[#141414] text-right font-mono outline outline-2 -outline-offset-2 outline-primary',
              bind(hit === 'total')
            )}
            role='gridcell'>
            {formatMoney(draftTotal(draft))}
          </div>
        </SheetRow>
        <SheetRow n={totalRow + 1}>
          {COLUMNS.map(col => (
            <div key={col} className={cn(CELL, 'h-[19px]')} role='gridcell' />
          ))}
        </SheetRow>
      </div>
      <div className='-mx-1 -mb-1 flex items-stretch border-t border-[#D4D4D8] font-mono text-[9px]'>
        <span className='border-r border-[#D4D4D8] bg-white px-2.5 py-1 font-bold text-[#141414] shadow-[inset_0_2px_0_#F2271C]'>
          Sales · Q1
        </span>
        <span className='border-r border-[#D4D4D8] px-2.5 py-1 text-[#63636B]'>Summary</span>
        <span className='px-2 py-1 text-[#63636B]' aria-hidden='true'>
          +
        </span>
        <span className='ml-auto px-1 py-1 text-[#63636B]'>#,##0.00</span>
      </div>
    </>
  )
}
