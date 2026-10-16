import type { JSX } from 'react'
import { GITHUB_URL } from '@/components/landing/constants'
import { Reveal } from '@/components/landing/Reveal'
import { ButtonLink, Red, Wrap } from './landing-ui'

const CtaSection = (): JSX.Element => (
  <section id='start' className='relative overflow-hidden border-b border-divider'>
    <div className='pointer-events-none absolute inset-0' aria-hidden='true'>
      <div className='lp-grid lp-grid-radial' />
    </div>
    <Wrap className='relative py-[140px]'>
      <Reveal>
        <h2 className='press-display text-[clamp(64px,12vw,190px)] leading-[.86]'>
          First PDF
          <br />
          in <Red>10 min.</Red>
        </h2>
        <div className='mt-11 flex flex-wrap items-center justify-between gap-7 border-t border-default-300 pt-8'>
          <p className='text-[19px] text-default-500'>
            Clone the repo ·{' '}
            <code className='border border-default-300 bg-content2 px-2 py-[3px] font-mono text-[15px] text-foreground'>
              bash init.sh
            </code>{' '}
            ·{' '}
            <code className='border border-default-300 bg-content2 px-2 py-[3px] font-mono text-[15px] text-foreground'>
              docker compose up -d
            </code>{' '}
            · upload a .docx or .xlsx template
          </p>
          <ButtonLink href={GITHUB_URL} external size='lg' arrow>
            Deploy with Docker
          </ButtonLink>
        </div>
      </Reveal>
    </Wrap>
  </section>
)

export default CtaSection
