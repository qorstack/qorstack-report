'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'
import Image from 'next/image'
import PromptPaySection from './promptpay-section'

// Neutral dark avatar style — consistent for all users without profile pictures
const AVATAR_STYLE = 'bg-[#2a3a5c] text-white'

type SupporterTier = 'creator' | 'enterprise' | 'Sponsor-backer' | 'early-adopter' | 'coffee-supporter'

interface TierStyle {
  label: string
  badgeBg: string
  badgeText: string
  avatarRing: string
  cardBg: string
  cardBorder: string
  cardShadow: string
  nameColor: string
  overlayGradient?: string
}

const TIER_CONFIG: Record<SupporterTier, TierStyle> = {
  creator: {
    label: 'Founder',
    badgeBg: 'bg-gradient-to-r from-[#1a1a2e] via-[#6B21A8] to-[#DB2777]',
    badgeText: 'text-white/95',
    avatarRing: 'ring-[3px] ring-[#7C3AED] ring-offset-2 ring-offset-content2',
    cardBg: 'bg-content2',
    cardBorder: 'border-2 border-[#7C3AED]/60',
    cardShadow: 'shadow-md shadow-[#7C3AED]/20',
    nameColor: 'text-foreground',
    overlayGradient: 'bg-gradient-to-b from-[#7C3AED]/10 via-transparent to-transparent'
  },
  enterprise: {
    label: 'Legendary',
    badgeBg: 'bg-gradient-to-r from-[#1a1a2e] via-[#6B21A8] to-[#DB2777]',
    badgeText: 'text-white/95',
    avatarRing: 'ring-[3px] ring-[#7C3AED] ring-offset-2 ring-offset-content2',
    cardBg: 'bg-content2',
    cardBorder: 'border-2 border-[#7C3AED]/50',
    cardShadow: 'shadow-md shadow-[#7C3AED]/15',
    nameColor: 'text-foreground',
    overlayGradient: 'bg-gradient-to-b from-[#7C3AED]/8 via-transparent to-transparent'
  },
  'Sponsor-backer': {
    label: 'Gold Partner',
    badgeBg: 'bg-gradient-to-r from-[#D4A017] via-[#E8C43A] to-[#D4A017]',
    badgeText: 'text-white/90',
    avatarRing: 'ring-[3px] ring-[#D4A017] ring-offset-2 ring-offset-content2',
    cardBg: 'bg-content2',
    cardBorder: 'border-2 border-[#D4A017]/60',
    cardShadow: 'shadow-sm shadow-[#D4A017]/10',
    nameColor: 'text-foreground',
    overlayGradient: 'bg-gradient-to-b from-[#D4A017]/5 via-transparent to-transparent'
  },
  'early-adopter': {
    label: 'Silver Backer',
    badgeBg: 'bg-gradient-to-r from-[#929396] via-[#B4B5B8] to-[#838487]',
    badgeText: 'text-white/90',
    avatarRing: 'ring-2 ring-[#C0C0C3] ring-offset-2 ring-offset-content2',
    cardBg: 'bg-content2',
    cardBorder: 'border border-[#C0C0C3]/40',
    cardShadow: 'shadow-sm',
    nameColor: 'text-foreground'
  },
  'coffee-supporter': {
    label: 'Community Hero',
    badgeBg: 'bg-gradient-to-r from-[#BE7023] via-[#CD7F32] to-[#AF6114]',
    badgeText: 'text-white/90',
    avatarRing: 'ring-2 ring-[#CD7F32]/30 ring-offset-1 ring-offset-content2',
    cardBg: 'bg-[#CD7F32]/5',
    cardBorder: 'border border-[#CD7F32]/20',
    cardShadow: '',
    nameColor: 'text-foreground'
  }
}

const supporters: {
  name: string
  tier: SupporterTier
  number?: number
  avatar?: string
  logo?: string
  link?: string
}[] = []

const WALL_DISPLAY_SLOTS = 20

const founderMember = { name: 'Satang Budsai', initial: 'S', tier: 'creator' as SupporterTier }
const exampleMembers: { name: string; initial: string; tier: SupporterTier }[] = [
  { name: 'contributor', initial: 'C', tier: 'early-adopter' }
]
const exampleCoffeeMembers: { name: string; initial: string; tier: SupporterTier }[] = [
  { name: 'dev-friend', initial: 'D', tier: 'coffee-supporter' }
]

interface Perk {
  text: string
  tag?: { label: string; color: string }
}

interface SupportTier {
  name: string
  price: string
  priceNote: string
  priceTag?: { label: string; color: string }
  icon: string
  perks: Perk[]
  cta: string
  href: string
  isEnterprise?: boolean
}

const supportTiers: SupportTier[] = [
  {
    name: 'Coffee Supporter',
    price: '$5',
    priceNote: 'one-time',
    icon: 'lucide:coffee',
    perks: [{ text: 'Supporter badge' }, { text: 'Name on Wall of Fame' }],
    cta: 'Buy a Coffee',
    href: 'https://www.buymeacoffee.com/satangbuds3/e/coffee-supporter'
  },
  {
    name: 'Backer',
    price: '$15',
    priceNote: 'one-time',
    icon: 'lucide:rocket',
    perks: [
      { text: 'All Coffee benefits' },
      { text: 'Lifetime 10% off all plans', tag: { label: 'Pre-v1 Only', color: 'bg-danger/10 text-danger' } },
      { text: 'Discord Supporter role' },
      { text: 'Exclusive updates' }
    ],
    cta: 'Support as Backer',
    href: 'https://www.buymeacoffee.com/satangbuds3/e/early-adopter'
  },
  {
    name: 'Sponsor',
    price: '$100',
    priceNote: 'one-time',
    icon: 'lucide:award',
    perks: [
      { text: 'All Backer benefits' },
      { text: 'Lifetime 25% off all plans', tag: { label: 'Pre-v1 Only', color: 'bg-danger/10 text-danger' } },
      { text: 'Founding Member status' },
      { text: 'Roadmap voting power' }
    ],
    cta: 'Support as Sponsor',
    href: 'https://www.buymeacoffee.com/satangbuds3'
  },
  {
    name: 'Enterprise Partner',
    price: '$300',
    priceNote: '/ year',
    priceTag: { label: 'Lifetime Price Lock', color: 'bg-danger/10 text-danger' },
    icon: 'lucide:building-2',
    perks: [
      { text: 'All Sponsor benefits' },
      { text: 'Commercial license' },
      { text: 'White-label rights' },
      { text: 'Priority support' }
    ],
    cta: 'Contact for Partnership',
    href: 'mailto:mastersatang@gmail.com?subject=Qorstack%20Report%20Enterprise%20Partnership',
    isEnterprise: true
  }
]

const SupportersSection = () => {
  const allMembers = supporters.length > 0 ? supporters.filter(s => s.tier !== 'coffee-supporter') : []
  const coffeeMembers = supporters.length > 0 ? supporters.filter(s => s.tier === 'coffee-supporter') : []
  const membersFilled = allMembers.length

  return (
    <section id='supporters' className='bg-content1 py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Phase Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className='mb-6 flex justify-center'>
          <span className='inline-flex items-center gap-2 rounded-full bg-content3 px-4 py-1.5 text-[11px] font-medium text-default-500'>
            <span className='h-1.5 w-1.5 rounded-full bg-warning' />
            Current Phase: Pre-v1.0 Development
          </span>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className='mb-6 text-center'>
          <h2 className='font-headline mb-4 text-3xl font-bold leading-tight text-foreground md:text-4xl'>
            Fueling the mission.
          </h2>
          <p className='mx-auto max-w-2xl text-base leading-relaxed text-default-600'>
            Qorstack Report is Open Core and 100% free to self-host. Your support directly covers server costs, allowing
            us to keep a powerful free tier alive for the entire developer community.
          </p>
        </motion.div>

        {/* GitHub Star */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className='mb-14 flex justify-center'>
          <a
            href='https://github.com/nicenathapong/qorstack-report'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2.5 rounded-full border border-default-300 bg-content2 px-4 py-2 text-sm text-default-600 transition-all hover:border-default-400 hover:shadow-sm'>
            <Icon icon='lucide:github' className='h-4 w-4 text-foreground' />
            <span className='font-medium'>Star us on GitHub</span>
            <span className='h-4 w-px bg-default-300' />
            <Icon icon='lucide:star' className='h-3.5 w-3.5 text-default-500' />
          </a>
        </motion.div>

        {/* Support Tiers */}
        <div className='mb-10 space-y-3'>
          {supportTiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className={`grid gap-4 rounded-xl p-5 lg:grid-cols-[240px_1fr_auto] lg:items-center lg:gap-8 ${
                tier.isEnterprise
                  ? 'bg-primary ring-2 ring-primary dark:bg-primary'
                  : 'bg-background ring-1 ring-default-300/20 dark:bg-content2'
              }`}>
              <div className='flex items-center gap-3'>
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    tier.isEnterprise ? 'bg-primary-foreground/15' : 'bg-content3'
                  }`}>
                  <Icon
                    icon={tier.icon}
                    className={`h-5 w-5 ${tier.isEnterprise ? 'text-primary-foreground' : 'text-default-600'}`}
                  />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${tier.isEnterprise ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {tier.name}
                  </h4>
                  <p className={`flex items-center gap-2 text-[12px] ${tier.isEnterprise ? 'text-primary-foreground/70' : 'text-default-500'}`}>
                    <span className='whitespace-nowrap'>
                      {tier.price} · {tier.priceNote}
                    </span>
                    {tier.priceTag && (
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          tier.isEnterprise
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : tier.priceTag.color
                        }`}>
                        {tier.priceTag.label}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div>
                <div className='grid grid-cols-1 gap-x-8 gap-y-1.5 lg:grid-cols-2'>
                  {tier.perks.map(perk => (
                    <span
                      key={perk.text}
                      className={`flex items-center gap-1.5 text-[13px] ${tier.isEnterprise ? 'text-primary-foreground/90' : 'text-default-600'}`}>
                      <Icon
                        icon='lucide:check'
                        className={`h-3.5 w-3.5 shrink-0 ${tier.isEnterprise ? 'text-primary-foreground/70' : 'text-default-500'}`}
                      />
                      {perk.text}
                      {perk.tag && (
                        <span
                          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold ${perk.tag.color}`}>
                          {perk.tag.label}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <a
                href={tier.href}
                target={tier.isEnterprise ? undefined : '_blank'}
                rel={tier.isEnterprise ? undefined : 'noopener noreferrer'}
                className={`flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-5 py-2.5 text-[13px] font-semibold transition-colors ${
                  tier.isEnterprise
                    ? 'bg-primary-foreground text-primary hover:opacity-90'
                    : 'bg-content2 text-foreground hover:bg-content3 dark:bg-content3 dark:hover:bg-content4'
                }`}>
                {tier.isEnterprise && <Icon icon='lucide:mail' className='h-3.5 w-3.5' />}
                {tier.cta}
                {!tier.isEnterprise && <Icon icon='lucide:arrow-up-right' className='h-3.5 w-3.5 text-default-500' />}
              </a>
            </motion.div>
          ))}
        </div>

        <PromptPaySection />

        {/* Wall of Fame */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className='mb-8 text-center'>
          <h3 className='mb-2 text-xl font-bold text-foreground'>Wall of Fame</h3>
          <p className='mb-4 text-sm text-default-500'>The supporters who believed in Qorstack Report.</p>
          <div className='flex flex-wrap items-center justify-center gap-2'>
            {(Object.entries(TIER_CONFIG) as [SupporterTier, (typeof TIER_CONFIG)[SupporterTier]][])
              .filter(([key]) => key !== 'creator')
              .map(([, cfg]) => (
                <span
                  key={cfg.label}
                  className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
                  {cfg.label}
                </span>
              ))}
          </div>
        </motion.div>

        {/* Wall grid */}
        <div className='mx-auto grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-10'>
          {/* Founder */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className='col-span-1'>
            <div
              className={`relative flex h-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl p-3 ${TIER_CONFIG.creator.cardBg} ${TIER_CONFIG.creator.cardBorder} ${TIER_CONFIG.creator.cardShadow}`}>
              {TIER_CONFIG.creator.overlayGradient && (
                <div className={`pointer-events-none absolute inset-0 ${TIER_CONFIG.creator.overlayGradient}`} />
              )}
              <div
                className={`relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${AVATAR_STYLE} ${TIER_CONFIG.creator.avatarRing}`}>
                {founderMember.initial}
              </div>
              <p className={`relative max-w-full truncate text-[10px] font-semibold ${TIER_CONFIG.creator.nameColor}`}>
                {founderMember.name}
              </p>
              <span
                className={`relative rounded-full px-1.5 py-0.5 text-[8px] font-bold ${TIER_CONFIG.creator.badgeBg} ${TIER_CONFIG.creator.badgeText}`}>
                {TIER_CONFIG.creator.label}
              </span>
            </div>
          </motion.div>

          {/* Supporters */}
          {allMembers.map((s, i) => {
            const tierCfg = TIER_CONFIG[s.tier]
            const Wrapper = s.link ? 'a' : 'div'
            const wrapperProps = s.link ? { href: s.link, target: '_blank' as const, rel: 'noopener noreferrer' } : {}
            return (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: Math.min((i + 1) * 0.03, 0.5) }}
                className='col-span-1'>
                <Wrapper
                  {...wrapperProps}
                  className={`group relative flex h-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl p-3 transition-shadow hover:shadow-md ${tierCfg.cardBg} ${tierCfg.cardBorder} ${tierCfg.cardShadow}`}>
                  {tierCfg.overlayGradient && (
                    <div className={`pointer-events-none absolute inset-0 ${tierCfg.overlayGradient}`} />
                  )}
                  {s.avatar ? (
                    <Image
                      src={s.avatar}
                      alt={s.name}
                      width={36}
                      height={36}
                      className={`relative h-9 w-9 rounded-full ${tierCfg.avatarRing}`}
                    />
                  ) : (
                    <div
                      className={`relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${AVATAR_STYLE} ${tierCfg.avatarRing}`}>
                      {s.name[0]}
                    </div>
                  )}
                  <p className={`relative max-w-full truncate text-[10px] font-semibold ${tierCfg.nameColor}`}>
                    {s.name}
                  </p>
                  <span
                    className={`relative rounded-full px-1.5 py-0.5 text-[8px] font-bold ${tierCfg.badgeBg} ${tierCfg.badgeText}`}>
                    {tierCfg.label}
                  </span>
                </Wrapper>
              </motion.div>
            )
          })}

          {/* Example members */}
          {allMembers.length === 0 &&
            exampleMembers.map((m, i) => {
              const tierCfg = TIER_CONFIG[m.tier]
              return (
                <motion.div
                  key={m.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: (i + 1) * 0.05 }}
                  className='col-span-1'>
                  <div
                    className={`relative flex h-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl p-3 ${tierCfg.cardBg} ${tierCfg.cardBorder} ${tierCfg.cardShadow}`}>
                    {tierCfg.overlayGradient && (
                      <div className={`pointer-events-none absolute inset-0 ${tierCfg.overlayGradient}`} />
                    )}
                    <div
                      className={`relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${AVATAR_STYLE} ${tierCfg.avatarRing}`}>
                      {m.initial}
                    </div>
                    <p className={`relative max-w-full truncate text-[10px] font-semibold ${tierCfg.nameColor}`}>
                      {m.name}
                    </p>
                    <span
                      className={`relative rounded-full px-1.5 py-0.5 text-[8px] font-bold ${tierCfg.badgeBg} ${tierCfg.badgeText}`}>
                      {tierCfg.label}
                    </span>
                  </div>
                </motion.div>
              )
            })}

          {/* Empty slots */}
          {Array.from({
            length: Math.max(
              0,
              WALL_DISPLAY_SLOTS - membersFilled - 1 - (allMembers.length === 0 ? exampleMembers.length : 0)
            )
          }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className='flex cursor-default flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-default-300 bg-content2/50 p-3'>
              <div className='flex h-9 w-9 items-center justify-center rounded-full bg-content3'>
                <Icon icon='lucide:user' className='h-4 w-4 text-default-400' />
              </div>
              <p className='text-[9px] font-medium text-default-400'>
                #{membersFilled + 1 + (allMembers.length === 0 ? exampleMembers.length : 0) + i + 1}
              </p>
            </div>
          ))}
        </div>

        {/* Community Heroes */}
        {(() => {
          const heroList =
            coffeeMembers.length > 0 ? coffeeMembers : supporters.length === 0 ? exampleCoffeeMembers : []
          if (heroList.length === 0) return null
          return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className='mt-5'>
              <p className='font-label mb-2.5 text-center text-[9px] font-medium uppercase tracking-[0.2em] text-default-400'>
                Community Heroes
              </p>
              <div className='flex flex-wrap items-center justify-center gap-2'>
                {heroList.map((m, i) => (
                  <motion.span
                    key={m.name}
                    initial={{ opacity: 0, y: 4 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className='inline-flex items-center gap-2 rounded-lg border border-default-300 bg-content2 px-3 py-2 transition-all hover:border-default-400 hover:shadow-sm'>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ${AVATAR_STYLE}`}>
                      {m.name[0].toUpperCase()}
                    </span>
                    <span className='text-[11px] font-medium text-default-600'>{m.name}</span>
                    <span className='h-3 w-px bg-default-300' />
                    <span className='rounded bg-[#CD7F32]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#CD7F32]'>
                      Hero
                    </span>
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )
        })()}

        {/* Notes */}
        <div className='mx-auto mt-8 max-w-lg space-y-2 text-center text-[12px] leading-relaxed text-default-500'>
          <p>Wall of Fame is updated manually every 24-48 hours. Thank you for your patience!</p>
          <p>
            Qorstack Report is committed to open-source transparency. All funds are used to maintain infrastructure and
            development.
          </p>
        </div>
      </div>
    </section>
  )
}

export default SupportersSection
