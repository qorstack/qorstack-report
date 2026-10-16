import type { JSX } from 'react'

const ITEMS = [
  'Microsoft Word',
  'Microsoft Excel',
  'Docker',
  'Node.js SDK',
  '.NET SDK',
  'MCP for AI agents',
  'PostgreSQL',
  'MinIO / S3',
  'Thai fonts'
]

const TickerBand = (): JSX.Element => (
  <div className='lp-ticker overflow-hidden border-b border-divider bg-primary text-white'>
    <p className='sr-only'>Works with: {ITEMS.join(', ')}.</p>
    <div className='lp-ticker-track flex w-max' aria-hidden='true'>
      {[...ITEMS, ...ITEMS].map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="inline-flex items-center gap-[22px] whitespace-nowrap px-[22px] py-3.5 text-[18px] font-extrabold uppercase tracking-[0.02em] [font-variation-settings:'wdth'_80] after:ml-[22px] after:block after:h-2 after:w-2 after:bg-white after:content-['']">
          {item}
        </span>
      ))}
    </div>
  </div>
)

export default TickerBand
