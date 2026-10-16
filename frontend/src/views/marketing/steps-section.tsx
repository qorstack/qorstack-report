import type { JSX } from 'react'
import { Reveal } from '@/components/landing/Reveal'
import { Red, SectionHeader, Wrap } from './landing-ui'

const STEPS: { no: string; title: string; body: string; code: string }[] = [
  {
    no: '01',
    title: 'Upload a template',
    body: 'Mark the blanks in a .docx or .xlsx — text, table rows, images, QR codes.',
    code: 'invoice.docx · sales.xlsx'
  },
  {
    no: '02',
    title: 'Send JSON',
    body: 'One POST with your API key — from your app, a cron job or an AI agent.',
    code: 'POST /render'
  },
  {
    no: '03',
    title: 'Get the file',
    body: 'A download link to the finished PDF, DOCX or XLSX, kept in history for audit.',
    code: 'invoice.pdf · sales.xlsx'
  }
]

const StepsSection = (): JSX.Element => (
  <section id='how' className='scroll-mt-[68px] border-b border-divider py-[120px]'>
    <Wrap>
      <SectionHeader
        no='01'
        label='How it works'
        title={
          <>
            Zero <Red>layout</Red> code.
          </>
        }
        lede='The people who know how the document should look keep editing it in Word or Excel. Your code only sends data.'
      />
      <Reveal>
        <ol className='grid border-l border-t border-default-300 min-[900px]:grid-cols-3'>
          {STEPS.map(step => (
            <li
              key={step.no}
              className="group relative overflow-hidden border-b border-r border-default-300 px-8 pb-8 pt-9 transition-colors duration-300 before:absolute before:left-0 before:top-0 before:h-[3px] before:w-0 before:bg-primary before:transition-[width] before:duration-500 before:content-[''] hover:bg-content2 hover:before:w-full">
              <span
                className="lp-outline-num absolute right-5 top-6 text-[120px] font-black leading-[.8] [font-variation-settings:'wdth'_64]"
                aria-hidden='true'>
                {step.no}
              </span>
              <h3 className="mb-3 mt-16 text-[28px] font-extrabold uppercase tracking-[0.005em] [font-variation-settings:'wdth'_80]">
                {step.title}
              </h3>
              <p className='text-default-500'>{step.body}</p>
              <code className='mt-[22px] inline-block border border-default-300 px-[9px] py-[5px] font-mono text-[12px] text-foreground'>
                {step.code}
              </code>
            </li>
          ))}
        </ol>
      </Reveal>
    </Wrap>
  </section>
)

export default StepsSection
