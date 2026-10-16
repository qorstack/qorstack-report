'use client'

import React, { Fragment, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Icon from '@/components/icon'
import { getInstallCommand, getInitClient, getRequestExamples } from '@/components/docs/examples'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { CodeSwitcher, useSharedLanguage, LanguageSelector } from '@/components/docs/CodeSwitcher'
import { FeatureCard, PropertyTable, SubSection } from '@/components/docs/DocComponents'
import {
  VariablesContent,
  TablesBasicContent,
  TablesAdvancedContent,
  ImagesContent,
  QrCodesContent,
  BarcodesContent,
  FileSettingsContent
} from '@/components/docs/DocContents'
import DocLayout, { SidebarGroup, TocItem } from '@/components/docs/DocLayout'
import { PRICING_HREF } from '@/components/landing/constants'

// --- Constants ---
// Docs show the self-host default; the API lives under /api on the same port as the web UI.
const API_BASE_URL = 'http://localhost:8080/api'

// --- Types ---
type Endpoint = 'template'

// --- Sidebar Config ---
const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    title: 'Getting Started',
    icon: 'solar:rocket-linear',
    items: [
      { id: 'quick-start', label: 'Quick start', icon: 'solar:play-linear' },
      { id: 'overview', label: 'Overview', icon: 'solar:home-2-linear' },
      { id: 'integration', label: 'Integration & SDKs', icon: 'solar:plug-circle-linear' }
    ]
  },
  {
    title: 'Template Features',
    icon: 'solar:document-text-linear',
    items: [
      { id: 'variables', label: 'Variables', icon: 'solar:text-field-linear' },
      { id: 'tables', label: 'Tables', icon: 'solar:widget-linear' },
      { id: 'tables-advanced', label: 'Tables (Advanced)', icon: 'solar:widget-5-linear' },
      { id: 'images', label: 'Images', icon: 'solar:gallery-linear' },
      { id: 'qrcodes', label: 'QR Codes', icon: 'solar:qr-code-linear' },
      { id: 'barcodes', label: 'Barcodes', icon: 'solar:scanner-linear' },
      { id: 'file-settings', label: 'File Settings', icon: 'solar:settings-linear' }
    ]
  },
  {
    title: 'Help',
    icon: 'solar:question-circle-linear',
    items: [{ id: 'fonts', label: 'Fonts & troubleshooting', icon: 'solar:text-linear' }]
  }
]

const ALL_SECTION_IDS = SIDEBAR_GROUPS.flatMap(g => g.items.map(i => i.id))

// --- TOC Config (right sidebar) ---
const TOC_ITEMS: TocItem[] = [
  { id: 'quick-start', label: 'Quick start' },
  { id: 'overview', label: 'Overview' },
  { id: 'integration', label: 'Integration & SDKs' },
  { id: 'integration-setup', section: 'integration', label: 'REST API & SDKs', indent: true },
  { id: 'integration-request', section: 'integration', label: 'Request Example', indent: true },
  { id: 'integration-async', section: 'integration', label: 'Async & webhooks', indent: true },
  { id: 'integration-transfer', section: 'integration', label: 'Project export & import', indent: true },
  { id: 'variables', label: 'Variables' },
  { id: 'tables', label: 'Tables' },
  { id: 'tables-advanced', label: 'Tables (Advanced)' },
  { id: 'tables-grouping', section: 'tables-advanced', label: 'Grouping', indent: true },
  { id: 'tables-aggregates', section: 'tables-advanced', label: 'Aggregates', indent: true },
  { id: 'images', label: 'Images' },
  { id: 'qrcodes', label: 'QR Codes' },
  { id: 'barcodes', label: 'Barcodes' },
  { id: 'file-settings', label: 'File Settings' },
  { id: 'fonts', label: 'Fonts & troubleshooting' },
  { id: 'fonts-thai', section: 'fonts', label: 'Thai fonts', indent: true },
  { id: 'fonts-missing', section: 'fonts', label: 'Missing or wrong font', indent: true }
]

// Smallest request that works: one template key + one text field.
const QUICK_START_CURL = `curl -X POST ${API_BASE_URL}/render/word/template \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "templateKey": "YOUR_TEMPLATE_KEY",
    "replace": [{ "key": "customer", "value": "Siam Tech Co., Ltd." }]
  }'`

const QUICK_START_RESPONSE = `{
  "jobId": "6f1c2a8e-…",
  "downloadUrl": "${API_BASE_URL}/files/eyJ…",
  "expiresIn": 3600,
  "status": "success",
  "fileType": "pdf"
}`

const ASYNC_RESPONSE_EXAMPLE = `{
  "jobId": "6f1c2a8e-…",
  "status": "pending",
  "statusUrl": "/render/jobs/6f1c2a8e-…"
}`

// --- Section animation variants ---
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

const sectionNumber = (id: string): string => {
  const index = ALL_SECTION_IDS.indexOf(id)
  return `${String(index + 1).padStart(2, '0')}`
}

/** Display title with the last word in brand red. */
const AccentTitle = ({ text }: { text: string }) => {
  const words = text.split(' ')
  const last = words.pop()
  return (
    <>
      {words.length > 0 && `${words.join(' ')} `}
      <span className='text-primary'>{last}</span>
    </>
  )
}

// --- Section Wrapper ---
const Section = ({
  title,
  id,
  children,
  delay = 0
}: {
  title: string
  id: string
  /** Kept for call-site compatibility; the  number replaces the icon tile. */
  icon?: string
  children: React.ReactNode
  delay?: number
}) => (
  <motion.section
    id={id}
    aria-labelledby={`${id}-title`}
    variants={sectionVariants}
    initial='hidden'
    whileInView='visible'
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.5, delay, ease: [0.25, 1, 0.5, 1] }}
    className='scroll-mt-24 border-b border-divider pb-16 last:border-0'>
    <div className='mb-4 inline-block border-t-2 border-primary pr-6 pt-2 font-mono text-[12px] uppercase tracking-[0.16em] text-default-500'>
      <b className='font-bold text-primary'>{sectionNumber(id)}</b> — {title}
    </div>
    <h2 id={`${id}-title`} className='press-display mb-6 text-[clamp(2rem,1.5rem+1.8vw,3rem)] text-foreground'>
      <AccentTitle text={title} />
    </h2>
    {children}
  </motion.section>
)

// --- Info Callout ---
const InfoCallout = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className='my-6 border border-l-[3px] border-divider border-l-primary bg-content1 p-4'>
    <div className='flex items-start gap-3'>
      <Icon icon='lucide:info' aria-hidden='true' className='mt-0.5 h-4 w-4 shrink-0 text-primary' />
      <div>
        <h4 className='font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-foreground'>{title}</h4>
        <div className='mt-1.5 text-[14px] leading-relaxed text-default-600'>{children}</div>
      </div>
    </div>
  </div>
)

const PackageCard = ({ name, note }: { name: string; note: string }) => (
  <div className='mb-4 flex items-center gap-3 border border-divider bg-content1 p-4'>
    <Icon icon='lucide:package' aria-hidden='true' className='h-5 w-5 shrink-0 text-default-500' />
    <div>
      <p className='text-[14px] font-medium text-foreground'>
        Package: <code className='font-mono text-[13px] text-primary-600 dark:text-[#FFB4AC]'>{name}</code>
      </p>
      <p className='text-[13px] text-default-500'>{note}</p>
    </div>
  </div>
)

// --- Main Page ---
const DocumentationPage = () => {
  const [activeSection, setActiveSection] = useState('overview')
  const [activeLang, setActiveLang] = useSharedLanguage('api')
  const activeEndpoint: Endpoint = 'template'

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160

      for (const id of ALL_SECTION_IDS) {
        const element = document.getElementById(id)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(id)
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const y = element.getBoundingClientRect().top + window.pageYOffset - 80
      window.scrollTo({ top: y, behavior: 'smooth' })
      // A TOC sub-item keeps its parent section active, so the right-hand TOC stays visible.
      setActiveSection(TOC_ITEMS.find(item => item.id === id)?.section ?? id)
    }
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <Fragment>
      <DocLayout
        sidebarGroups={SIDEBAR_GROUPS}
        tocItems={TOC_ITEMS}
        activeSection={activeSection}
        onNavigate={scrollToSection}>
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
          className='mb-12'>
          <p className='press-label mb-4'>Documentation</p>
          <h1 className='press-display mb-5 text-[clamp(2.25rem,1.6rem+2.4vw,3.5rem)] text-foreground'>
            Qorstack Report <span className='text-primary'>docs</span>
          </h1>
          <p className='max-w-[65ch] text-[15px] leading-relaxed text-default-500 sm:text-[16px]'>
            Design DOCX or XLSX templates, send JSON, get your document. This guide covers every template feature from
            simple variable replacement to tables, images, QR codes, barcodes, PDF security, and ZIP output.
          </p>
        </motion.div>

        {/* Content Sections */}
        <div className='flex flex-col gap-16'>
          {/* ===== QUICK START ===== */}
          <Section id='quick-start' title='Quick start' icon='solar:play-bold'>
            <ol className='mb-6 flex max-w-[65ch] list-decimal flex-col gap-2 pl-5 text-[15px] leading-relaxed text-default-500'>
              <li>
                In a Word file, type placeholders such as <code className='font-mono text-foreground'>{'{{customer}}'}</code>
                , then upload it on <b className='font-semibold text-foreground'>Templates → New template</b>.
              </li>
              <li>
                Copy the template key (template header) and the project API key (<b className='font-semibold text-foreground'>API key</b> page).
              </li>
              <li>Send the request below. The response contains a download link to the generated PDF.</li>
            </ol>
            <CodeBlock language='bash' code={QUICK_START_CURL} title='Request' />
            <CodeBlock language='json' code={QUICK_START_RESPONSE} title='Response' />
            <p className='max-w-[65ch] text-[14px] leading-relaxed text-default-500'>
              Everything else — tables, images, QR codes, Excel output, async jobs — is optional and described below.
            </p>
          </Section>

          {/* ===== OVERVIEW ===== */}
          <Section id='overview' title='Overview' icon='solar:document-text-bold'>
            <p className='mb-6 max-w-[65ch] text-[15px] leading-relaxed text-default-500'>
              Qorstack Report Service generates PDF, DOCX, and Excel documents from Word (.docx) and Excel (.xlsx)
              templates. Instead of maintaining complex layout code, you design templates visually, upload them, and
              send a simple JSON payload to generate the final file.
            </p>

            <InfoCallout title='Self-hosted'>
              Qorstack Report runs on your own servers: templates, JSON payloads and generated files stay in your
              PostgreSQL and S3 storage and are never sent to Qorstack. Temporary downloads are deleted after one day.
            </InfoCallout>

            {/* Generation Method */}
            <div className='crop mb-10 border border-default-300 bg-content1'>
              <span className='crop-cm' />
              <div className='flex items-center justify-between gap-4 border-b border-divider px-5 py-4'>
                <div>
                  <h3 className='text-[16px] font-bold uppercase tracking-[0.01em] text-foreground'>
                    Template-based generation
                  </h3>
                  <p className='mt-0.5 text-[13px] text-default-500'>
                    Recurring reports, batch generation, and self-host integrations
                  </p>
                </div>
                <span className='border border-primary px-2 py-0.5 font-mono text-[12px] font-bold tracking-[0.1em] text-primary'>
                  POST
                </span>
              </div>

              <div className='p-5'>
                <p className='mb-5 max-w-[60ch] text-[14px] leading-relaxed text-default-500'>
                  Use a pre-uploaded DOCX or XLSX template stored in your project. Reference the template by key and
                  send JSON data to render the final document.
                </p>

                <div className='dark mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 border border-divider bg-[#050505] px-3 py-2.5 font-mono text-[13px]'>
                  <span className='text-primary'>POST</span>
                  <code className='text-foreground'>/render/word/template</code>
                  <span className='text-default-500'>or</span>
                  <code className='text-foreground'>/render/excel/template</code>
                </div>

                <div className='grid border-l border-t border-divider sm:grid-cols-2'>
                  <div className='border-b border-r border-divider p-3'>
                    <p className='font-mono text-[11px] uppercase tracking-[0.14em] text-default-500'>Auth header</p>
                    <code className='mt-1 block font-mono text-[13px] font-semibold text-primary-600 dark:text-[#FFB4AC]'>X-API-Key</code>
                  </div>
                  <div className='border-b border-r border-divider p-3'>
                    <p className='font-mono text-[11px] uppercase tracking-[0.14em] text-default-500'>Key field</p>
                    <code className='mt-1 block font-mono text-[13px] font-semibold text-primary-600 dark:text-[#FFB4AC]'>templateKey</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              <FeatureCard
                icon='solar:text-field-outline'
                title='Variables'
                description='Replace placeholders with actual text data like customer names or dates.'
                onClick={() => scrollToSection('variables')}
              />
              <FeatureCard
                icon='solar:widget-linear'
                title='Tables'
                description='Automatically generate tables from array data with dynamic rows.'
                onClick={() => scrollToSection('tables')}
              />
              <FeatureCard
                icon='solar:gallery-outline'
                title='Images'
                description='Insert images from Base64 or URLs with custom sizing.'
                onClick={() => scrollToSection('images')}
              />
              <FeatureCard
                icon='solar:qr-code-outline'
                title='QR Codes'
                description='Generate QR codes on the fly for payments or links.'
                onClick={() => scrollToSection('qrcodes')}
              />
              <FeatureCard
                icon='solar:scanner-outline'
                title='Barcodes'
                description='Generate barcodes on the fly for product tracking.'
                onClick={() => scrollToSection('barcodes')}
              />
              <FeatureCard
                icon='solar:settings-outline'
                title='File Settings'
                description='Protect PDFs, apply watermarks, and package output as ZIP.'
                onClick={() => scrollToSection('file-settings')}
              />
            </div>
          </Section>

          {/* ===== INTEGRATION & SDKs ===== */}
          <Section id='integration' title='Integration & SDKs' icon='solar:plug-circle-bold' delay={0.05}>
            <p className='mb-6 max-w-[65ch] text-[15px] leading-relaxed text-default-500'>
              Choose your preferred integration method. We provide official SDKs for Node.js and .NET, or you can use
              the REST API directly with any HTTP client.
            </p>

            {/* Language Selector */}
            <div id='integration-setup' className='mb-6 scroll-mt-24'>
              <LanguageSelector activeLang={activeLang} onLangChange={setActiveLang} />
            </div>

            {/* SDK: Node.js */}
            {['nodejs', 'ts', 'javascript'].includes(activeLang) && (
              <SubSection
                title={
                  <div className='flex items-center gap-2'>
                    <Icon icon='logos:nodejs-icon' className='text-lg' />
                    <span>Node.js / TypeScript SDK</span>
                  </div>
                }>
                <PackageCard
                  name='qorstack-report-sdk'
                  note='Works with React, Next.js, Express, and any Node.js project'
                />
                <CodeBlock language='bash' code={getInstallCommand('ts')} title='Install' />
                <p className='mt-4 text-[14px] text-default-500'>Initialize the client:</p>
                <CodeBlock language='typescript' code={getInitClient('ts')} title='Setup' />
                <InfoCallout title='TypeScript Support'>
                  The SDK includes full TypeScript type definitions out of the box. No additional{' '}
                  <code className='border border-divider bg-content2 px-1.5 py-0.5 font-mono text-[12px] text-primary-600 dark:text-[#FFB4AC]'>
                    @types
                  </code>{' '}
                  packages needed.
                </InfoCallout>
              </SubSection>
            )}

            {/* SDK: .NET */}
            {['csharp', 'dotnet'].includes(activeLang) && (
              <SubSection
                title={
                  <div className='flex items-center gap-2'>
                    <Icon icon='logos:dotnet' className='text-lg' />
                    <span>.NET / C# SDK</span>
                  </div>
                }>
                <PackageCard
                  name='Qorstack.Report.Sdk'
                  note='Works with ASP.NET Core, Blazor, WPF, and any .NET project'
                />
                <CodeBlock language='bash' code={getInstallCommand('csharp')} title='Install' />
                <p className='mt-4 text-[14px] text-default-500'>Initialize the client:</p>
                <CodeBlock language='csharp' code={getInitClient('csharp')} title='Setup' />
              </SubSection>
            )}

            {/* REST API */}
            {['api', 'curl', 'json', 'go', 'python', 'java', 'php', 'rust', 'other'].includes(activeLang) && (
              <SubSection
                title={
                  <div className='flex items-center gap-2'>
                    <Icon icon='logos:postman-icon' className='text-lg' />
                    <span>REST API / Raw HTTP</span>
                  </div>
                }>
                <p className='mb-4 text-[14px] text-default-500'>No installation required. Use any HTTP client.</p>
                <dl className='mb-6 grid border-l border-t border-divider text-[14px]'>
                  <div className='flex flex-col gap-1 border-b border-r border-divider p-4 sm:flex-row sm:items-center sm:gap-4'>
                    <dt className='w-28 shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-default-500'>
                      API URL
                    </dt>
                    <dd className='break-all font-mono text-[13px] text-foreground'>
                      {API_BASE_URL}/render/word/template
                    </dd>
                  </div>
                  <div className='flex flex-col gap-1 border-b border-r border-divider p-4 sm:flex-row sm:items-center sm:gap-4'>
                    <dt className='w-28 shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-default-500'>
                      Header
                    </dt>
                    <dd className='text-default-600'>
                      Include <code className='font-mono text-[13px] text-primary-600 dark:text-[#FFB4AC]'>X-API-Key</code> in your request
                      headers.
                    </dd>
                  </div>
                </dl>
              </SubSection>
            )}

            <SubSection id='integration-request' title='Request Example'>
              <PropertyTable
                data={[
                  {
                    name: 'templateKey',
                    type: 'string',
                    required: true,
                    desc: 'Template identifier for the uploaded DOCX/XLSX template.'
                  },
                  {
                    name: 'templateVersion',
                    type: 'integer',
                    required: false,
                    desc: 'Render an older stored version of the template (see its version history). Omit for the current version; an unknown version returns 404.'
                  },
                  {
                    name: 'fileName',
                    type: 'string',
                    required: false,
                    desc: 'Output PDF filename (default: "output").'
                  },
                  {
                    name: 'replace',
                    type: 'KeyValueRequest[]',
                    required: false,
                    desc: 'Text variable replacements: [{ "key": "customer_name", "value": "ACME" }]. The v1 object-map form was removed in v2.0 (returns 400).'
                  },
                  {
                    name: 'table',
                    type: 'array',
                    required: false,
                    desc: 'Dynamic table data (TableDataRequest[]): list the column names once in columns, then each row as an array of values in that order, e.g. { "columns": ["item", "qty"], "rows": [["A", 2]] }.'
                  },
                  {
                    name: 'image',
                    type: 'ImageDataRequest[]',
                    required: false,
                    desc: 'Image insertion data, one item per {{image:key}}.'
                  },
                  {
                    name: 'qrcode',
                    type: 'QrCodeDataRequest[]',
                    required: false,
                    desc: 'QR code generation data, one item per key.'
                  },
                  {
                    name: 'barcode',
                    type: 'BarcodeDataRequest[]',
                    required: false,
                    desc: 'Barcode generation data, one item per key.'
                  },
                  {
                    name: 'pdfPassword',
                    type: 'object',
                    required: false,
                    desc: 'PDF password and permission options.'
                  },
                  { name: 'watermark', type: 'object', required: false, desc: 'PDF text watermark options.' },
                  {
                    name: 'zipOutput',
                    type: 'boolean',
                    required: false,
                    desc: 'Return the generated output as a ZIP file.'
                  },
                  {
                    name: 'async',
                    type: 'boolean',
                    required: false,
                    desc: 'Pro. Queue the render and get 202 + jobId instead of the file. Poll GET /render/jobs/{jobId}.'
                  },
                  {
                    name: 'webhookUrl',
                    type: 'string',
                    required: false,
                    desc: 'With async: true. Receives a POST { jobId, status, downloadUrl?, error? } when the job finishes.'
                  }
                ]}
              />
              <CodeSwitcher
                activeLang={activeLang}
                onLangChange={setActiveLang}
                title='Full Request'
                examples={getRequestExamples(activeEndpoint)}
                isDisableMarginY={true}
              />
            </SubSection>

            <SubSection id='integration-async' title='Async jobs & webhooks'>
              <p className='mb-4 text-[15px] leading-relaxed text-default-500'>
                <b className='font-semibold text-foreground'>Async (Pro).</b> Add <code>&quot;async&quot;: true</code> to
                get <code>202</code> with a <code>jobId</code> right away. Poll <code>GET /render/jobs/{'{jobId}'}</code> until
                the status is <code>success</code> (it then includes a fresh <code>downloadUrl</code>) or pass a{' '}
                <code>webhookUrl</code>. Jobs are stored in PostgreSQL, so they survive restarts and several backend
                instances can share the queue; temporary errors (database, network, Gotenberg) are retried up to 3 times.
              </p>
              <CodeBlock language='json' title='202 Accepted' code={ASYNC_RESPONSE_EXAMPLE} />
              <p className='my-4 text-[15px] leading-relaxed text-default-500'>
                <b className='font-semibold text-foreground'>Webhooks</b> are signed with{' '}
                <code>X-Qorstack-Signature: sha256=&lt;HMAC of the body&gt;</code> when the server sets{' '}
                <code>WEBHOOK_SIGNING_SECRET</code>, retried 3 times, and never sent to private or internal addresses.
              </p>
            </SubSection>

            <SubSection id='integration-transfer' title='Project export & import'>
              <p className='mb-4 text-[15px] leading-relaxed text-default-500'>
                <b className='font-semibold text-foreground'>Pro.</b> Move a whole project to another deployment, e.g.
                staging → production: <b className='font-semibold text-foreground'>Project settings → Export &amp; import</b>.
                Export gives one .zip with the current version of every template, its test data and images, and your
                uploaded fonts (no API keys, members or history). Import shows a preview first, then creates new templates
                with the same key and adds newer versions; anything already up to date is skipped. API:{' '}
                <code>GET /projects/{'{id}'}/export</code> and <code>POST /projects/{'{id}'}/import?dryRun=true</code>{' '}
                (multipart <code>file</code>).
              </p>
            </SubSection>
          </Section>

          {/* ===== VARIABLES ===== */}
          <Section id='variables' title='Variable Replacement' icon='solar:text-field-bold' delay={0.05}>
            <VariablesContent />
          </Section>

          {/* ===== TABLES (Basic) ===== */}
          <Section id='tables' title='Tables' icon='solar:widget-bold' delay={0.05}>
            <TablesBasicContent />
          </Section>

          {/* ===== TABLES (Advanced) ===== */}
          <Section id='tables-advanced' title='Tables (Advanced)' icon='solar:widget-5-bold' delay={0.05}>
            <TablesAdvancedContent />
          </Section>

          {/* ===== IMAGES ===== */}
          <Section id='images' title='Images' icon='solar:gallery-bold' delay={0.05}>
            <ImagesContent />
          </Section>

          {/* ===== QR CODES ===== */}
          <Section id='qrcodes' title='QR Codes' icon='solar:qr-code-bold' delay={0.05}>
            <QrCodesContent />
          </Section>

          {/* ===== BARCODES ===== */}
          <Section id='barcodes' title='Barcodes' icon='solar:scanner-bold' delay={0.05}>
            <BarcodesContent />
          </Section>

          {/* ===== FILE SETTINGS ===== */}
          <Section id='file-settings' title='File Settings' icon='solar:settings-bold' delay={0.05}>
            <FileSettingsContent />
          </Section>

          {/* ===== FONTS & TROUBLESHOOTING ===== */}
          <Section id='fonts' title='Fonts & troubleshooting' icon='solar:text-bold' delay={0.05}>
            <p className='mb-4 max-w-[65ch] text-[15px] leading-relaxed text-default-500'>
              PDFs are rendered on the server, so the server needs every font your template uses. Fonts that come with
              the server are listed as <b className='font-semibold text-foreground'>System</b>; add others on the{' '}
              <b className='font-semibold text-foreground'>Fonts</b> page (.ttf, .otf, .woff, .woff2). Uploaded fonts are
              copied to the renderer within about 30 seconds — the Status column shows <i>Syncing</i> until they are{' '}
              <i>Ready</i>.
            </p>
            <SubSection id='fonts-thai' title='Thai fonts'>
              <p className='mb-4 max-w-[65ch] text-[15px] leading-relaxed text-default-500'>
                Use the exact font your Word file uses — for example TH Sarabun New, Sarabun, or Angsana New. Upload every
                weight you use (Regular, Bold, Italic, Bold Italic); Word fakes bold when a weight is missing, but the PDF
                renderer picks the closest real file, so text can look lighter or wider than in Word.
              </p>
            </SubSection>
            <SubSection id='fonts-missing' title='Missing or wrong font'>
              <ul className='mb-4 flex max-w-[65ch] list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-default-500'>
                <li>
                  <b className='font-semibold text-foreground'>Text appears in a different font</b> — the font is not on the
                  server. Check the font name in Word (Home → Font), upload that family on the Fonts page, wait for
                  <i> Ready</i>, then generate again.
                </li>
                <li>
                  <b className='font-semibold text-foreground'>Thai vowels or tone marks overlap</b> — the fallback font has
                  no Thai shaping. Upload the Thai font the template uses.
                </li>
                <li>
                  <b className='font-semibold text-foreground'>Status shows Problem</b> — the file could not be read or
                  copied. Delete it and upload the original .ttf/.otf again.
                </li>
                <li>
                  <b className='font-semibold text-foreground'>The preview on the Fonts page looks different</b> — that
                  preview uses fonts installed on your own device. Only the generated PDF shows what the server has.
                </li>
              </ul>
            </SubSection>
          </Section>
        </div>

        {/* Page Pagination */}
        <div className='mt-16 flex items-center justify-between border-t border-divider pb-12 pt-8'>
          <button
            type='button'
            onClick={scrollToTop}
            className='group flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.12em] text-default-500 transition-colors hover:text-foreground'>
            <Icon
              icon='lucide:arrow-up'
              aria-hidden='true'
              className='h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5'
            />
            Back to top
          </button>
          <a href={PRICING_HREF} className='group flex flex-col items-end text-right'>
            <span className='mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-default-500'>Next</span>
            <span className='flex items-center gap-1.5 text-[16px] font-bold uppercase tracking-[0.02em] text-foreground transition-colors group-hover:text-primary'>
              Free vs Pro
              <Icon
                icon='lucide:arrow-right'
                aria-hidden='true'
                className='h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5'
              />
            </span>
          </a>
        </div>
      </DocLayout>
    </Fragment>
  )
}

export default DocumentationPage
