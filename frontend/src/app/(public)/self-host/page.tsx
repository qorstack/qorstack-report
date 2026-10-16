'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'
import { CodeBlock } from '@/components/docs/CodeBlock'
import SelfhostPlanSection from '@/views/marketing/selfhost-plan-section'
import { dockerComposeYaml, envExample } from '@/generated/selfhost-files'

const GITHUB_URL = 'https://github.com/qorstack/qorstack-report'
const COMPOSE_URL = '/selfhost/docker-compose.yml'
const ENV_URL = '/selfhost/.env.example'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] as const }
}

const QUICK_START = `git clone https://github.com/qorstack/qorstack-report.git
cd qorstack-report/selfhost
bash init.sh           # .env with random secrets; prints the admin password
docker compose up -d`

const AGENT_PROMPT = `Deploy Qorstack Report on this machine with Docker and confirm it's running. Use the prebuilt images — do NOT build images, edit the Dockerfile, or change project files (the only allowed edit is remapping a clashing port, below). If anything else is blocked, STOP and report it; don't work around it.

  git clone https://github.com/qorstack/qorstack-report.git
  cd qorstack-report/selfhost
  bash init.sh           # writes .env with random secrets and prints the admin password — keep that line

Before starting, make sure host port 8080 is free — it is the only port the stack publishes (web UI + API in one container; PostgreSQL, storage and Gotenberg stay inside the Docker network). If 8080 is in use, set APP_PORT (e.g. 8081) and PUBLIC_URL=http://localhost:8081 in .env and say what you changed.

  docker compose up -d   # first run pulls images (~2 min); multi-arch, Apple Silicon OK

Then verify and report — that's the whole job: still in qorstack-report/selfhost, run "bash verify.sh" (it reads APP_PORT from .env; expect "All checks passed") and report the web UI URL, the admin login printed by init.sh, the verify output, and any ports you remapped.

Optional, in the WEB UI (not via scripts): upload examples/invoice/invoice.docx, create an API key (Settings -> API Keys), and render examples/invoice/data.json (see examples/invoice/README.md).`

const requirements = [
  { label: 'Docker', detail: '24+' },
  { label: 'Docker Compose', detail: 'v2+' },
  { label: 'RAM', detail: '2 GB' },
  { label: 'Disk', detail: '5 GB' }
]

const services = [
  { icon: 'lucide:server', label: 'App', desc: 'Web UI + .NET API in one container (port 8080)' },
  { icon: 'lucide:database', label: 'PostgreSQL', desc: 'Application database' },
  { icon: 'lucide:hard-drive', label: 'RustFS (or MinIO)', desc: 'S3 storage — one bucket for templates, reports & fonts' },
  { icon: 'lucide:type', label: 'Font Syncer', desc: 'Mirrors fonts into the render volume' },
  { icon: 'lucide:file-text', label: 'Gotenberg', desc: 'DOCX → PDF conversion (+ Excel previews)' }
]

const serviceUrls = [
  { label: 'Web UI', url: 'http://localhost:8080', login: 'admin / the password init.sh printed (ADMIN_PASSWORD in .env)' },
  { label: 'API', url: 'http://localhost:8080/api', login: 'X-API-Key header' }
]

const mustChange = [
  { name: 'ADMIN_EMAIL', purpose: 'Admin login (re-applied on every restart)' },
  { name: 'ADMIN_PASSWORD', purpose: 'Admin password (re-applied on every restart)' },
  { name: 'DB_PASSWORD', purpose: 'PostgreSQL password' },
  { name: 'STORAGE_ACCESS_KEY', purpose: 'S3 storage access key (RustFS/MinIO root user)' },
  { name: 'STORAGE_SECRET_KEY', purpose: 'S3 storage secret key' },
  { name: 'JWT_KEY', purpose: 'JWT signing key — at least 32 characters' },
  { name: 'ENCRYPTION_KEY', purpose: 'AES key — exactly 32 characters' },
  { name: 'ENCRYPTION_IV', purpose: 'AES IV — exactly 16 characters' }
]

const troubleshooting = [
  { symptom: 'Login fails on first run', check: 'ADMIN_EMAIL, ADMIN_PASSWORD, docker compose logs app' },
  { symptom: 'Page loads but sign-in or data fails', check: 'docker compose logs app, /api/health' },
  { symptom: 'Previews / downloads fail', check: 'PUBLIC_URL reachable from the browser, docker compose logs rustfs (or minio)' },
  { symptom: 'PDF conversion fails', check: 'gotenberg logs' },
  { symptom: 'Custom fonts missing', check: 'font-syncer logs' }
]

const TICKER = [
  'docker compose up -d',
  'PostgreSQL',
  'RustFS · MinIO · S3',
  'Gotenberg',
  'API keys per project',
  'Generation history',
  'MIT core'
]

const WRAP = 'mx-auto max-w-5xl px-4 sm:px-6'
const TH = 'px-4 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-default-500'

const SectionHeader = ({
  no,
  label,
  title,
  accent
}: {
  no: string
  label: string
  title: React.ReactNode
  /** Word(s) rendered in brand red after the title */
  accent?: string
}) => (
  <div className='mb-10'>
    <p className='mb-5 inline-block border-t-2 border-primary pr-6 pt-2 font-mono text-[12px] uppercase tracking-[0.16em] text-default-500'>
      <b className='font-bold text-primary'>{no}</b> — {label}
    </p>
    <h2 className='press-display text-[clamp(2.25rem,1.4rem+3.2vw,4rem)] text-foreground'>
      {title}
      {accent && <span className='text-primary'> {accent}</span>}
    </h2>
  </div>
)

const Subhead = ({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) => (
  <p
    className={`mb-3 font-mono text-[12px] uppercase tracking-[0.14em] ${danger ? 'text-danger' : 'text-default-500'}`}>
    {children}
  </p>
)

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className='inline-flex items-center border border-divider bg-content2 px-1.5 font-mono text-[12px] font-medium leading-5 text-foreground'>
    {children}
  </span>
)

const LetterTag = ({ children }: { children: React.ReactNode }) => (
  <span className='inline-flex h-7 w-7 shrink-0 items-center justify-center border border-primary font-mono text-[12px] font-bold text-primary'>
    {children}
  </span>
)

interface StepProps {
  number: string
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  last?: boolean
}

const Step = ({ number, title, description, children, last }: StepProps) => (
  <motion.li {...fadeUp} className='grid gap-x-6 sm:grid-cols-[88px_minmax(0,1fr)]'>
    <div className='flex items-start gap-3 sm:flex-col sm:items-stretch'>
      <span className='flex items-baseline gap-2 sm:flex-col sm:gap-1'>
        <span className='font-mono text-[11px] uppercase tracking-[0.16em] text-default-500'>Step</span>
        <span className='press-display text-[40px] text-primary'>{number}</span>
      </span>
      {!last && <span aria-hidden='true' className='hidden w-px flex-1 bg-divider sm:ml-1 sm:mt-2 sm:block' />}
    </div>
    <div className={`min-w-0 border-t border-divider pt-4 ${last ? '' : 'pb-12'}`}>
      <h3 className='mb-2 text-[18px] font-bold uppercase tracking-[0.01em] text-foreground [font-variation-settings:"wdth"_88]'>
        {title}
      </h3>
      {description && <div className='mb-4 max-w-2xl text-[15px] leading-relaxed text-default-500'>{description}</div>}
      {children}
    </div>
  </motion.li>
)

const DataTable = ({
  head,
  rows
}: {
  head: [string, string]
  rows: { a: React.ReactNode; b: string; key: string }[]
}) => (
  <div className='overflow-x-auto border border-divider'>
    <table className='w-full text-left text-[14px]'>
      <thead className='bg-content1'>
        <tr>
          <th scope='col' className={TH}>
            {head[0]}
          </th>
          <th scope='col' className={TH}>
            {head[1]}
          </th>
        </tr>
      </thead>
      <tbody className='divide-y divide-divider border-t border-divider'>
        {rows.map(r => (
          <tr key={r.key} className='transition-colors hover:bg-content2'>
            <td className='px-4 py-2.5 text-foreground'>{r.a}</td>
            <td className='px-4 py-2.5 text-default-500'>{r.b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const CommandBox = ({ code, title }: { code: string; title: string }) => (
  <div className='crop'>
    <span className='crop-cm' />
    <CodeBlock code={code} language='bash' title={title} compact showLineNumbers={false} />
  </div>
)

const ShortCode = ({
  code,
  language = 'bash',
  lineNumbers = false
}: {
  code: string
  language?: string
  lineNumbers?: boolean
}) => <CodeBlock code={code} language={language} showHeader={false} compact showLineNumbers={lineNumbers} />

export default function SelfHostPage() {
  return (
    <div className='min-h-screen bg-background'>
      {/* ── Hero ── */}
      <section className='border-b border-divider pb-20 pt-28 sm:pt-32'>
        <div className={WRAP}>
          <motion.div {...fadeUp} className='mb-6 flex items-center gap-3'>
            <span className='bg-primary px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-primary-foreground'>
              Self-host guide
            </span>
            <span className='press-label'>Docker · MIT</span>
          </motion.div>

          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className='press-display text-[clamp(3rem,1.8rem+6vw,7rem)] text-foreground'>
            Clone. Init.
            <br />
            <span className='text-primary'>Compose up.</span>
          </motion.h1>

          <div className='mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'>
            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.14 }}>
              <p className='max-w-xl text-[17px] leading-relaxed text-default-500 sm:text-[19px]'>
                Three commands: clone the repo, run <Pill>init.sh</Pill> to create <Pill>.env</Pill> with random
                secrets, then <Pill>docker compose up -d</Pill>.{' '}
                <b className='font-semibold text-foreground'>
                  MIT-licensed. No usage limits. Your data stays on your network.
                </b>
              </p>
              <div className='mt-8 flex flex-wrap gap-3'>
                <a
                  href='#quick-start'
                  className='group inline-flex h-12 items-center gap-3 bg-primary px-6 text-[14px] font-bold uppercase tracking-[0.04em] text-primary-foreground transition-colors hover:bg-primary-600'>
                  Start in 3 commands
                  <Icon
                    icon='lucide:arrow-right'
                    aria-hidden='true'
                    className='h-4 w-4 transition-transform group-hover:translate-x-1'
                  />
                </a>
                <a
                  href={GITHUB_URL}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex h-12 items-center gap-3 border border-default-300 px-6 text-[14px] font-bold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-foreground'>
                  <Icon icon='lucide:github' aria-hidden='true' className='h-4 w-4' />
                  View on GitHub
                </a>
              </div>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
              <CommandBox code={QUICK_START} title='~/selfhost — the whole thing' />
            </motion.div>
          </div>

          <motion.dl
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.26 }}
            className='mt-12 grid grid-cols-2 border-l border-t border-divider sm:grid-cols-4'>
            {[
              ['License', 'MIT'],
              ['Telemetry', 'Zero'],
              ['Pro', 'Self-hosted'],
              ['Status', 'Production ready']
            ].map(([k, v]) => (
              <div key={k} className='border-b border-r border-divider px-4 py-4'>
                <dt className='font-mono text-[11px] uppercase tracking-[0.14em] text-default-500'>{k}</dt>
                <dd className='mt-1.5 text-[16px] font-bold text-foreground'>{v}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
      </section>

      {/* ── Ticker ── */}
      <div
        aria-hidden='true'
        className='overflow-hidden border-b border-divider bg-primary py-3 text-primary-foreground'>
        <div className='flex w-max animate-scroll gap-10 whitespace-nowrap font-mono text-[13px] font-bold uppercase tracking-[0.18em]'>
          {[0, 1].map(copy => (
            <span key={copy} className='flex gap-10'>
              {TICKER.map(item => (
                <span key={`${copy}-${item}`} className='flex items-center gap-10'>
                  {item}
                  <span>■</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── Requirements ── */}
      <section className='border-b border-divider py-16'>
        <div className={WRAP}>
          <SectionHeader no='01' label='Requirements' title='Anything that runs' accent='Docker.' />
          <dl className='grid grid-cols-2 border-l border-t border-divider sm:grid-cols-4'>
            {requirements.map(req => (
              <div key={req.label} className='border-b border-r border-divider bg-content1 p-5'>
                <dt className='font-mono text-[11px] uppercase tracking-[0.14em] text-default-500'>{req.label}</dt>
                <dd className='mt-2 text-[24px] font-extrabold text-foreground [font-variation-settings:"wdth"_80]'>
                  {req.detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Quick Start ── */}
      <section id='quick-start' className='scroll-mt-20 border-b border-divider py-16'>
        <div className={WRAP}>
          <SectionHeader no='02' label='Quick start' title='Zero to running in' accent='4 steps.' />

          <ol>
            <Step
              number='01'
              title='Get the self-host folder'
              description='The selfhost/ folder holds docker-compose.yml, a commented .env.example and the helper scripts. Nothing is built locally — Docker pulls prebuilt images (amd64 + arm64).'>
              <ShortCode
                code={`git clone https://github.com/qorstack/qorstack-report.git
cd qorstack-report/selfhost`}
              />
              <details className='group mt-4'>
                <summary className='flex cursor-pointer list-none items-center gap-2 text-[14px] font-medium text-default-500 hover:text-foreground'>
                  <Icon icon='lucide:chevron-right' aria-hidden='true' className='h-4 w-4 transition-transform group-open:rotate-90' />
                  Prefer not to use git? Download the files instead
                </summary>
                <div className='mt-4 space-y-4'>
                  <p className='text-[14px] text-default-500'>
                    Put both files (and <Pill>init.sh</Pill>) in one folder. The storage overrides{' '}
                    <Pill>docker-compose.minio.yml</Pill> / <Pill>docker-compose.external-s3.yml</Pill> are only needed if you
                    don’t use the bundled RustFS.
                  </p>
                  <CodeBlock
                    code={dockerComposeYaml}
                    language='yaml'
                    title='docker-compose.yml'
                    maxHeight={300}
                    downloadHref={COMPOSE_URL}
                    downloadFilename='docker-compose.yml'
                    compact
                  />
                  <CodeBlock
                    code={envExample}
                    language='ini'
                    title='.env.example'
                    maxHeight={260}
                    downloadHref={ENV_URL}
                    downloadFilename='.env.example'
                    compact
                  />
                  <ShortCode code='curl -fsSLO https://report.qorstack.com/selfhost/init.sh' />
                </div>
              </details>
            </Step>

            <Step
              number='02'
              title='Create .env with random secrets'
              description={
                <>
                  <Pill>init.sh</Pill> copies <Pill>.env.example</Pill> to <Pill>.env</Pill>, replaces every{' '}
                  <Pill>change-me</Pill> value with a random secret and prints the admin password — save it. No bash? Copy
                  the file to <Pill>.env</Pill> and replace the <Pill>change-me</Pill> values yourself; every variable is
                  explained in comments.
                </>
              }>
              <ShortCode code='bash init.sh' />
            </Step>

            <Step
              number='03'
              title='Start the stack'
              description='Docker pulls the images, creates volumes, and brings up everything in order.'>
              <ShortCode code='docker compose up -d' />
              <p className='mt-3 text-[14px] text-default-500'>First run takes ~1–2 minutes while images download.</p>
            </Step>

            <Step
              number='04'
              title='Open the web UI and log in'
              description={
                <>
                  Log in as <Pill>admin</Pill> with the password <Pill>init.sh</Pill> printed. The login comes from{' '}
                  <Pill>ADMIN_EMAIL</Pill> / <Pill>ADMIN_PASSWORD</Pill> in <Pill>.env</Pill> and is re-applied on every restart. To change it,
                  edit <Pill>.env</Pill> and run <Pill>docker compose up -d</Pill> again.
                </>
              }
              last>
              <div className='grid border-l border-t border-divider sm:grid-cols-2'>
                {serviceUrls.map(s => (
                  <div key={s.label} className='border-b border-r border-divider bg-content1 p-4'>
                    <p className='font-mono text-[11px] uppercase tracking-[0.14em] text-default-500'>{s.label}</p>
                    <a
                      href={s.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='mt-2 inline-flex max-w-full items-center gap-1 break-all font-mono text-[13px] font-bold text-foreground underline decoration-primary decoration-2 underline-offset-4 transition-colors hover:text-primary'>
                      {s.url}
                      <Icon
                        icon='lucide:arrow-up-right'
                        aria-hidden='true'
                        className='h-3.5 w-3.5 shrink-0 text-primary'
                      />
                    </a>
                    <p className='mt-2 text-[12px] text-default-500'>
                      Login: <span className='font-mono text-default-700'>{s.login}</span>
                    </p>
                  </div>
                ))}
              </div>
            </Step>
          </ol>

          <details className='group mt-10 border-t border-divider pt-6'>
            <summary className='flex cursor-pointer list-none items-center gap-2 text-[15px] font-semibold text-foreground'>
              <Icon icon='lucide:chevron-right' aria-hidden='true' className='h-4 w-4 transition-transform group-open:rotate-90' />
              Or let an AI coding agent do it
            </summary>
            <p className='mb-3 mt-3 max-w-2xl text-[14px] text-default-500'>
              Paste this prompt into Claude Code, Cursor or a similar agent on the machine that should run the stack.
            </p>
            <CodeBlock
              code={AGENT_PROMPT}
              language='text'
              title='agent prompt'
              compact
              showLineNumbers={false}
              maxHeight={280}
              wrap
            />
          </details>
        </div>
      </section>

      {/* ── What's inside ── */}
      <section className='border-b border-divider py-16'>
        <div className={WRAP}>
          <SectionHeader no='03' label="What's inside" title='Five services. One' accent='compose file.' />
          <div className='mb-6 grid gap-px border border-divider bg-divider sm:grid-cols-3'>
            {[
              { title: 'RustFS — default', body: 'Bundled S3 storage (Apache-2.0). Starts with plain docker compose up -d.', code: '' },
              {
                title: 'MinIO — keep v1 data',
                body: 'Uncomment in .env to run the bundled MinIO instead.',
                code: 'COMPOSE_FILE=docker-compose.yml:docker-compose.minio.yml'
              },
              {
                title: 'External S3',
                body: 'AWS S3, Cloudflare R2 or your own server — no bundled storage. Set STORAGE_* too.',
                code: 'COMPOSE_FILE=docker-compose.yml:docker-compose.external-s3.yml'
              }
            ].map(opt => (
              <div key={opt.title} className='flex flex-col gap-2 bg-content1 p-4'>
                <p className='text-[14px] font-semibold text-foreground'>{opt.title}</p>
                <p className='text-[13px] text-default-500'>{opt.body}</p>
                {opt.code && <code className='break-all font-mono text-[11px] text-default-600'>{opt.code}</code>}
              </div>
            ))}
          </div>
          <div className='grid border-l border-t border-divider sm:grid-cols-2 lg:grid-cols-3'>
            {services.map(svc => (
              <motion.div
                key={svc.label}
                {...fadeUp}
                className='flex items-start gap-3 border-b border-r border-divider bg-content1 p-5'>
                <Icon icon={svc.icon} aria-hidden='true' className='mt-0.5 h-5 w-5 shrink-0 text-primary' />
                <div className='min-w-0'>
                  <p className='text-[15px] font-bold uppercase tracking-[0.01em] text-foreground'>{svc.label}</p>
                  <p className='mt-0.5 text-[14px] leading-snug text-default-500'>{svc.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Going to production ── */}
      <section className='border-b border-divider py-16'>
        <div className={WRAP}>
          <SectionHeader no='04' label='Going to production' title='Three things before' accent='going live.' />

          {/* A — Secrets */}
          <div className='mb-14'>
            <div className='mb-3 flex items-center gap-3'>
              <LetterTag>A</LetterTag>
              <h3 className='text-[20px] font-bold uppercase tracking-[0.01em] text-foreground'>
                Change these secrets
              </h3>
            </div>
            <p className='mb-5 max-w-2xl text-[15px] text-default-500'>
              The defaults work on <Pill>localhost</Pill> but must be rotated before you expose the instance.
            </p>

            <DataTable
              head={['Variable', 'Purpose']}
              rows={mustChange.map(v => ({ key: v.name, a: <Pill>{v.name}</Pill>, b: v.purpose }))}
            />

            <div className='mt-6'>
              <Subhead>Generate strong secrets</Subhead>
              <ShortCode
                lineNumbers
                code={`openssl rand -hex 32   # JWT_KEY
openssl rand -hex 16   # ENCRYPTION_KEY  (32 hex chars)
openssl rand -hex 8    # ENCRYPTION_IV   (16 hex chars)`}
              />
            </div>

            <div
              role='note'
              className='mt-6 flex items-start gap-3 border border-l-[3px] border-divider border-l-warning bg-content1 p-4'>
              <Icon icon='lucide:triangle-alert' aria-hidden='true' className='mt-0.5 h-4 w-4 shrink-0 text-warning' />
              <p className='text-[14px] leading-relaxed text-default-600'>
                The admin login comes from <Pill>ADMIN_EMAIL</Pill> / <Pill>ADMIN_PASSWORD</Pill> and is re-applied on
                every restart, so a password changed in the app is reset on the next start. To rotate it, change both in{' '}
                <Pill>.env</Pill> and run <Pill>docker compose up -d</Pill>. Leave them blank after first login if you prefer to manage the password
                in the app.
              </p>
            </div>
          </div>

          {/* B — Network */}
          <div className='mb-14'>
            <div className='mb-3 flex items-center gap-3'>
              <LetterTag>B</LetterTag>
              <h3 className='text-[20px] font-bold uppercase tracking-[0.01em] text-foreground'>
                Reach it from another device
              </h3>
            </div>
            <p className='mb-5 max-w-2xl text-[15px] text-default-500'>
              When opening the UI from another device, <Pill>localhost</Pill> points to <em>that</em> device, not the
              server. Set <Pill>PUBLIC_URL</Pill> in <Pill>.env</Pill> to the address people open — the web UI and the API share it:
            </p>
            <div className='grid gap-6 sm:grid-cols-2'>
              <div>
                <Subhead>VPN / LAN</Subhead>
                <ShortCode
                  language='ini'
                  code={`PUBLIC_URL=http://192.168.1.10:8080`}
                />
              </div>
              <div>
                <Subhead>Domain + HTTPS</Subhead>
                <ShortCode
                  language='ini'
                  code={`PUBLIC_URL=https://report.your-domain.com`}
                />
              </div>
            </div>
          </div>

          {/* C — External services */}
          <div>
            <div className='mb-3 flex items-center gap-3'>
              <LetterTag>C</LetterTag>
              <h3 className='text-[20px] font-bold uppercase tracking-[0.01em] text-foreground'>
                Use external PostgreSQL or S3
              </h3>
            </div>
            <p className='mb-5 max-w-2xl text-[15px] text-default-500'>
              Already running your own database or object store? Point the stack at it and disable the bundled service.
            </p>
            <div className='grid gap-6 sm:grid-cols-2'>
              <div>
                <Subhead>Your own PostgreSQL</Subhead>
                <ShortCode
                  language='ini'
                  code={`DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=qorstack_report
DB_USER=postgres
DB_PASSWORD=your-db-password`}
                />
                <p className='mt-3 text-[13px] text-default-500'>
                  Then disable the <Pill>postgres</Pill> service in <Pill>docker-compose.yml</Pill>.
                </p>
              </div>
              <div>
                <Subhead>S3-compatible store</Subhead>
                <ShortCode
                  language='ini'
                  code={`COMPOSE_FILE=docker-compose.yml:docker-compose.external-s3.yml
STORAGE_ENDPOINT=s3.eu-central-1.amazonaws.com
STORAGE_USE_SSL=true
STORAGE_REGION=eu-central-1
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_BUCKET=qorstack-report`}
                />
                <p className='mt-3 text-[13px] text-default-500'>
                  The <Pill>external-s3</Pill> override skips the bundled RustFS (keep <Pill>COMPOSE_PATH_SEPARATOR=:</Pill>{' '}
                  from <Pill>.env.example</Pill>). Works with AWS S3, Cloudflare R2 or
                  your own MinIO/RustFS. Everything goes in the one bucket under <Pill>template/</Pill>,{' '}
                  <Pill>generated-report/</Pill> and <Pill>fonts/</Pill>. Storage needs no public address — downloads go
                  through the API.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Activate Pro ── */}
      <section className='border-b border-divider py-16'>
        <div className={WRAP}>
          <SectionHeader no='05' label='Activate Pro' title='Already have a' accent='license?' />
          <p className='mb-8 max-w-2xl text-[15px] text-default-500'>
            Drop your license file next to <Pill>docker-compose.yml</Pill> and recreate the <Pill>app</Pill> container.
            (Feature comparison is at the <a href='#free-vs-pro' className='underline decoration-primary underline-offset-4 hover:text-foreground'>bottom of this page</a>.)
          </p>
          <div className='border border-divider bg-content1 p-6'>
            <div className='mb-4 flex items-center gap-2'>
              <Icon icon='lucide:file-key-2' aria-hidden='true' className='h-4 w-4 text-primary' />
              <p className='text-[15px] font-bold uppercase tracking-[0.02em] text-foreground'>With a license file</p>
            </div>
            <ol className='space-y-2 text-[14px] text-default-600'>
              {[
                <>
                  Place your license file (named like <Pill>license-you_at_example_com.json</Pill>) next to{' '}
                  <Pill>docker-compose.yml</Pill> — keep its original name.
                </>,
                <>
                  Under the <Pill>app</Pill> service, uncomment <Pill>Pro__LicenseFile</Pill> and the license line in{' '}
                  <Pill>volumes:</Pill>, with your file name on the left (see diff below).
                </>,
                <>
                  Run <Pill>docker compose up -d</Pill> — it recreates <Pill>app</Pill> with the new settings;{' '}
                  <Pill>docker compose restart</Pill> would not apply them.
                </>
              ].map((item, i) => (
                <li key={i} className='flex gap-3'>
                  <span className='font-mono text-[12px] font-bold leading-6 text-primary'>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className='leading-6'>{item}</span>
                </li>
              ))}
            </ol>

            <div className='mt-6 grid gap-4 sm:grid-cols-2'>
              <div>
                <div className='mb-2 flex items-center gap-2'>
                  <span className='border border-default-300 px-1.5 font-mono text-[11px] font-bold uppercase leading-5 tracking-[0.12em] text-default-500'>
                    Before
                  </span>
                  <span className='text-[13px] text-default-500'>Free — license lines commented out</span>
                </div>
                <ShortCode
                  language='yaml'
                  code={`app:
  environment:
    # - Pro__LicenseFile=/app/license.json
  volumes:
    - fonts_cache:/renderer-fonts:ro
    # - ./license-you_at_example_com.json:/app/license.json:ro`}
                />
              </div>
              <div>
                <div className='mb-2 flex items-center gap-2'>
                  <span className='border border-primary px-1.5 font-mono text-[11px] font-bold uppercase leading-5 tracking-[0.12em] text-primary'>
                    After
                  </span>
                  <span className='text-[13px] text-default-500'>Pro — both license lines uncommented</span>
                </div>
                <ShortCode
                  language='yaml'
                  code={`app:
  environment:
    - Pro__LicenseFile=/app/license.json
  volumes:
    - fonts_cache:/renderer-fonts:ro
    - ./license-you_at_example_com.json:/app/license.json:ro`}
                />
              </div>
            </div>

            <p className='mt-5 text-[13px] text-default-500'>License is validated offline — no call to Qorstack.</p>
          </div>

          <p className='mt-6 text-[14px] text-default-500'>
            Check active flags:{' '}
            <a
              href='http://localhost:8080/api/features'
              target='_blank'
              rel='noopener noreferrer'
              className='font-mono text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary'>
              curl http://localhost:8080/api/features
            </a>
          </p>
        </div>
      </section>

      {/* ── Day-2 ops ── */}
      <section className='border-b border-divider py-16'>
        <div className={WRAP}>
          <SectionHeader no='06' label='Day-2 ops' title='Update, stop,' accent='wipe.' />
          <div className='grid gap-6 sm:grid-cols-3'>
            <div>
              <Subhead>Update</Subhead>
              <ShortCode
                code={`docker compose pull
docker compose up -d`}
              />
            </div>
            <div>
              <Subhead>Stop (keep data)</Subhead>
              <ShortCode code='docker compose down' />
            </div>
            <div>
              <Subhead danger>
                <Icon
                  icon='lucide:triangle-alert'
                  aria-hidden='true'
                  className='mr-1.5 inline h-3.5 w-3.5 align-[-2px]'
                />
                Stop + wipe data
              </Subhead>
              <ShortCode code='docker compose down -v' />
            </div>
          </div>
          <p className='mt-6 max-w-2xl text-[14px] leading-relaxed text-default-500'>
            <b className='font-semibold text-foreground'>Upgrading from v1</b> (buckets <Pill>templates</Pill> /{' '}
            <Pill>reports</Pill> / <Pill>fonts</Pill>)? Before starting v2, run{' '}
            <Pill>bash migrate-storage.sh keep-minio</Pill> (stay on MinIO) or <Pill>to-rustfs</Pill> (move to RustFS)
            once. It copies the old buckets into one bucket (default <Pill>qorstack-report</Pill>) with rclone and
            leaves them untouched. Your v1 <Pill>MINIO_*</Pill> settings keep working. v2 also accepts render requests as keyed arrays
            only — see the changelog on GitHub.
          </p>
        </div>
      </section>

      {/* ── Troubleshooting ── */}
      <section className='border-b border-divider py-16'>
        <div className={WRAP}>
          <SectionHeader no='07' label='Troubleshooting' title='Something not' accent='working?' />

          <div className='mb-8'>
            <Subhead>Check the logs</Subhead>
            <ShortCode
              code={`docker compose ps
docker compose logs app
docker compose logs gotenberg
docker compose logs font-syncer`}
            />
          </div>

          <DataTable
            head={['Symptom', 'Check']}
            rows={troubleshooting.map(t => ({ key: t.symptom, a: t.symptom, b: t.check }))}
          />

          <div className='mt-8 flex flex-wrap gap-3'>
            <a
              href={GITHUB_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex h-10 items-center gap-2 border border-default-300 px-4 text-[13px] font-bold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-foreground'>
              <Icon icon='lucide:github' aria-hidden='true' className='h-4 w-4' />
              View on GitHub
              <Icon icon='lucide:arrow-up-right' aria-hidden='true' className='h-3.5 w-3.5' />
            </a>
            <a
              href={`${GITHUB_URL}/issues`}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex h-10 items-center gap-2 border border-default-300 px-4 text-[13px] font-bold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-foreground'>
              <Icon icon='lucide:message-circle-question' aria-hidden='true' className='h-4 w-4' />
              Report an issue
            </a>
          </div>
        </div>
      </section>

      {/* ── Free vs Pro (single comparison) ── */}
      <SelfhostPlanSection />
    </div>
  )
}
