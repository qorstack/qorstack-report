import type { JSX } from 'react'
import { PRO_FEATURES, TEMPLATE_VERSIONS } from '@/components/docs/plans'
import { Reveal } from '@/components/landing/Reveal'
import { cn } from '@/utils/cn'
import { ButtonLink, Red, SectionHeader, Wrap } from './landing-ui'

interface Plan {
  label: string
  price: string
  note: string
  features: string[]
  cta: { label: string; href: string }
  pro?: boolean
}

const PLANS: Plan[] = [
  {
    label: 'Open source',
    price: 'Free',
    note: 'MIT-licensed core',
    features: ['Unlimited templates and documents', 'Word → PDF / DOCX, Excel → XLSX', 'SDKs, MCP server, full REST API'],
    cta: { label: 'Deploy with Docker', href: '/self-host' }
  },
  {
    label: 'Pro · lifetime licence',
    price: '$399',
    note: 'One-time payment',
    features: [
      'Everything in Open source',
      ...PRO_FEATURES,
      `${TEMPLATE_VERSIONS.pro} versions per template (Free keeps ${TEMPLATE_VERSIONS.free})`
    ],
    cta: { label: 'Get a Pro licence', href: 'mailto:qorstack@gmail.com?subject=Pro%20License' },
    pro: true
  }
]

const PricingSection = (): JSX.Element => (
  <section id='pricing' className='scroll-mt-[68px] border-b border-divider py-[120px]'>
    <Wrap>
      <SectionHeader
        no='05'
        label='Pricing'
        title={
          <>
            Pay <Red>once.</Red>
            <br />
            Or never.
          </>
        }
        lede='No subscription. No per-document fees.'
      />
      <Reveal>
        <div className='grid border-l border-t border-default-300 min-[860px]:grid-cols-2'>
          {PLANS.map(plan => (
            <div
              key={plan.label}
              className={cn(
                'relative flex flex-col gap-[26px] border-b border-r px-6 py-11 transition-colors duration-300 sm:px-10',
                plan.pro
                  ? 'border-primary bg-primary text-white hover:bg-primary-600'
                  : 'border-default-300 hover:bg-content2'
              )}>
              <span className='font-mono text-[12px] uppercase tracking-[0.16em] opacity-75'>{plan.label}</span>
              <div className="text-[clamp(72px,9vw,128px)] font-black uppercase leading-[.8] [font-variation-settings:'wdth'_66]">
                {plan.price}
                <small className='mt-3.5 block font-mono text-[13px] font-medium uppercase tracking-[0.12em] opacity-80 [font-variation-settings:normal]'>
                  {plan.note}
                </small>
              </div>
              <ul className={cn('lp-plus border-t', plan.pro ? 'border-white/40' : 'border-default-300')}>
                {plan.features.map(feature => (
                  <li
                    key={feature}
                    className={cn(
                      'flex items-baseline gap-3 border-b py-[13px] before:text-primary',
                      plan.pro ? 'border-white/30 before:!text-white' : 'border-default-300'
                    )}>
                    {feature}
                  </li>
                ))}
              </ul>
              <ButtonLink
                href={plan.cta.href}
                variant={plan.pro ? 'white' : 'line'}
                className='mt-auto justify-center'>
                {plan.cta.label}
              </ButtonLink>
            </div>
          ))}
        </div>
      </Reveal>
    </Wrap>
  </section>
)

export default PricingSection
