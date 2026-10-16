import type { JSX } from 'react'
import { PRO_SUMMARY } from '@/components/docs/plans'
import { FaqAccordion, type FaqItem } from '@/components/landing/FaqAccordion'
import { Reveal } from '@/components/landing/Reveal'
import { SectionHeader, Wrap } from './landing-ui'

const FAQ: FaqItem[] = [
  {
    question: 'What do I need to run it?',
    answer:
      'Docker. One compose file starts the app (web UI + API in one container on one port), PostgreSQL, RustFS storage and Gotenberg for PDF conversion.'
  },
  {
    question: 'What template formats does it use?',
    answer:
      'Word (.docx) and Excel (.xlsx). Design the layout in the tools your team already uses, add variables, tables, images, QR codes or barcodes, and the API fills them at runtime.'
  },
  {
    question: 'What can I get back?',
    answer:
      'Word templates render to PDF or DOCX; Excel templates render to XLSX with totals, number formats, conditional colours and one sheet per group. ZIP output is available when a workflow needs bundled files.'
  },
  {
    question: 'Will the PDF match my Word file?',
    answer:
      "Upload the fonts your template uses and the layout follows Word's spacing and line breaks — Thai text included."
  },
  {
    question: 'Can an AI agent generate documents?',
    answer: 'Yes. The bundled MCP server lets agents list templates, render documents and spreadsheets, and check job status.'
  },
  {
    question: 'What does Pro add?',
    answer: `${PRO_SUMMARY} — as a one-time lifetime licence. Everything else is in the free version.`
  }
]

const FaqSection = (): JSX.Element => (
  <section id='faq' className='scroll-mt-[68px] border-b border-divider bg-content1 py-[120px]'>
    <Wrap>
      <SectionHeader no='06' label='FAQ' title='Questions.' />
      <Reveal>
        <FaqAccordion items={FAQ} />
      </Reveal>
    </Wrap>
  </section>
)

export default FaqSection
