import type { JSX } from 'react'
import { Playground } from '@/components/landing/Playground'
import { ButtonLink, LABEL_CLASS, Wrap } from './landing-ui'

const SPECS: { label: string; value: string }[] = [
  { label: 'Licence', value: 'MIT core' },
  { label: 'Output', value: 'PDF · DOCX · XLSX' },
  { label: 'Fonts', value: 'Thai + custom' }
]

const HeroSection = (): JSX.Element => (
  <section id='hero' className='relative overflow-hidden border-b border-divider'>
    <div className='pointer-events-none absolute inset-0' aria-hidden='true'>
      <div className='lp-grid' />
      <div className='lp-scan' />
    </div>

    <Wrap className='relative pb-24 pt-[84px]'>
      <div className='mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-divider pb-5'>
        <div className='flex items-center gap-3.5'>
          <span className='bg-primary px-[9px] py-[5px] font-mono text-[11px] font-bold tracking-[0.16em] text-white'>
            OPEN SOURCE
          </span>
          <span className='press-label'>Self-hosted document API</span>
        </div>
        <div className='hidden items-center gap-5 font-mono text-[11px] tracking-[0.12em] text-default-400 md:flex' aria-hidden='true'>
          <span>.DOCX → .PDF</span>
          <span className='h-3 w-px bg-divider' />
          <span>.XLSX → .XLSX</span>
          <span className='h-3 w-px bg-divider' />
          <span>A4 · 210 × 297 MM</span>
        </div>
      </div>

      <h1 className='press-display text-[clamp(36px,8.6vw,132px)] leading-[.86]'>
        <span className='lp-rise-row'>
          <span>Templates in.</span>
        </span>
        <span className='lp-rise-row whitespace-nowrap'>
          <span>
            <span className='-ml-[.04em] inline-block bg-primary px-[.12em] text-white'>PDF</span> &amp;{' '}
            Excel <span className='text-primary'>out.</span>
          </span>
        </span>
      </h1>

      <div className='mt-12 grid grid-cols-1 items-start gap-14 min-[1080px]:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]'>
        <div>
          <p className='max-w-[520px] text-[clamp(18px,1.6vw,21px)] text-default-500 [font-variation-settings:"wdth"_96]'>
            Design documents in <b className='font-semibold text-foreground'>Word</b> and{' '}
            <b className='font-semibold text-foreground'>Excel</b> templates. Send JSON to one endpoint. Get back a finished{' '}
            <b className='font-semibold text-foreground'>PDF, DOCX or XLSX</b> — rendered on{' '}
            <b className='font-semibold text-foreground'>your own servers</b>.
          </p>
          <div className='mt-8 flex flex-wrap gap-3'>
            <ButtonLink href='/self-host' arrow>
              Deploy with Docker
            </ButtonLink>
            <ButtonLink href='#playground' variant='line'>
              Try it live
            </ButtonLink>
          </div>
          <dl className='mt-10 grid grid-cols-1 border-l border-t border-divider min-[480px]:grid-cols-3'>
            {SPECS.map(spec => (
              <div key={spec.label} className='border-b border-r border-divider px-[18px] py-4'>
                <dt className={LABEL_CLASS}>{spec.label}</dt>
                <dd className='mt-1.5 text-[16px] font-bold [font-variation-settings:"wdth"_90]'>{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Playground />
      </div>
    </Wrap>
  </section>
)

export default HeroSection
