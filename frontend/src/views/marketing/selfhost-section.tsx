import type { JSX } from 'react'
import { Reveal } from '@/components/landing/Reveal'
import { Terminal } from '@/components/landing/Terminal'
import { LABEL_CLASS, Red, SectionNumber, Wrap } from './landing-ui'

const FACTS: { label: string; value: string }[] = [
  { label: 'Deploy', value: 'One compose file' },
  { label: 'Storage', value: 'RustFS / any S3' },
  { label: 'Access', value: 'API keys per project' },
  { label: 'Audit', value: 'Generation history' }
]

const SelfhostSection = (): JSX.Element => (
  <section id='selfhost' className='scroll-mt-[68px] border-b border-divider bg-content1'>
    <Wrap className='grid grid-cols-1 items-center gap-14 py-[120px] min-[980px]:grid-cols-2'>
      <Reveal>
        <SectionNumber no='04' label='Self-hosted' className='inline-block pr-6' />
        <h2 className='press-display mt-6 text-[clamp(48px,6.4vw,96px)]'>
          Data stays <Red>inside.</Red>
        </h2>
        <p className='mt-[22px] max-w-[520px] text-[19px] text-default-500'>
          Invoices, contracts, payslips and sales sheets carry customer data. Qorstack runs in your network — no
          third-party rendering service.
        </p>
        <dl className='mt-10 grid grid-cols-2 border-l border-t border-default-300'>
          {FACTS.map(fact => (
            <div key={fact.label} className='border-b border-r border-default-300 px-5 py-[18px]'>
              <dt className={LABEL_CLASS}>{fact.label}</dt>
              <dd className="mt-1.5 text-[18px] font-bold [font-variation-settings:'wdth'_88]">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
      <Reveal>
        <Terminal />
      </Reveal>
    </Wrap>
  </section>
)

export default SelfhostSection
