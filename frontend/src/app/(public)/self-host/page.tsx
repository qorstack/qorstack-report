'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'
import { CodeBlock } from '@/components/docs/CodeBlock'
import SelfhostPlanSection from '@/views/marketing/selfhost-plan-section'

const GITHUB_URL = 'https://github.com/qorstack/qorstack-report'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] as const }
}

const dockerComposeSnippet = `services:
  app:
    image: qorstack/report-api:latest
    ports:
      - "8080:8080"
    environment:
      - ConnectionStrings__DefaultConnection=...
      - Minio__Endpoint=minio:9000
      - Jwt__Key=your-secret-key
    # Pro license (optional):
    # volumes:
    #   - ./license.json:/app/license.json:ro
    # environment:
    #   - Pro__LicenseFile=/app/license.json
    depends_on:
      - postgres
      - minio
      - gotenberg

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: qorstack_report
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your-password

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"

  gotenberg:
    image: qorstack/gotenberg:8

  frontend:
    image: qorstack/report-web:latest
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SERVICE=http://localhost:8080`

const steps = [
  {
    number: '01',
    title: 'Clone the repository',
    description: 'Get the source code from GitHub.',
    code: 'git clone https://github.com/qorstack/qorstack-report.git\ncd qorstack-report',
    language: 'bash'
  },
  {
    number: '02',
    title: 'Configure environment',
    description: 'Copy the example env file and fill in your values.',
    code: 'cp selfhost/.env.example selfhost/.env\n# Edit selfhost/.env with your settings',
    language: 'bash'
  },
  {
    number: '03',
    title: 'Start with Docker Compose',
    description: 'Bring up all services with a single command.',
    code: 'cd selfhost\ndocker compose up -d',
    language: 'bash'
  }
]

const requirements = [
  { icon: 'lucide:box', label: 'Docker', detail: '24+' },
  { icon: 'lucide:layers', label: 'Docker Compose', detail: 'v2+' },
  { icon: 'lucide:cpu', label: 'RAM', detail: '1 GB min' },
  { icon: 'lucide:hard-drive', label: 'Disk', detail: '2 GB min' }
]

export default function SelfHostPage() {
  return (
    <div className='min-h-screen bg-background'>
      {/* Hero */}
      <section className='border-b border-default-200 bg-content1 py-20'>
        <div className='mx-auto max-w-4xl px-6 text-center'>
          <motion.div {...fadeUp} className='mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary ring-1 ring-inset ring-primary/20'>
            <Icon icon='lucide:server' className='h-3 w-3' />
            Self-Host Guide
          </motion.div>

          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.05 }}
            className='mb-4 font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl'>
            Deploy Qorstack Report
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className='mx-auto max-w-xl text-lg text-default-600'>
            Run your own instance in minutes. MIT-licensed, no usage limits, your data stays on your infrastructure.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.15 }}
            className='mt-8 flex flex-wrap justify-center gap-3'>
            <a
              href={GITHUB_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90'>
              <Icon icon='lucide:github' className='h-4 w-4' />
              View on GitHub
            </a>
            <a
              href='/demo'
              className='flex items-center gap-2 rounded-md bg-content2 px-6 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-content3'>
              <Icon icon='lucide:play-circle' className='h-4 w-4 text-default-600' />
              Watch Demo
            </a>
          </motion.div>
        </div>
      </section>

      {/* Requirements */}
      <section className='border-b border-default-200 py-12'>
        <div className='mx-auto max-w-4xl px-6'>
          <h2 className='mb-6 text-lg font-bold text-foreground'>Requirements</h2>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {requirements.map(req => (
              <div key={req.label} className='flex items-center gap-3 rounded-lg border border-default-200 bg-content1 p-4'>
                <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10'>
                  <Icon icon={req.icon} className='h-4 w-4 text-primary' />
                </div>
                <div>
                  <p className='text-sm font-semibold text-foreground'>{req.label}</p>
                  <p className='text-xs text-default-500'>{req.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Start Steps */}
      <section className='border-b border-default-200 py-16'>
        <div className='mx-auto max-w-4xl px-6'>
          <h2 className='mb-2 text-2xl font-bold text-foreground'>Quick Start</h2>
          <p className='mb-10 text-default-600'>Up and running in 3 steps.</p>

          <div className='space-y-8'>
            {steps.map((step) => (
              <motion.div key={step.number} {...fadeUp} className='flex gap-6'>
                <div className='flex shrink-0 flex-col items-center'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground'>
                    {step.number}
                  </div>
                  <div className='mt-2 w-px flex-1 bg-default-200' />
                </div>
                <div className='flex-1 pb-8'>
                  <h3 className='mb-1 font-semibold text-foreground'>{step.title}</h3>
                  <p className='mb-3 text-sm text-default-600'>{step.description}</p>
                  <CodeBlock code={step.code} language={step.language} showHeader={false} compact />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* docker-compose.yml */}
      <section className='border-b border-default-200 py-16'>
        <div className='mx-auto max-w-4xl px-6'>
          <h2 className='mb-2 text-2xl font-bold text-foreground'>Example docker-compose.yml</h2>
          <p className='mb-6 text-default-600'>
            A minimal production-ready configuration. See the{' '}
            <a href={`${GITHUB_URL}/tree/main/selfhost`} target='_blank' rel='noopener noreferrer' className='text-primary underline underline-offset-2'>
              selfhost/
            </a>{' '}
            directory for the full version with Traefik and HTTPS.
          </p>
          <CodeBlock code={dockerComposeSnippet} language='yaml' />
        </div>
      </section>

      {/* Update command */}
      <section className='border-b border-default-200 py-12'>
        <div className='mx-auto max-w-4xl px-6'>
          <h2 className='mb-4 text-lg font-bold text-foreground'>Updating</h2>
          <CodeBlock code='docker compose pull && docker compose up -d' language='bash' showHeader={false} compact />
        </div>
      </section>

      {/* Free vs Pro comparison */}
      <SelfhostPlanSection />
    </div>
  )
}
