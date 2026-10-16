'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'
import { PLAN_ROWS } from '@/components/docs/plans'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] as const }
}

const Cell = ({ value }: { value: boolean | string }) => {
  if (value === true) return <Icon icon='lucide:check' aria-label='Included' className='mx-auto h-4 w-4 text-success' />
  if (value === false)
    return <Icon icon='lucide:minus' aria-label='Not included' className='mx-auto h-4 w-4 text-default-300' />
  return <span className='text-sm font-medium text-foreground'>{value}</span>
}

// Below sm the feature name spans the full row and Free / Pro sit side by side underneath it.
const ROW_GRID = 'grid grid-cols-2 sm:grid-cols-3'

const SelfhostPlanSection = () => (
  <section id='free-vs-pro' className='scroll-mt-20 border-t border-default-200 py-16'>
    <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
      <motion.div {...fadeUp} className='mb-10'>
        <h2 className='mb-2 text-2xl font-bold text-foreground'>Free vs Pro</h2>
        <p className='text-default-600'>
          Run the document API on your own infrastructure. Pro adds PDF security, async renders with webhooks, ZIP
          output, project export &amp; import and more template versions — a one-time licence, validated offline.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.5, delay: 0.1 }}
        className='overflow-hidden rounded-xl border border-default-200'>
        {/* Header */}
        <div className={`${ROW_GRID} border-b border-default-200 bg-content1`}>
          <div className='hidden px-5 py-4 text-sm font-semibold text-default-600 sm:block'>Feature</div>
          <div className='px-5 py-4 text-center text-sm font-semibold text-foreground sm:border-l sm:border-default-200'>
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
        {PLAN_ROWS.map((row, i) => (
          <div
            key={row.feature}
            className={`${ROW_GRID} border-b border-default-200 last:border-b-0 ${i % 2 === 1 ? 'bg-content1/50' : ''}`}>
            <div className='col-span-2 px-5 pb-1 pt-3.5 text-sm text-default-700 sm:col-span-1 sm:py-3.5'>
              {row.feature}
            </div>
            <div className='flex items-center justify-center px-5 pb-3.5 pt-1 sm:border-l sm:border-default-200 sm:py-3.5'>
              <Cell value={row.free} />
            </div>
            <div className='flex items-center justify-center border-l border-default-200 bg-primary/5 px-5 pb-3.5 pt-1 sm:py-3.5'>
              <Cell value={row.pro} />
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  </section>
)

export default SelfhostPlanSection
