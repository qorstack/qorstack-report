'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'

interface ComparisonRow {
  feature: string
  headless: string
  enterprise: string
  conventional: string
  qorstack: string
}

const comparisonFeatures: ComparisonRow[] = [
  {
    feature: 'Template Format',
    headless: '⚠️ HTML / CSS',
    enterprise: '✅ Word, XML',
    conventional: '✅ Word, Excel',
    qorstack: '✅ Word (.docx)'
  },
  {
    feature: 'Code Integration',
    headless: '❌ Untyped HTML injection',
    enterprise: '✅ Strongly Typed (Java)',
    conventional: '⚠️ Untyped JSON / fetch',
    qorstack: '✅ Fully-Typed SDK (qorstack-sdk)'
  },
  {
    feature: 'Variable Mapping',
    headless: '❌ Manual setup',
    enterprise: '⚠️ Manual / SDK checks',
    conventional: '❌ Guess the JSON keys',
    qorstack: '✅ Auto-extracted via Web UI'
  },
  {
    feature: 'Visual Designer',
    headless: '❌ Code editor only',
    enterprise: '✅ Desktop App',
    conventional: '✅ Web Studio',
    qorstack: '✅ Modern Web Dashboard'
  },
  {
    feature: 'Live Testing',
    headless: '❌ Write scripts & wait',
    enterprise: '✅ Desktop Preview',
    conventional: '⚠️ Web (JSON Editor)',
    qorstack: '✅ Auto-generated UI Forms'
  },
  {
    feature: 'Font Management',
    headless: '⚠️ OS-level config',
    enterprise: '⚠️ Server/OS config',
    conventional: '⚠️ Docker/OS config',
    qorstack: '✅ Pre-bundled + UI Upload'
  },
  {
    feature: 'Price',
    headless: '✅ Free (Open Source)',
    enterprise: '❌ Commercial ($1,000+)',
    conventional: '✅ OSS Core + Cloud API',
    qorstack: '✅ OSS Core + Cloud API'
  }
]

const competitors = [
  { key: 'headless' as const, name: 'Headless Browsers', subtitle: 'Puppeteer', highlight: false },
  { key: 'enterprise' as const, name: 'Enterprise Suites', subtitle: 'Aspose, Jasper', highlight: false },
  { key: 'conventional' as const, name: 'Conventional APIs', subtitle: 'Carbone.io', highlight: false },
  { key: 'qorstack' as const, name: 'Type-Safe Infrastructure', subtitle: 'Qorstack', highlight: true }
]

const getStatusStyle = (value: string): string => {
  if (value.startsWith('✅')) return 'text-success bg-success/10'
  if (value.startsWith('⚠️')) return 'text-warning bg-warning/10'
  if (value.startsWith('❌')) return 'text-danger bg-danger/10'
  return 'text-default-600'
}

const CompCellValue = ({ value, isQorstack }: { value: string; isQorstack?: boolean }) => {
  const statusStyle = getStatusStyle(value)
  const displayValue = value.replace(/^(✅|⚠️|❌)\s?/, '')

  return (
    <div className={`flex items-start gap-1.5 ${isQorstack ? 'font-medium' : ''}`}>
      <span className={`mt-0.5 shrink-0 rounded px-1 py-0.5 text-[10px] font-bold leading-none ${statusStyle}`}>
        {value.startsWith('✅') ? '✓' : value.startsWith('⚠️') ? '~' : '✕'}
      </span>
      <span className={`text-[12px] leading-snug ${isQorstack ? 'text-foreground' : 'text-default-500'}`}>
        {displayValue}
      </span>
    </div>
  )
}

const ComparisonSection = () => (
  <section className='bg-background py-24'>
    <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className='mb-12 max-w-2xl'>
        <span className='mb-3 block font-label text-[11px] font-bold uppercase tracking-widest text-primary'>
          Fact-Based Comparison
        </span>
        <h2 className='mb-3 font-headline text-[clamp(1.5rem,3vw,2.5rem)] font-bold leading-tight text-foreground'>
          Built for performance.
        </h2>
        <p className='text-base text-default-600'>
          Every approach has trade-offs. Here&apos;s an honest, side-by-side look at how different document generation
          categories stack up.
        </p>
      </motion.div>

      {/* Desktop Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className='hidden overflow-x-auto md:block'>
        <table className='w-full text-left text-[13px]'>
          <thead>
            <tr className='border-b-2 border-default-300'>
              <th className='pb-4 pr-6 font-label text-[11px] font-bold uppercase tracking-wider text-default-500'>
                Feature
              </th>
              {competitors.map(c => (
                <th
                  key={c.key}
                  className={`pb-4 text-center ${c.highlight ? 'relative' : ''}`}
                  style={c.highlight ? { padding: '0' } : undefined}>
                  {c.highlight ? (
                    <div className='rounded-t-lg bg-primary px-4 pb-4 pt-3'>
                      <span className='flex items-center justify-center gap-1.5 font-label text-[11px] font-bold uppercase tracking-wider text-primary-foreground'>
                        <Icon icon='lucide:zap' className='h-3 w-3' />
                        {c.subtitle}
                      </span>
                      <span className='mt-0.5 block text-[9px] text-primary-foreground/60'>{c.name}</span>
                    </div>
                  ) : (
                    <div className='px-3'>
                      <span className='block font-label text-[11px] font-bold uppercase tracking-wider text-default-500'>
                        {c.subtitle}
                      </span>
                      <span className='mt-0.5 block text-[9px] text-default-400'>{c.name}</span>
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonFeatures.map((row, i) => (
              <tr key={row.feature} className={`border-b border-default-200 ${i % 2 === 0 ? '' : 'bg-content1/50'}`}>
                <td className='py-3.5 pr-6 text-[13px] font-medium text-default-700'>{row.feature}</td>
                {competitors.map(c => (
                  <td key={c.key} className={`px-3 py-3.5 ${c.highlight ? 'bg-primary/5' : ''}`}>
                    <CompCellValue value={row[c.key]} isQorstack={c.highlight} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className='mt-6 text-[11px] text-default-400'>
          Data as of March 2026. Comparison reflects general category capabilities, not specific product versions.
        </p>
      </motion.div>

      {/* Mobile Cards */}
      <div className='space-y-3 md:hidden'>
        {competitors
          .filter(c => !c.highlight)
          .map((comp, ci) => (
            <motion.div
              key={comp.key}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: ci * 0.06 }}
              className='rounded-lg border border-default-300 bg-content2'>
              <div className='border-b border-default-200 px-4 py-2.5'>
                <p className='font-label text-[11px] font-bold uppercase tracking-wider text-default-500'>
                  Qorstack vs {comp.subtitle}
                </p>
                <p className='text-[9px] text-default-400'>{comp.name}</p>
              </div>
              <div className='divide-y divide-default-100'>
                {comparisonFeatures.map(row => (
                  <div key={row.feature} className='px-4 py-3'>
                    <span className='mb-2 block font-label text-[11px] font-bold text-default-600'>{row.feature}</span>
                    <div className='flex flex-col gap-1.5'>
                      <div className='flex items-center gap-2'>
                        <span className='w-14 shrink-0 text-[9px] font-bold uppercase text-primary'>Qorstack</span>
                        <CompCellValue value={row.qorstack} isQorstack />
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='w-14 shrink-0 text-[9px] font-bold uppercase text-default-400'>
                          {comp.subtitle}
                        </span>
                        <CompCellValue value={row[comp.key]} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
      </div>
    </div>
  </section>
)

export default ComparisonSection
