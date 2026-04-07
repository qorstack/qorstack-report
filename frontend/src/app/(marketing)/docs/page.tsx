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
  BarcodesContent
} from '@/components/docs/DocContents'
import DocLayout, { SidebarGroup, TocItem } from '@/components/docs/DocLayout'

// --- Constants ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.qorstack.dev'

// --- Types ---
type Endpoint = 'template' | 'docx'

// --- Sidebar Config ---
const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    title: 'Getting Started',
    icon: 'solar:rocket-linear',
    items: [
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
      { id: 'tables-advanced', label: 'Tables (Advanced)', icon: 'solar:widget-5-linear', badge: 'PRO' },
      { id: 'images', label: 'Images', icon: 'solar:gallery-linear' },
      { id: 'qrcodes', label: 'QR Codes', icon: 'solar:qr-code-linear' },
      { id: 'barcodes', label: 'Barcodes', icon: 'solar:scanner-linear' }
    ]
  }
]

const ALL_SECTION_IDS = SIDEBAR_GROUPS.flatMap(g => g.items.map(i => i.id))

// --- TOC Config (right sidebar) ---
const TOC_ITEMS: TocItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'integration', label: 'Integration & SDKs' },
  { id: 'integration', label: 'REST API', indent: true },
  { id: 'integration', label: 'Node.js SDK', indent: true },
  { id: 'integration', label: '.NET SDK', indent: true },
  { id: 'integration', label: 'Request Example', indent: true },
  { id: 'variables', label: 'Variables' },
  { id: 'tables', label: 'Tables' },
  { id: 'tables-advanced', label: 'Tables (Advanced)' },
  { id: 'tables-advanced', label: 'Grouping', indent: true },
  { id: 'tables-advanced', label: 'Aggregates', indent: true },
  { id: 'images', label: 'Images' },
  { id: 'qrcodes', label: 'QR Codes' },
  { id: 'barcodes', label: 'Barcodes' }
]

// --- Section animation variants ---
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

// --- Section Wrapper ---
const Section = ({
  title,
  id,
  icon,
  children,
  delay = 0
}: {
  title: string
  id: string
  icon?: string
  children: React.ReactNode
  delay?: number
}) => (
  <motion.section
    id={id}
    variants={sectionVariants}
    initial='hidden'
    whileInView='visible'
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.5, delay, ease: [0.25, 1, 0.5, 1] }}
    className='scroll-mt-20 border-b border-default-200/80 pb-16 last:border-0'>
    <h2 className='mb-8 flex items-center gap-3 text-[1.625rem] font-bold tracking-tight text-foreground'>
      {icon && (
        <span className='bg-primary/8 flex h-9 w-9 items-center justify-center rounded-lg'>
          <Icon icon={icon} className='text-xl text-primary' />
        </span>
      )}
      {title}
    </h2>
    {children}
  </motion.section>
)

// --- Info Callout ---
const InfoCallout = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className='my-6 rounded-xl border border-primary/15 bg-primary/[0.03] p-4 pl-5'>
    <div className='flex items-start gap-3'>
      <Icon icon='solar:info-circle-bold' className='mt-0.5 shrink-0 text-lg text-primary/70' />
      <div>
        <h4 className='text-sm font-bold text-foreground'>{title}</h4>
        <div className='mt-1 text-sm leading-relaxed text-default-600'>{children}</div>
      </div>
    </div>
  </div>
)

// --- Main Page ---
const DocumentationPage = () => {
  const [activeSection, setActiveSection] = useState('overview')
  const [activeLang, setActiveLang] = useSharedLanguage('api')
  const [activeEndpoint, setActiveEndpoint] = useState<Endpoint>('template')

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
      setActiveSection(id)
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
          <h1
            className='mb-4 font-extrabold tracking-tight text-foreground'
            style={{ fontSize: 'clamp(1.75rem, 1.25rem + 1.5vw, 2.5rem)' }}>
            Qorstack Report Documentation
          </h1>
          <p className='max-w-[65ch] text-base leading-relaxed text-default-500 sm:text-lg'>
            Design DOCX templates in Word, send JSON, get your document. This guide covers every template feature from
            simple variable replacement to dynamic tables, images, and barcodes.
          </p>
        </motion.div>

        {/* Content Sections */}
        <div className='flex flex-col gap-16'>
          {/* ===== OVERVIEW ===== */}
          <Section id='overview' title='Overview' icon='solar:document-text-bold'>
            <p className='mb-8 max-w-[65ch] text-base leading-relaxed text-default-600'>
              Qorstack Report Service generates PDF documents from Word (.docx) templates. Instead of maintaining
              complex layout code, you design templates visually, upload them, and send a simple JSON payload to
              generate the final file.
            </p>

            <InfoCallout title='Zero Data Retention'>
              In production, Qorstack Report operates with a strict <strong>Zero Data Retention</strong> policy. Your
              JSON payload is processed in volatile memory and destroyed the moment the PDF is rendered.
            </InfoCallout>

            {/* Generation Method Selector */}
            <div className='mb-10'>
              {/* Pill Tabs */}
              <div className='mb-6 inline-flex rounded-xl bg-content3/80 p-1 ring-1 ring-default-200/60'>
                <button
                  onClick={() => setActiveEndpoint('template')}
                  className={`flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold transition-all ${
                    activeEndpoint === 'template'
                      ? 'bg-content1 text-primary shadow-sm ring-1 ring-default-200/80'
                      : 'text-default-500 hover:text-default-700'
                  }`}>
                  <Icon icon='solar:file-text-bold' className='text-base' />
                  <span>Generate from Template</span>
                </button>
                <button
                  onClick={() => setActiveEndpoint('docx')}
                  className={`flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold transition-all ${
                    activeEndpoint === 'docx'
                      ? 'bg-content1 text-primary shadow-sm ring-1 ring-default-200/80'
                      : 'text-default-500 hover:text-default-700'
                  }`}>
                  <Icon icon='solar:download-square-bold' className='text-base' />
                  <span>Generate from DOCX File</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className='overflow-hidden rounded-xl border border-default-200 bg-content2/50'>
                {/* Header with endpoint badge */}
                <div className='flex items-center justify-between border-b border-default-200/60 px-6 py-4'>
                  <div className='flex items-center gap-3'>
                    <div className='bg-primary/8 flex h-10 w-10 items-center justify-center rounded-xl text-primary'>
                      <Icon
                        icon={activeEndpoint === 'template' ? 'solar:file-text-bold' : 'solar:download-square-bold'}
                        className='text-xl'
                      />
                    </div>
                    <div>
                      <h4 className='text-base font-bold text-foreground'>
                        {activeEndpoint === 'template' ? 'Template-based Generation' : 'Direct DOCX Upload'}
                      </h4>
                      <p className='mt-0.5 text-xs text-default-400'>
                        {activeEndpoint === 'template'
                          ? 'Recurring reports & batch generation'
                          : 'One-off & dynamic templates'}
                      </p>
                    </div>
                  </div>
                  <span className='rounded-full bg-success/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-success ring-1 ring-success/20'>
                    POST
                  </span>
                </div>

                {/* Body */}
                <div className='p-6'>
                  <p className='mb-6 max-w-[55ch] text-sm leading-relaxed text-default-500'>
                    {activeEndpoint === 'template'
                      ? 'Use a pre-uploaded template stored in your project. Best for recurring reports — just reference by key and send your data.'
                      : 'Upload a raw .docx file as Base64 directly in the request body. Best for one-off or dynamically generated templates.'}
                  </p>

                  {/* Endpoint URL */}
                  <div className='mb-5 flex items-center gap-2 rounded-lg bg-content1 px-4 py-3 ring-1 ring-default-200/60'>
                    <Icon icon='solar:link-round-bold' className='shrink-0 text-base text-default-400' />
                    <code className='text-[13px] font-medium text-default-700'>
                      /render/{activeEndpoint === 'template' ? 'template-pdf' : 'docx-pdf'}
                    </code>
                  </div>

                  {/* Info Grid */}
                  <div className='grid gap-3 sm:grid-cols-2'>
                    <div className='flex items-start gap-3 rounded-lg border border-default-200/60 bg-content1/50 p-3.5'>
                      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10'>
                        <Icon icon='solar:key-bold' className='text-sm text-warning' />
                      </div>
                      <div>
                        <p className='text-[11px] font-bold uppercase tracking-wider text-default-400'>Auth Header</p>
                        <code className='mt-1 block text-[13px] font-semibold text-foreground'>x-api-key</code>
                      </div>
                    </div>
                    <div className='flex items-start gap-3 rounded-lg border border-default-200/60 bg-content1/50 p-3.5'>
                      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10'>
                        <Icon icon='solar:shield-check-bold' className='text-sm text-primary' />
                      </div>
                      <div>
                        <p className='text-[11px] font-bold uppercase tracking-wider text-default-400'>Key Field</p>
                        <code className='mt-1 block text-[13px] font-semibold text-foreground'>
                          {activeEndpoint === 'template' ? 'templateKey' : 'fileBase64'}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
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
            </div>
          </Section>

          {/* ===== INTEGRATION & SDKs ===== */}
          <Section id='integration' title='Integration & SDKs' icon='solar:plug-circle-bold' delay={0.05}>
            <p className='mb-8 max-w-[65ch] text-base text-default-600'>
              Choose your preferred integration method. We provide official SDKs for Node.js and .NET, or you can use
              the REST API directly with any HTTP client.
            </p>

            {/* Language Selector */}
            <div className='mb-8'>
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
                <div className='mb-4 rounded-xl border border-default-200 bg-content2/70 p-4'>
                  <div className='flex items-center gap-3'>
                    <Icon icon='solar:box-linear' className='text-lg text-default-400' />
                    <div>
                      <p className='text-sm font-medium text-default-700'>
                        Package: <code className='text-primary'>qorstack-sdk</code>
                      </p>
                      <p className='text-xs text-default-500'>
                        Works with React, Next.js, Express, and any Node.js project
                      </p>
                    </div>
                  </div>
                </div>
                <CodeBlock language='bash' code={getInstallCommand('ts')} title='Install' />
                <p className='mt-4 text-sm text-default-500'>Initialize the client:</p>
                <CodeBlock language='typescript' code={getInitClient('ts')} title='Setup' />
                <InfoCallout title='TypeScript Support'>
                  The SDK includes full TypeScript type definitions out of the box. No additional <code>@types</code>{' '}
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
                <div className='mb-4 rounded-xl border border-default-200 bg-content2/70 p-4'>
                  <div className='flex items-center gap-3'>
                    <Icon icon='solar:box-linear' className='text-lg text-default-400' />
                    <div>
                      <p className='text-sm font-medium text-default-700'>
                        Package: <code className='text-primary'>Qorstack.Sdk</code>
                      </p>
                      <p className='text-xs text-default-500'>
                        Works with ASP.NET Core, Blazor, WPF, and any .NET project
                      </p>
                    </div>
                  </div>
                </div>
                <CodeBlock language='bash' code={getInstallCommand('csharp')} title='Install' />
                <p className='mt-4 text-sm text-default-500'>Initialize the client:</p>
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
                <p className='mb-4 text-sm text-default-500'>No installation required. Use any HTTP client.</p>
                <div className='mb-6 rounded-xl border border-default-200 bg-content2/70 p-5'>
                  <ul className='space-y-3 text-sm text-default-600'>
                    <li className='flex items-start gap-2.5'>
                      <Icon icon='solar:link-bold' className='mt-0.5 shrink-0 text-primary/60' />
                      <span>
                        <strong>API URL:</strong>{' '}
                        <code className='rounded bg-primary/5 px-1.5 py-0.5 text-xs font-medium text-primary'>
                          {API_BASE_URL}/render/{activeEndpoint === 'template' ? 'template-pdf' : 'docx-pdf'}
                        </code>
                      </span>
                    </li>
                    <li className='flex items-start gap-2.5'>
                      <Icon icon='solar:key-bold' className='mt-0.5 shrink-0 text-primary/60' />
                      <span>
                        <strong>Headers:</strong> Include{' '}
                        <code className='rounded bg-primary/5 px-1.5 py-0.5 text-xs font-medium text-primary'>
                          x-api-key
                        </code>{' '}
                        in your request headers.
                      </span>
                    </li>
                  </ul>
                </div>
              </SubSection>
            )}

            <SubSection title='Request Example'>
              <PropertyTable
                data={[
                  {
                    name: 'templateKey',
                    type: 'string',
                    required: activeEndpoint === 'template',
                    desc: 'Template identifier (Required for Template endpoint).'
                  },
                  {
                    name: 'fileBase64',
                    type: 'string',
                    required: activeEndpoint === 'docx',
                    desc: 'Base64 string of .docx file (Required for DOCX endpoint).'
                  },
                  {
                    name: 'fileName',
                    type: 'string',
                    required: false,
                    desc: 'Output PDF filename (default: "output").'
                  },
                  { name: 'replace', type: 'object', required: false, desc: 'Text variable replacements.' },
                  { name: 'table', type: 'array', required: false, desc: 'Dynamic table data (TableDataRequest[]).' },
                  { name: 'image', type: 'object', required: false, desc: 'Image insertion data.' },
                  { name: 'qrcode', type: 'object', required: false, desc: 'QR code generation data.' },
                  { name: 'barcode', type: 'object', required: false, desc: 'Barcode generation data.' }
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
        </div>

        {/* Page Pagination */}
        <div className='mt-16 flex items-center justify-between border-t border-default-200/80 pb-12 pt-8'>
          <button
            onClick={scrollToTop}
            className='group flex items-center gap-1.5 text-sm font-medium text-default-400 transition-colors hover:text-default-700'>
            <Icon icon='solar:arrow-up-linear' className='text-sm transition-transform group-hover:-translate-y-0.5' />
            Back to top
          </button>
          <a href='/pricing' className='group flex flex-col items-end text-right'>
            <span className='mb-1 text-[11px] font-bold uppercase tracking-wider text-default-400'>Next</span>
            <span className='flex items-center gap-1.5 text-base font-bold text-primary transition-colors group-hover:text-primary/80'>
              Pricing
              <Icon
                icon='solar:arrow-right-linear'
                className='text-sm transition-transform group-hover:translate-x-0.5'
              />
            </span>
          </a>
        </div>
      </DocLayout>
    </Fragment>
  )
}

export default DocumentationPage
