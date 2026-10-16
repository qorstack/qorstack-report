import type { JSX } from 'react'
import { FeatureExplorer } from '@/components/landing/FeatureExplorer'
import { Reveal } from '@/components/landing/Reveal'
import { Red, SectionHeader, Wrap } from './landing-ui'

const FeaturesSection = (): JSX.Element => (
  <section id='features' className='scroll-mt-[68px] border-b border-divider bg-content1 py-[120px]'>
    <Wrap>
      <SectionHeader
        no='02'
        label='Templates'
        title={
          <>
            Built for <Red>real</Red> paperwork.
          </>
        }
        lede='Invoices, contracts, payslips, sales reports — everything a business document or spreadsheet needs.'
      />
      <Reveal>
        <FeatureExplorer />
      </Reveal>
    </Wrap>
  </section>
)

export default FeaturesSection
