'use client'

import React, { useState, useMemo } from 'react'
import Icon from '@/components/icon'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

// ─── Animation ───────────────────────────────────────────────

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] }
}

const stagger = (delay: number) => ({
  ...fadeUp,
  transition: { duration: 0.5, delay, ease: [0.25, 1, 0.5, 1] }
})

// ─── Types ───────────────────────────────────────────────────

type WallTier = 'supporter' | 'early-adopter' | 'founding-member'

interface WallMemberData {
  name: string
  tier: WallTier
  avatar?: string
  github?: string
  link?: string
}

interface TierFeature {
  text: string
  highlight?: boolean
}

// ─── Mock Data: Wall of Fame ─────────────────────────────────

const MOCK_MEMBERS: WallMemberData[] = [
  // Founding Members (large slots)
  { name: 'Alex Chen', tier: 'founding-member', github: 'alexchen', link: 'https://alexchen.dev' },
  { name: 'Sarah Kim', tier: 'founding-member', github: 'sarahkim', link: 'https://sarahkim.io' },
  { name: 'Marcus Weber', tier: 'founding-member', github: 'mweber' },
  { name: 'Yuki Tanaka', tier: 'founding-member', github: 'yukitan', link: 'https://yukitan.dev' },
  { name: 'Leo Moretti', tier: 'founding-member', github: 'leom' },
  // Early Adopters (medium slots)
  { name: 'Priya Patel', tier: 'early-adopter', github: 'priyap' },
  { name: 'Tom Nilsson', tier: 'early-adopter', github: 'tomnils' },
  { name: 'Anja Becker', tier: 'early-adopter', github: 'anjab' },
  { name: 'Omar Farouk', tier: 'early-adopter', github: 'omarf' },
  { name: 'Mei Lin', tier: 'early-adopter' },
  { name: 'Jonas Berg', tier: 'early-adopter', github: 'jonasb' },
  { name: 'Isla Murray', tier: 'early-adopter' },
  // Supporters (small slots)
  { name: 'David R.', tier: 'supporter' },
  { name: 'Nina K.', tier: 'supporter' },
  { name: 'Sam Torres', tier: 'supporter' },
  { name: 'Lena V.', tier: 'supporter' },
  { name: 'Chris Park', tier: 'supporter' },
  { name: 'Ravi S.', tier: 'supporter' }
]

const FOUNDING_STATS = {
  currentPrice: 99,
  nextPrice: 149,
  finalPrice: 199,
  membersFilled: 5,
  spotsAtCurrentPrice: 30,
  totalSpots: 100,
  totalSupporters: 6,
  totalEarlyAdopters: 7
}

// ─── Sub-components ──────────────────────────────────────────

const CheckIcon = ({ className = 'text-success' }: { className?: string }) => (
  <Icon icon='lucide:check' className={`mt-0.5 h-4 w-4 shrink-0 ${className}`} />
)

const SectionBadge = ({ icon, label }: { icon: string; label: string }) => (
  <div className='mb-6 inline-flex items-center gap-2 rounded-full border border-default-700/80 bg-default-800/60 px-4 py-1.5'>
    <Icon icon={icon} className='h-3.5 w-3.5 text-primary' />
    <span className='text-[11px] font-bold uppercase tracking-widest text-default-300'>{label}</span>
  </div>
)

// ─── Progress Bar ────────────────────────────────────────────

const SpotsProgressBar = () => {
  const { membersFilled, spotsAtCurrentPrice } = FOUNDING_STATS
  const pct = (membersFilled / spotsAtCurrentPrice) * 100
  const remaining = spotsAtCurrentPrice - membersFilled

  return (
    <div className='mt-5'>
      <div className='mb-2 flex items-center justify-between text-[11px]'>
        <span className='font-bold uppercase tracking-wider text-primary'>
          {remaining} spots left at ${FOUNDING_STATS.currentPrice}
        </span>
        <span className='tabular-nums text-default-500'>
          {membersFilled} / {spotsAtCurrentPrice}
        </span>
      </div>
      <div className='h-1.5 w-full overflow-hidden rounded-full bg-default-700/60'>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3, ease: [0.25, 1, 0.5, 1] }}
          className='h-full rounded-full bg-gradient-to-r from-primary to-danger'
        />
      </div>
    </div>
  )
}

// ─── Step Pricing Display ────────────────────────────────────

const StepPricing = () => {
  const { currentPrice, nextPrice, finalPrice } = FOUNDING_STATS

  return (
    <div className='mt-4 space-y-2'>
      <div className='flex items-stretch gap-1'>
        {/* $99 — 1-30 */}
        <div className={`flex flex-1 flex-col items-center rounded-lg border px-2 py-2 ${
          currentPrice === 99 ? 'border-primary/30 bg-primary/10' : 'border-default-700/50 bg-default-800/50'
        }`}>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${currentPrice === 99 ? 'text-primary/70' : 'text-default-600'}`}>
            {currentPrice === 99 ? 'Now' : ''}
          </span>
          <span className={`text-base font-black tabular-nums ${currentPrice === 99 ? 'text-primary' : 'text-default-500'}`}>$99</span>
          <span className='text-[9px] text-default-500'>1–30</span>
        </div>
        <div className='flex items-center text-default-600'>
          <Icon icon='lucide:chevron-right' className='h-3.5 w-3.5' />
        </div>
        {/* $149 — 31-70 */}
        <div className={`flex flex-1 flex-col items-center rounded-lg border px-2 py-2 ${
          currentPrice === 149 ? 'border-primary/30 bg-primary/10' : 'border-default-700/50 bg-default-800/50'
        }`}>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${currentPrice === 149 ? 'text-primary/70' : 'text-default-600'}`}>
            {currentPrice === 149 ? 'Now' : ''}
          </span>
          <span className={`text-base font-black tabular-nums ${currentPrice === 149 ? 'text-primary' : 'text-default-500'}`}>${nextPrice}</span>
          <span className='text-[9px] text-default-500'>31–70</span>
        </div>
        <div className='flex items-center text-default-600'>
          <Icon icon='lucide:chevron-right' className='h-3.5 w-3.5' />
        </div>
        {/* $199 — 71-100 */}
        <div className={`flex flex-1 flex-col items-center rounded-lg border px-2 py-2 ${
          currentPrice === 199 ? 'border-primary/30 bg-primary/10' : 'border-default-700/50 bg-default-800/50'
        }`}>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${currentPrice === 199 ? 'text-primary/70' : 'text-default-600'}`}>
            {currentPrice === 199 ? 'Now' : ''}
          </span>
          <span className={`text-base font-black tabular-nums ${currentPrice === 199 ? 'text-primary' : 'text-default-500'}`}>${finalPrice}</span>
          <span className='text-[9px] text-default-500'>71–100</span>
        </div>
      </div>
    </div>
  )
}

// ─── BMC-style Button ────────────────────────────────────────

const BuyButton = ({
  children,
  variant = 'default',
  onClick
}: {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'founder'
  onClick?: () => void
}) => {
  const styles = {
    default:
      'border border-default-700 bg-default-800 text-default-200 hover:bg-default-700 hover:border-default-600',
    primary:
      'bg-primary text-primary-foreground hover:opacity-90 shadow-glow',
    founder:
      'bg-gradient-to-r from-primary to-primary-600 text-primary-foreground hover:opacity-90 shadow-glow'
  }

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-bold transition-all ${styles[variant]}`}>
      <Icon icon='lucide:heart' className='h-4 w-4' />
      {children}
    </button>
  )
}

// ─── Pricing Card ────────────────────────────────────────────

const PricingCard = ({
  title,
  price,
  period,
  desc,
  features,
  badge,
  badgeVariant = 'default',
  highlight = false,
  isFounder = false,
  buttonText,
  buttonVariant = 'default',
  onButtonClick,
  delay = 0,
  children
}: {
  title: string
  price: string
  period?: string
  desc: string
  features: TierFeature[]
  badge?: string
  badgeVariant?: 'default' | 'highlight' | 'founder'
  highlight?: boolean
  isFounder?: boolean
  buttonText: string
  buttonVariant?: 'default' | 'primary' | 'founder'
  onButtonClick?: () => void
  delay?: number
  children?: React.ReactNode
}) => {
  const badgeStyles = {
    default: 'border-default-700 bg-default-800 text-default-400',
    highlight: 'border-success/30 bg-success/10 text-success',
    founder: 'border-primary/40 bg-primary/10 text-primary'
  }

  return (
    <motion.div
      {...stagger(delay)}
      className={`relative flex flex-col rounded-2xl p-7 transition-all duration-300 ${
        isFounder
          ? 'z-10 border-2 border-primary/40 bg-gradient-to-b from-default-800/90 to-default-900 lg:-translate-y-3'
          : highlight
            ? 'border border-default-600/60 bg-default-800/70 hover:border-default-500'
            : 'border border-default-700/50 bg-default-800/40 hover:border-default-600/60'
      }`}>

      {/* Glow for Founding Member */}
      {isFounder && (
        <div className='pointer-events-none absolute inset-0 overflow-hidden rounded-2xl'>
          <div className='absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary opacity-15 blur-[50px]' />
          <div className='absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-danger opacity-10 blur-[40px]' />
        </div>
      )}

      {/* Badge */}
      {badge && (
        <div className='absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2'>
          <span
            className={`whitespace-nowrap rounded-full border px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest ${badgeStyles[badgeVariant]}`}>
            {badge}
          </span>
        </div>
      )}

      <div className='relative z-10 flex flex-1 flex-col'>
        <h3 className='mb-1.5 text-lg font-bold text-white'>{title}</h3>
        <p className='mb-5 text-[13px] leading-relaxed text-default-400'>{desc}</p>

        {/* Price */}
        <div className='mb-6'>
          {price === '$0' ? (
            <div>
              <span className='text-4xl font-black tabular-nums text-white'>$0</span>
              <span className='ml-2 text-sm font-medium text-default-500'>forever</span>
            </div>
          ) : (
            <>
              <span className='text-4xl font-black tabular-nums text-white'>${price}</span>
              {period && <span className='ml-1 text-sm font-medium text-default-500'>{period}</span>}
            </>
          )}
          {children}
        </div>

        {/* Button */}
        <div className='mb-7'>
          <BuyButton variant={buttonVariant} onClick={onButtonClick}>
            {buttonText}
          </BuyButton>
        </div>

        {/* Features */}
        <ul className='mt-auto space-y-3'>
          {features.map((f, i) => (
            <li
              key={i}
              className={`flex items-start gap-2.5 text-[13px] leading-snug ${
                f.highlight ? 'font-semibold text-primary' : 'text-default-300'
              }`}>
              <CheckIcon className={f.highlight ? 'text-primary' : 'text-success/80'} />
              {f.text}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}

// ─── Wall of Fame: Slot Components ───────────────────────────

// Founding Member — large bento slot (spans 2 cols)
const FoundingMemberSlot = ({ data }: { data: WallMemberData }) => {
  const initials = data.name.split(' ').map(n => n[0]).join('').toUpperCase()

  return (
    <div className='group col-span-2 flex items-center gap-4 rounded-lg border border-primary/25 bg-primary/[0.04] p-4 transition-all hover:border-primary/40 hover:bg-primary/[0.06]'>
      {/* Avatar */}
      <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary'>
        {initials}
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span className='truncate text-sm font-semibold text-white'>{data.name}</span>
          <span className='rounded bg-primary/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-primary'>
            Founder
          </span>
        </div>
        {data.link && (
          <span className='mt-0.5 block truncate text-[11px] text-default-500 transition-colors group-hover:text-default-400'>
            {data.link.replace('https://', '')}
          </span>
        )}
      </div>
      <div className='flex items-center gap-2'>
        {data.github && (
          <Icon icon='mdi:github' className='h-4 w-4 text-default-600 transition-colors group-hover:text-default-400' />
        )}
        {data.link && (
          <Icon icon='lucide:external-link' className='h-3.5 w-3.5 text-default-600 transition-colors group-hover:text-primary/60' />
        )}
      </div>
    </div>
  )
}

// Early Adopter — medium slot
const EarlyAdopterSlot = ({ data }: { data: WallMemberData }) => {
  const initials = data.name.split(' ').map(n => n[0]).join('').toUpperCase()

  return (
    <div className='group flex flex-col items-center justify-center gap-2.5 rounded-lg border border-secondary/20 bg-secondary/[0.03] p-3.5 transition-all hover:border-secondary/35 hover:bg-secondary/[0.05]'>
      {/* Avatar */}
      <div className='flex h-10 w-10 items-center justify-center rounded-full bg-secondary/12 text-xs font-bold text-secondary'>
        {initials}
      </div>
      <span className='max-w-full truncate text-[12px] font-medium text-default-300'>{data.name}</span>
      {data.github && (
        <Icon icon='mdi:github' className='h-3.5 w-3.5 text-default-600 transition-colors group-hover:text-default-400' />
      )}
    </div>
  )
}

// Supporter — small slot (name only)
const SupporterSlot = ({ data }: { data: WallMemberData }) => (
  <div className='flex items-center justify-center rounded-xl border border-default-700/40 bg-default-800/20 px-2 py-3 transition-all hover:border-default-600/60 hover:bg-default-800/40'>
    <span className='truncate text-[11px] font-medium text-default-500'>{data.name}</span>
  </div>
)

// Empty slot
const EmptySlot = ({ tier }: { tier: 'founding-member' | 'early-adopter' | 'supporter' }) => {
  const [hovered, setHovered] = useState(false)

  const borderClass =
    tier === 'founding-member'
      ? 'border-primary/15 hover:border-primary/30 hover:bg-primary/[0.02]'
      : tier === 'early-adopter'
        ? 'border-secondary/10 hover:border-secondary/25 hover:bg-secondary/[0.02]'
        : 'border-default-700/30 hover:border-default-600/50 hover:bg-default-800/30'

  const isWide = tier === 'founding-member'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed transition-all ${borderClass} ${
        isWide ? 'col-span-2 py-4' : 'flex-col py-3'
      }`}>
      <Icon
        icon='lucide:plus'
        className={`transition-colors ${isWide ? 'h-4 w-4' : 'h-4 w-4'} ${
          hovered ? 'text-default-400' : 'text-default-700'
        }`}
      />
      <span className={`text-[10px] font-medium transition-colors ${hovered ? 'text-default-400' : 'text-default-700'}`}>
        {hovered ? 'Claim your legacy' : 'Available'}
      </span>
    </div>
  )
}

// ─── Comparison Table ────────────────────────────────────────

const ComparisonRow = ({
  feature,
  supporter,
  earlyAdopter,
  foundingMember,
  icon
}: {
  feature: string
  supporter: string
  earlyAdopter: string
  foundingMember: string
  icon?: string
}) => (
  <tr className='border-b border-default-800/60 transition-colors last:border-0 hover:bg-default-800/20'>
    <td className='py-3.5 pr-4 text-[13px] text-default-300'>
      <span className='flex items-center gap-2'>
        {icon && <Icon icon={icon} className='h-3.5 w-3.5 text-default-500' />}
        {feature}
      </span>
    </td>
    <td className='px-3 py-3.5 text-center text-[13px] text-default-400'>
      <CellValue value={supporter} />
    </td>
    <td className='px-3 py-3.5 text-center text-[13px] text-default-300'>
      <CellValue value={earlyAdopter} />
    </td>
    <td className='px-3 py-3.5 text-center text-[13px] font-medium text-primary'>
      <CellValue value={foundingMember} variant='primary' />
    </td>
  </tr>
)

const CellValue = ({ value, variant }: { value: string; variant?: 'primary' }) => {
  if (value === 'check')
    return <Icon icon='lucide:check' className={`mx-auto h-4 w-4 ${variant === 'primary' ? 'text-primary' : 'text-success'}`} />
  if (value === '-')
    return <Icon icon='lucide:minus' className='mx-auto h-4 w-4 text-default-700' />
  return <span>{value}</span>
}

// ─── FAQ ─────────────────────────────────────────────────────

const faqData = [
  {
    q: 'What does "Price Lock" mean?',
    a: 'Once you support Qorstack Report, your recurring rate locks forever — Supporters get $7.99/mo (vs $10 standard), Early Adopters get $19/mo (vs $29). This is our thank-you for early support.'
  },
  {
    q: 'When do I get the free PRO license?',
    a: 'Early Adopters ($39) receive 3 months of PRO free, and Founding Members ($99+) receive a full year free. These activate upon the official Qorstack Report 1.0 launch. During beta, all supporters enjoy full access.'
  },
  {
    q: 'How does the Founding Member step pricing work?',
    a: 'It starts at $99 for the first 30 seats (Early Believers). After 30 seats, the price rises to $149 (Mainstage Pioneers). After 70 seats, it becomes $199 (Elite Founders). Only 100 seats will ever exist.'
  },
  {
    q: 'Can I upgrade my tier later?',
    a: 'Yes. If you started as a Supporter and want to become a Founding Member, you pay only the difference at the current Founding Member price at the time of upgrade.'
  },
  {
    q: 'Is the Feedback tier actually free?',
    a: 'Yes, completely free — $0, no card required. We value your feedback during beta. In return, you get a 60-day Pro Trial to test everything Qorstack Report offers before deciding on a paid tier.'
  },
  {
    q: 'What is the Wall of Fame?',
    a: 'Every paid supporter gets permanent recognition on our public Wall of Fame. Supporters get their name listed. Early Adopters get a featured slot with their avatar. Founding Members get the largest bento slot with a custom link and badge.'
  }
]

const FAQItem = ({ q, a, delay }: { q: string; a: string; delay: number }) => {
  const [open, setOpen] = useState(false)

  return (
    <motion.div {...stagger(delay)} className='border-b border-default-700/50 last:border-0'>
      <button
        onClick={() => setOpen(!open)}
        className='flex w-full items-center justify-between py-5 text-left transition-colors hover:text-primary'>
        <span className='pr-4 text-[15px] font-semibold text-default-200'>{q}</span>
        <Icon
          icon={open ? 'lucide:minus' : 'lucide:plus'}
          className='h-4 w-4 shrink-0 text-default-500 transition-transform'
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className='overflow-hidden'>
        <p className='pb-5 text-sm leading-relaxed text-default-400'>{a}</p>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Page ───────────────────────────────────────────────

const PricingPage = () => {
  const router = useRouter()

  // Split members by tier
  const foundingMembers = useMemo(() => MOCK_MEMBERS.filter(m => m.tier === 'founding-member'), [])
  const earlyAdopters = useMemo(() => MOCK_MEMBERS.filter(m => m.tier === 'early-adopter'), [])
  const supporters = useMemo(() => MOCK_MEMBERS.filter(m => m.tier === 'supporter'), [])

  // Empty slots per section
  const emptyFoundingSlots = FOUNDING_STATS.totalSpots - FOUNDING_STATS.membersFilled
  const emptyAdopterSlots = Math.max(0, 20 - earlyAdopters.length) // room for growth
  const emptySupporterSlots = Math.max(0, 16 - supporters.length) // room for growth

  return (
    <div className='min-h-screen bg-surface'>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className='relative overflow-hidden border-b border-default-800 px-4 pb-20 pt-32 text-center sm:px-6 lg:px-8'>
        {/* Subtle grid */}
        <div
          className='pointer-events-none absolute inset-0 opacity-[0.04]'
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />
        <div className='pointer-events-none absolute left-1/2 top-0 h-64 w-[600px] -translate-x-1/2 bg-primary/[0.06] blur-[100px]' />

        <motion.div {...fadeUp} className='relative z-10 mx-auto max-w-3xl'>
          <SectionBadge icon='lucide:rocket' label='Early Access' />

          <h1
            className='mb-5 font-black tracking-tight text-white'
            style={{ fontSize: 'clamp(2rem, 1.5rem + 2vw, 3.25rem)' }}>
            Back Qorstack Report. Shape its future.
          </h1>
          <p className='mx-auto max-w-2xl text-base leading-relaxed text-default-400 sm:text-lg'>
            Qorstack Report is in active development. Support the project now and lock in
            $15/month lifetime rates, earn your spot on the Wall of Fame, and help
            decide what gets built next.
          </p>
        </motion.div>
      </section>

      {/* ── Pricing Cards ─────────────────────────────────── */}
      <section className='relative z-20 px-4 py-20 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-6xl'>
          <div className='grid gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-4 xl:gap-5'>

            {/* Feedback — $0 */}
            <PricingCard
              title='Feedback'
              price='$0'
              desc='Help us improve Qorstack Report during beta. Your feedback shapes the product.'
              badge='60-Day Pro Trial'
              badgeVariant='default'
              buttonText='Share Feedback'
              buttonVariant='default'
              delay={0}
              features={[
                { text: 'Full platform access for 60 days' },
                { text: 'All PRO features unlocked' },
                { text: 'Community Discord access' },
                { text: 'Shape the product roadmap' }
              ]}
            />

            {/* Supporter — $15 */}
            <PricingCard
              title='Supporter'
              price='15'
              period='one-time'
              desc='Lock in Starter pricing at $7.99/mo after launch.'
              buttonText='Support for $15'
              buttonVariant='default'
              delay={0.08}
              features={[
                { text: 'Starter Price Lock — $7.99/mo', highlight: true },
                { text: 'Early Access' },
                { text: 'Name on Wall of Fame' },
                { text: 'Standard support' }
              ]}
            />

            {/* Early Adopter — $39 */}
            <PricingCard
              title='Early Adopter'
              price='39'
              period='one-time'
              desc='Lock in Pro pricing and get 3 months free.'
              highlight
              buttonText='Adopt for $39'
              buttonVariant='primary'
              delay={0.16}
              features={[
                { text: '3-Month PRO License — FREE', highlight: true },
                { text: 'Pro Price Lock — $19/mo', highlight: true },
                { text: 'Wall of Fame slot + avatar' },
                { text: 'High priority support' },
                { text: 'Vote on feature prioritization' }
              ]}
            />

            {/* Founding Member — $99→$149 */}
            <PricingCard
              title='Founding Member'
              price={String(FOUNDING_STATS.currentPrice)}
              period='one-time'
              desc='The highest honor. Only 100 will ever hold this status.'
              badge='Limited 100 Seats'
              badgeVariant='founder'
              isFounder
              buttonText='Claim Founding Seat'
              buttonVariant='founder'
              delay={0.24}
              features={[
                { text: '1-Year PRO License — FREE', highlight: true },
                { text: 'White-label (permanent)', highlight: true },
                { text: 'Bento Wall (Elite)' },
                { text: 'Top priority support' },
                { text: 'Direct line to the core team' }
              ]}>
              <StepPricing />
              <SpotsProgressBar />
            </PricingCard>

          </div>
        </div>
      </section>

      {/* ── Comparison Table ──────────────────────────────── */}
      <section className='border-t border-default-800 px-4 py-20 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-3xl'>
          <motion.div {...fadeUp} className='mb-10 text-center'>
            <h2 className='mb-3 text-xl font-bold text-white'>Compare Benefits</h2>
            <p className='text-sm text-default-400'>What you get at each support level.</p>
          </motion.div>

          <motion.div {...stagger(0.1)} className='overflow-x-auto rounded-xl border border-default-700/50 bg-default-800/20'>
            <table className='w-full min-w-[500px] text-left'>
              <thead>
                <tr className='border-b border-default-700/50'>
                  <th className='px-5 py-4 text-[12px] font-bold uppercase tracking-wider text-default-500'>Benefit</th>
                  <th className='px-3 py-4 text-center text-[12px] font-bold uppercase tracking-wider text-default-500'>
                    Supporter
                    <span className='block text-[10px] font-medium normal-case tracking-normal text-default-600'>$15</span>
                  </th>
                  <th className='px-3 py-4 text-center text-[12px] font-bold uppercase tracking-wider text-default-400'>
                    Early Adopter
                    <span className='block text-[10px] font-medium normal-case tracking-normal text-default-600'>$39</span>
                  </th>
                  <th className='px-3 py-4 text-center text-[12px] font-bold uppercase tracking-wider text-primary'>
                    Founding Member
                    <span className='block text-[10px] font-medium normal-case tracking-normal text-primary/60'>${FOUNDING_STATS.currentPrice}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow
                  feature='Price Lock'
                  icon='lucide:lock'
                  supporter='$7.99/mo'
                  earlyAdopter='$19/mo'
                  foundingMember='check'
                />
                <ComparisonRow
                  feature='Free PRO License'
                  icon='lucide:crown'
                  supporter='-'
                  earlyAdopter='3 months'
                  foundingMember='1 year'
                />
                <ComparisonRow
                  feature='White-label'
                  icon='lucide:palette'
                  supporter='-'
                  earlyAdopter='-'
                  foundingMember='Permanent'
                />
                <ComparisonRow
                  feature='Wall of Fame'
                  icon='lucide:trophy'
                  supporter='Name only'
                  earlyAdopter='Name + Avatar'
                  foundingMember='Bento (Elite)'
                />
                <ComparisonRow
                  feature='Support Level'
                  icon='lucide:headphones'
                  supporter='Standard'
                  earlyAdopter='High'
                  foundingMember='Top Priority'
                />
                <ComparisonRow
                  feature='Feature Voting'
                  icon='lucide:vote'
                  supporter='-'
                  earlyAdopter='check'
                  foundingMember='check'
                />
                <ComparisonRow
                  feature='Direct Team Access'
                  icon='lucide:message-circle'
                  supporter='-'
                  earlyAdopter='-'
                  foundingMember='check'
                />
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* ── Wall of Fame ──────────────────────────────────── */}
      <section className='border-t border-default-800 px-4 py-24 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-5xl'>
          <motion.div {...fadeUp} className='mb-12 text-center'>
            <SectionBadge icon='lucide:trophy' label='Wall of Fame' />
            <h2
              className='mb-4 font-bold tracking-tight text-white'
              style={{ fontSize: 'clamp(1.5rem, 1.2rem + 1.2vw, 2.25rem)' }}>
              The people building Qorstack Report
            </h2>
            <p className='mx-auto max-w-xl text-sm leading-relaxed text-default-400 sm:text-base'>
              Every supporter gets permanent recognition. Founding Members get the
              largest slots, Early Adopters are featured with avatars, and Supporters
              are listed by name.
            </p>
          </motion.div>

          {/* ── Founding Members (Large Bento Slots) ── */}
          <motion.div {...stagger(0.1)}>
            <div className='mb-3 flex items-center gap-2'>
              <div className='h-2 w-2 rounded-full bg-primary' />
              <h3 className='text-[12px] font-bold uppercase tracking-widest text-primary/80'>
                Founding Members
              </h3>
              <span className='text-[11px] tabular-nums text-default-600'>
                {foundingMembers.length} / {FOUNDING_STATS.totalSpots}
              </span>
            </div>
            <div className='mb-10 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3'>
              {foundingMembers.map((m, i) => (
                <FoundingMemberSlot key={i} data={m} />
              ))}
              {/* Show a few empty founding slots */}
              {Array.from({ length: Math.min(emptyFoundingSlots, 7) }, (_, i) => (
                <EmptySlot key={`ef-${i}`} tier='founding-member' />
              ))}
            </div>
          </motion.div>

          {/* ── Early Adopters (Medium Slots) ── */}
          <motion.div {...stagger(0.15)}>
            <div className='mb-3 flex items-center gap-2'>
              <div className='h-2 w-2 rounded-full bg-secondary' />
              <h3 className='text-[12px] font-bold uppercase tracking-widest text-secondary/80'>
                Early Adopters
              </h3>
              <span className='text-[11px] tabular-nums text-default-600'>{earlyAdopters.length}</span>
            </div>
            <div className='mb-10 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8'>
              {earlyAdopters.map((m, i) => (
                <EarlyAdopterSlot key={i} data={m} />
              ))}
              {Array.from({ length: Math.min(emptyAdopterSlots, 5) }, (_, i) => (
                <EmptySlot key={`ea-${i}`} tier='early-adopter' />
              ))}
            </div>
          </motion.div>

          {/* ── Supporters (Small Slots) ── */}
          <motion.div {...stagger(0.2)}>
            <div className='mb-3 flex items-center gap-2'>
              <div className='h-2 w-2 rounded-full bg-default-500' />
              <h3 className='text-[12px] font-bold uppercase tracking-widest text-default-500'>
                Supporters
              </h3>
              <span className='text-[11px] tabular-nums text-default-600'>{supporters.length}</span>
            </div>
            <div className='grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10'>
              {supporters.map((m, i) => (
                <SupporterSlot key={i} data={m} />
              ))}
              {Array.from({ length: Math.min(emptySupporterSlots, 6) }, (_, i) => (
                <EmptySlot key={`es-${i}`} tier='supporter' />
              ))}
            </div>
          </motion.div>

          {/* Gallery stats */}
          <motion.div
            {...stagger(0.25)}
            className='mt-12 flex flex-wrap items-center justify-center gap-8 text-center'>
            <div>
              <div className='text-2xl font-black tabular-nums text-white'>
                {MOCK_MEMBERS.length}
              </div>
              <div className='text-[11px] font-medium uppercase tracking-wider text-default-500'>Total Supporters</div>
            </div>
            <div className='h-8 w-px bg-default-700/60' />
            <div>
              <div className='text-2xl font-black tabular-nums text-primary'>
                {FOUNDING_STATS.totalSpots - FOUNDING_STATS.membersFilled}
              </div>
              <div className='text-[11px] font-medium uppercase tracking-wider text-default-500'>Founding Seats Left</div>
            </div>
            <div className='h-8 w-px bg-default-700/60' />
            <div>
              <div className='text-2xl font-black tabular-nums text-white'>
                ${FOUNDING_STATS.currentPrice}
              </div>
              <div className='text-[11px] font-medium uppercase tracking-wider text-default-500'>Current Founder Price</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className='border-t border-default-800 px-4 py-24 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-2xl'>
          <motion.div {...fadeUp} className='mb-10 text-center'>
            <h2 className='mb-3 text-2xl font-bold text-white'>Questions & Answers</h2>
            <p className='text-sm text-default-400'>Everything about backing, pricing, and what you get.</p>
          </motion.div>

          <div className='rounded-2xl border border-default-700/50 bg-default-800/30 px-6'>
            {faqData.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} delay={i * 0.04} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className='border-t border-default-800 px-4 py-24 sm:px-6 lg:px-8'>
        <motion.div {...fadeUp} className='mx-auto max-w-2xl text-center'>
          <h2 className='mb-4 text-2xl font-bold text-white'>Ready to build with Qorstack Report?</h2>
          <p className='mx-auto mb-8 max-w-lg text-base text-default-400'>
            Start with the Feedback tier at $0, or claim your Founding Member seat before the price increases.
          </p>
          <div className='flex flex-col items-center justify-center gap-3 sm:flex-row'>
            <button
              onClick={() => router.push('/docs')}
              className='rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-opacity hover:opacity-90'>
              Read Documentation
            </button>
            <button
              onClick={() => router.push('/#early-access')}
              className='rounded-xl border border-default-700 px-8 py-3.5 text-sm font-bold text-default-300 transition-colors hover:border-default-500 hover:bg-default-800'>
              View Early Access
            </button>
          </div>
        </motion.div>
      </section>
    </div>
  )
}

export default PricingPage
