'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'
import Image from 'next/image'
import PromptPaySection from './promptpay-section'

// =============================================================================
// Price ladder — update TOTAL_SOLD manually as licenses are purchased
// =============================================================================
const PRICE_LADDER = [
  { label: 'Early Bird',      seats: 20,   price: 149 },
  { label: 'Founding Member', seats: 30,   price: 299 },
  { label: 'Standard',        seats: null, price: 499 },
] as const

const TOTAL_SOLD = 0 // ← increment manually on each sale

function getCurrentTier(sold: number) {
  let cumulative = 0
  for (const t of PRICE_LADDER) {
    if (t.seats === null) return { tier: t, remaining: null, pctFilled: 0 }
    cumulative += t.seats
    if (sold < cumulative) {
      const remaining = cumulative - sold
      return { tier: t, remaining, pctFilled: (sold - (cumulative - t.seats)) / t.seats }
    }
  }
  return { tier: PRICE_LADDER[PRICE_LADDER.length - 1], remaining: null, pctFilled: 1 }
}

const { tier: CURRENT, remaining: REMAINING, pctFilled: PCT } = getCurrentTier(TOTAL_SOLD)
const CONTACT_EMAIL = 'qorstack@gmail.com'
const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Pro License — ${CURRENT.label}`)}`

const PRO_PERKS = [
  { icon: 'lucide:layers',       label: 'Template versioning',     desc: '10 versions per template' },
  { icon: 'lucide:lock',         label: 'PDF Password Protection', desc: 'Encrypt PDF output' },
  { icon: 'lucide:stamp',        label: 'PDF Watermark',           desc: 'Brand your documents' },
  { icon: 'lucide:users',        label: 'Project Members',         desc: 'Team collaboration' },
  { icon: 'lucide:infinity',     label: 'Lifetime license',        desc: 'One-time · no subscription' },
  { icon: 'lucide:shield-check', label: 'All future Pro updates',  desc: 'Free upgrades included' },
]

// =============================================================================
// Wall of Fame — update manually as licenses are purchased
// =============================================================================

const FOUNDER = {
  name: 'Satang Budsai',
  role: 'Creator & Maintainer',
  avatar: undefined as string | undefined,
  link: 'https://github.com/qorstack',
}

type EnterpriseEntry = {
  name: string
  company?: string
  role?: string
  avatar?: string
  link?: string
}

type SupporterEntry = {
  name: string
  tier: 'early-bird' | 'founding'
  avatar?: string
  link?: string
}

// Add entries here as licenses are sold
const ENTERPRISE: EnterpriseEntry[] = []
const SUPPORTERS: SupporterEntry[] = []

// =============================================================================

const SUPPORTER_TIER: Record<SupporterEntry['tier'], { label: string; style: string }> = {
  'early-bird': { label: 'Early Bird',      style: 'bg-emerald-500/10 text-emerald-600' },
  'founding':   { label: 'Founding Member', style: 'bg-amber-500/10 text-amber-600' },
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay, ease: [0.25, 1, 0.5, 1] as const },
})

function AvatarCircle({
  name, src, size = 'md',
}: {
  name: string; src?: string; size?: 'sm' | 'md' | 'lg'
}) {
  const cls = { sm: 'h-9 w-9 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-16 w-16 text-xl' }[size]
  if (src)
    return <Image src={src} alt={name} width={64} height={64} className={`${cls} rounded-full object-cover`} />
  return (
    <div className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-foreground font-bold text-background`}>
      {name[0].toUpperCase()}
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================
export default function SupportersSection() {
  // Cumulative seat ranges for ladder display
  let cum = 0
  const ladder = PRICE_LADDER.map(t => {
    const from = cum + 1
    cum += t.seats ?? 0
    const isPast    = t.price < CURRENT.price
    const isCurrent = t.label === CURRENT.label
    return { ...t, from, to: t.seats ? cum : null, isPast, isCurrent }
  })

  const nextPrice = PRICE_LADDER.find(t => t.price > CURRENT.price)?.price

  return (
    <section id='supporters' className='overflow-hidden bg-background py-32'>
      <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>

        {/* ── Header ───────────────────────────────────────────────── */}
        <motion.div {...fadeUp()} className='mb-20 text-center'>
          <p className='font-label mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary'>
            Pro License
          </p>
          <h2
            className='mb-4 font-bold tracking-tight text-foreground'
            style={{ fontSize: 'clamp(2rem, 1.5rem + 1.5vw, 3rem)', lineHeight: 1.15 }}>
            One-time. Lifetime. No subscriptions.
          </h2>
          <p className='mx-auto max-w-md text-base text-default-500'>
            Self-host with full Pro features — pay once, own it forever. Price increases as early seats fill.
          </p>
        </motion.div>

        {/* ── Main layout: price card + right column ───────────────── */}
        <div className='mb-24 grid items-stretch gap-6 lg:grid-cols-[1fr_360px]'>

          {/* Price card */}
          <motion.div {...fadeUp(0.05)} className='rounded-3xl border border-default-200 bg-content1 p-8 lg:p-10'>

            <div className='mb-6 inline-flex items-center gap-2 rounded-full border border-default-200 bg-content2 px-3 py-1.5 text-xs font-semibold text-default-600'>
              {REMAINING !== null
                ? <><span className='h-1.5 w-1.5 animate-pulse rounded-full bg-success' />{REMAINING} seat{REMAINING === 1 ? '' : 's'} left at this price</>
                : <><span className='h-1.5 w-1.5 rounded-full bg-default-400' />Standard pricing</>}
            </div>

            <div className='mb-2 flex items-end gap-3'>
              <span className='font-black text-foreground' style={{ fontSize: 'clamp(3.5rem, 3rem + 1.5vw, 5rem)', lineHeight: 1 }}>
                ${CURRENT.price}
              </span>
              {CURRENT.price < 499 && (
                <span className='mb-3 text-2xl font-medium text-default-300 line-through'>$499</span>
              )}
            </div>
            <p className='mb-2 text-sm font-medium text-default-500'>
              {CURRENT.label} · one-time · lifetime license · per instance
            </p>
            {nextPrice && (
              <p className='mb-8 text-xs text-warning-600'>
                Price increases to ${nextPrice} after this batch
              </p>
            )}

            {REMAINING !== null && CURRENT.seats !== null && (
              <div className='mb-8'>
                <div className='mb-2 flex justify-between text-xs text-default-400'>
                  <span>{TOTAL_SOLD} sold</span>
                  <span>{CURRENT.seats} seats total</span>
                </div>
                <div className='h-1.5 w-full overflow-hidden rounded-full bg-content3'>
                  <motion.div
                    className='h-full rounded-full bg-primary'
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.max(2, PCT * 100)}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            <div className='mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2'>
              {PRO_PERKS.map(p => (
                <div key={p.label} className='flex items-start gap-3'>
                  <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8'>
                    <Icon icon={p.icon} className='h-4 w-4 text-primary' />
                  </div>
                  <div>
                    <p className='text-sm font-semibold text-foreground'>{p.label}</p>
                    <p className='text-xs text-default-400'>{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <a
              href={MAILTO}
              className='flex w-full items-center justify-center gap-2.5 rounded-2xl bg-foreground px-6 py-4 text-sm font-bold text-background transition-opacity hover:opacity-85'>
              <Icon icon='lucide:mail' className='h-4 w-4' />
              Get Pro License — ${CURRENT.price}
            </a>
            <p className='mt-3 text-center text-xs text-default-400'>
              Reply within 24 h · License delivered via email
            </p>
          </motion.div>

          {/* Right column: ladder + community */}
          <div className='flex flex-col gap-4 lg:h-full'>

            {/* Price Ladder */}
            <motion.div {...fadeUp(0.1)} className='rounded-3xl border border-default-200 bg-content1 p-6'>
              <p className='mb-4 text-xs font-bold uppercase tracking-widest text-default-400'>Price Ladder</p>
              <div className='space-y-2'>
                {ladder.map(t => (
                  <div
                    key={t.label}
                    className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all ${
                      t.isCurrent ? 'bg-primary/6 ring-1 ring-primary/20' : t.isPast ? 'opacity-40' : 'bg-content2'
                    }`}>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                      t.isCurrent ? 'bg-primary text-primary-foreground' : t.isPast ? 'bg-default-200 text-default-400' : 'bg-content3 text-default-500'
                    }`}>
                      {t.isPast ? <Icon icon='lucide:check' className='h-3 w-3' /> : PRICE_LADDER.indexOf(t as typeof PRICE_LADDER[number]) + 1}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p className={`truncate text-sm font-semibold ${t.isCurrent ? 'text-primary' : 'text-foreground'}`}>{t.label}</p>
                      <p className='truncate text-[11px] text-default-400'>
                        {t.seats ? `${t.from}–${t.to} seats` : `${t.from}+ · unlimited`}
                      </p>
                    </div>
                    <div className='shrink-0 text-right'>
                      <p className={`text-lg font-black ${t.isCurrent ? 'text-primary' : 'text-foreground'}`}>${t.price}</p>
                      {t.isCurrent && <p className='text-[9px] font-bold uppercase tracking-wider text-success'>current</p>}
                    </div>
                  </div>
                ))}
              </div>
              <p className='mt-4 text-[11px] leading-relaxed text-default-400'>
                Your price is locked in permanently at the rate when you purchase.
              </p>
            </motion.div>

            {/* Community Support */}
            <motion.div {...fadeUp(0.15)} className='flex flex-1 flex-col rounded-3xl border border-default-200 bg-content1 p-6'>
              <p className='mb-1 text-sm font-semibold text-foreground'>Just want to support the OSS project?</p>
              <p className='mb-4 text-xs text-default-500'>No Pro features needed — any support keeps the free tier alive.</p>
              <div className='flex flex-col gap-2'>
                <a
                  href='https://github.com/qorstack/qorstack-report'
                  target='_blank' rel='noopener noreferrer'
                  className='flex items-center gap-2 rounded-xl border border-default-200 bg-content2 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-content3'>
                  <Icon icon='mdi:github' className='h-4 w-4' />
                  Star on GitHub
                </a>
                <a
                  href='https://www.buymeacoffee.com/satangbuds3'
                  target='_blank' rel='noopener noreferrer'
                  className='flex items-center gap-2 rounded-xl bg-[#FFDD00] px-4 py-2.5 text-sm font-bold text-[#1a1a1a] transition-opacity hover:opacity-90'>
                  <Icon icon='lucide:coffee' className='h-4 w-4' />
                  Buy me a coffee
                </a>
                <PromptPaySection />
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Wall of Fame ─────────────────────────────────────────── */}
        <motion.div {...fadeUp()} className='mb-16 text-center'>
          <p className='font-label mb-3 text-xs font-bold uppercase tracking-[0.2em] text-default-400'>
            Wall of Fame
          </p>
          <h3
            className='mb-3 font-bold tracking-tight text-foreground'
            style={{ fontSize: 'clamp(1.5rem, 1rem + 1.5vw, 2rem)', lineHeight: 1.2 }}>
            People who made this possible
          </h3>
          <p className='mx-auto max-w-sm text-sm text-default-500'>
            Thank you for believing in this project early.
          </p>
        </motion.div>

        {/* ── Founder ──────────────────────────────────────────────── */}
        <motion.div {...fadeUp(0.05)} className='mb-12'>
          <p className='mb-5 text-[11px] font-bold uppercase tracking-widest text-default-400'>Founder</p>
          <div className='inline-flex items-center gap-4 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/5 to-transparent px-6 py-5'>
            <div className='relative'>
              <AvatarCircle name={FOUNDER.name} src={FOUNDER.avatar} size='lg' />
              <span className='absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 shadow'>
                <Icon icon='lucide:crown' className='h-2.5 w-2.5 text-white' />
              </span>
            </div>
            <div>
              <p className='text-base font-bold text-foreground'>{FOUNDER.name}</p>
              <p className='mb-2 text-sm text-default-500'>{FOUNDER.role}</p>
              {FOUNDER.link && (
                <a
                  href={FOUNDER.link}
                  target='_blank' rel='noopener noreferrer'
                  className='inline-flex items-center gap-1.5 text-xs text-default-400 transition-colors hover:text-foreground'>
                  <Icon icon='mdi:github' className='h-3.5 w-3.5' />
                  qorstack
                </a>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Enterprise ───────────────────────────────────────────── */}
        <motion.div {...fadeUp(0.1)} className='mb-12'>
          <p className='mb-5 text-[11px] font-bold uppercase tracking-widest text-default-400'>Enterprise</p>
          {ENTERPRISE.length === 0 ? (
            <div className='flex items-center gap-4 rounded-2xl border border-dashed border-default-200 bg-content1/50 px-6 py-5'>
              <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-default-200 bg-content2'>
                <Icon icon='lucide:building-2' className='h-5 w-5 text-default-300' />
              </div>
              <div>
                <p className='text-sm font-medium text-default-400'>Your company here</p>
                <p className='text-xs text-default-300'>Be the first Enterprise supporter</p>
              </div>
              <a
                href={MAILTO}
                className='ml-auto shrink-0 rounded-xl border border-default-200 px-4 py-2 text-xs font-semibold text-default-500 transition-colors hover:bg-content2'>
                Get License
              </a>
            </div>
          ) : (
            <div className='grid gap-3 sm:grid-cols-2'>
              {ENTERPRISE.map((e, i) => {
                const Wrapper = e.link ? 'a' : 'div'
                const extra = e.link ? { href: e.link, target: '_blank' as const, rel: 'noopener noreferrer' } : {}
                return (
                  <motion.div key={e.name} {...fadeUp(i * 0.05)}>
                    <Wrapper {...extra} className='flex items-center gap-4 rounded-2xl border border-default-200 bg-content1 px-6 py-5 transition-colors hover:bg-content2'>
                      <AvatarCircle name={e.name} src={e.avatar} size='md' />
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-bold text-foreground'>{e.name}</p>
                        {e.company && <p className='truncate text-xs text-default-500'>{e.company}</p>}
                        {e.role && <p className='truncate text-xs text-default-400'>{e.role}</p>}
                      </div>
                      <span className='ml-auto shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary'>
                        Standard
                      </span>
                    </Wrapper>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* ── Supporters ───────────────────────────────────────────── */}
        <motion.div {...fadeUp(0.15)}>
          <p className='mb-5 text-[11px] font-bold uppercase tracking-widest text-default-400'>Supporters</p>
          <div className='flex gap-3 overflow-x-auto pb-2' style={{ scrollbarWidth: 'none' }}>
            {SUPPORTERS.length === 0
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className='flex w-[160px] shrink-0 items-center gap-3 rounded-2xl border border-dashed border-default-200 bg-content1/50 px-4 py-3.5'>
                    <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-default-200 bg-content2'>
                      <Icon icon='lucide:user' className='h-4 w-4 text-default-300' />
                    </div>
                    <div className='min-w-0'>
                      <p className='text-sm font-medium text-default-300'>#{i + 1}</p>
                      <span className='mt-0.5 inline-block rounded-full bg-default-100 px-2 py-0.5 text-[10px] font-bold text-default-300'>Supporter</span>
                    </div>
                  </div>
                ))
              : SUPPORTERS.map((s, i) => {
                  const { label, style } = SUPPORTER_TIER[s.tier]
                  const Wrapper = s.link ? 'a' : 'div'
                  const extra = s.link ? { href: s.link, target: '_blank' as const, rel: 'noopener noreferrer' } : {}
                  return (
                    <motion.div key={s.name} {...fadeUp(Math.min(i * 0.04, 0.3))} className='shrink-0'>
                      <Wrapper {...extra} className='flex w-[160px] items-center gap-3 rounded-2xl border border-default-200 bg-content1 px-4 py-3.5 transition-colors hover:bg-content2'>
                        <AvatarCircle name={s.name} src={s.avatar} size='sm' />
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-semibold text-foreground'>{s.name}</p>
                          <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${style}`}>{label}</span>
                        </div>
                      </Wrapper>
                    </motion.div>
                  )
                })
            }
          </div>
        </motion.div>

        <p className='mt-10 text-center text-xs text-default-400'>
          Wall updated every 24–48 h ·{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className='text-primary underline underline-offset-2'>{CONTACT_EMAIL}</a>
        </p>
      </div>
    </section>
  )
}
