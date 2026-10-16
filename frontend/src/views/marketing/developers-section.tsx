import type { JSX } from 'react'
import { CodeTabs } from '@/components/landing/CodeTabs'
import { Reveal } from '@/components/landing/Reveal'
import { Red, SectionHeader, Wrap } from './landing-ui'

const POINTS: { key: string; title: string; body: string }[] = [
  { key: 'A', title: 'Plain REST', body: 'One endpoint per format and an API key. Works from any language.' },
  { key: 'B', title: 'Typed SDKs', body: 'Node.js and .NET clients generated from the OpenAPI spec.' },
  { key: 'C', title: 'MCP server', body: 'AI agents list templates and render PDFs or spreadsheets on their own.' },
  { key: 'D', title: 'Copy-ready code', body: 'Every template shows the exact request to send.' }
]

const DevelopersSection = (): JSX.Element => (
  <section id='developers' className='scroll-mt-[68px] border-b border-divider py-[120px]'>
    <Wrap>
      <SectionHeader
        no='03'
        label='Developers'
        title={
          <>
            One request. <Red>Any</Red> stack.
          </>
        }
      />
      <div className='grid grid-cols-1 items-start gap-14 min-[980px]:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]'>
        <Reveal>
          <ul className='border-t border-default-300'>
            {POINTS.map(point => (
              <li key={point.key} className='grid grid-cols-[44px_1fr] gap-2 border-b border-default-300 py-5'>
                <span className='pt-[3px] font-mono text-[12px] text-primary' aria-hidden='true'>
                  {point.key}
                </span>
                <div>
                  <b className="block text-[18px] font-bold uppercase [font-variation-settings:'wdth'_86]">{point.title}</b>
                  <span className='mt-1 block text-default-500'>{point.body}</span>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal>
          <CodeTabs />
        </Reveal>
      </div>
    </Wrap>
  </section>
)

export default DevelopersSection
