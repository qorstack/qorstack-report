'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] as const }
}

interface PlanRow {
  feature: string
  free: boolean | string
  pro: boolean | string
}

const rows: PlanRow[] = [
  { feature: 'PDF & Excel generation', free: true, pro: true },
  { feature: 'REST API access', free: true, pro: true },
  { feature: 'Unlimited projects', free: true, pro: true },
  { feature: 'Google Fonts + custom font upload', free: true, pro: true },
  { feature: 'QR code & barcode support', free: true, pro: true },
  { feature: 'Auto-detected template variables', free: true, pro: true },
  { feature: 'Template versions per template', free: '1', pro: '10' },
  { feature: 'PDF Password Protection', free: false, pro: true },
  { feature: 'PDF Watermark', free: false, pro: true },
  { feature: 'Project Members', free: true, pro: true },
  { feature: 'License', free: 'MIT', pro: 'Commercial' },
]

const Cell = ({ value }: { value: boolean | string }) => {
  if (value === true) return <Icon icon='lucide:check' className='mx-auto h-4 w-4 text-success' />
  if (value === false) return <Icon icon='lucide:minus' className='mx-auto h-4 w-4 text-default-300' />
  return <span className='text-sm font-medium text-foreground'>{value}</span>
}

const SelfhostPlanSection = () => (
  <section className='border-t border-default-200 py-16'>
    <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
      <motion.div {...fadeUp} className='mb-10'>
        <h2 className='mb-2 text-2xl font-bold text-foreground'>Free vs Pro</h2>
        <p className='text-default-600'>
          All features are available on self-hosted instances. Pro adds versioning, PDF security, and team collaboration.
        </p>
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className='overflow-hidden rounded-xl border border-default-200'>
        {/* Header */}
        <div className='grid grid-cols-3 border-b border-default-200 bg-content1'>
          <div className='px-5 py-4 text-sm font-semibold text-default-600'>Feature</div>
          <div className='border-l border-default-200 px-5 py-4 text-center text-sm font-semibold text-foreground'>
            Free
            <span className='ml-2 rounded bg-default-100 px-1.5 py-0.5 font-label text-[9px] font-bold uppercase tracking-wider text-default-500'>
              MIT
            </span>
          </div>
          <div className='border-l border-default-200 bg-primary/5 px-5 py-4 text-center text-sm font-bold text-primary'>
            Pro
            <span className='ml-2 rounded bg-primary/10 px-1.5 py-0.5 font-label text-[9px] font-bold uppercase tracking-wider text-primary'>
              License
            </span>
          </div>
        </div>

        {/* Rows */}
        {rows.map((row, i) => (
          <div
            key={row.feature}
            className={`grid grid-cols-3 border-b border-default-200 last:border-b-0 ${i % 2 === 1 ? 'bg-content1/50' : ''}`}>
            <div className='px-5 py-3.5 text-sm text-default-700'>{row.feature}</div>
            <div className='flex items-center justify-center border-l border-default-200 px-5 py-3.5'>
              <Cell value={row.free} />
            </div>
            <div className='flex items-center justify-center border-l border-default-200 bg-primary/5 px-5 py-3.5'>
              <Cell value={row.pro} />
            </div>
          </div>
        ))}
      </motion.div>


    </div>
  </section>
)

export default SelfhostPlanSection
