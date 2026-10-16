import type { JSX } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { IS_MARKETING_SITE, PRICING_HREF } from '@/components/landing/constants'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Qorstack Report'
const BRAND_GITHUB = process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/qorstack/qorstack-report'

interface FooterLink {
  name: string
  href: string
  external?: boolean
}

const MAIN_LINKS: FooterLink[] = [
  { name: 'Docs', href: '/docs' },
  { name: 'Self-host', href: '/self-host' },
  { name: 'GitHub', href: BRAND_GITHUB, external: true },
  { name: IS_MARKETING_SITE ? 'Pricing' : 'Free vs Pro', href: PRICING_HREF }
]

const linkClass = 'transition-colors hover:text-primary'

const FooterAnchor = ({ link }: { link: FooterLink }): JSX.Element =>
  link.external ? (
    <a href={link.href} target='_blank' rel='noopener noreferrer' className={linkClass}>
      {link.name}
    </a>
  ) : (
    <Link href={link.href} className={linkClass}>
      {link.name}
    </Link>
  )

const Footer = (): JSX.Element => {
  const year = new Date().getFullYear()

  return (
    <footer className='border-t border-divider bg-background text-[13px] text-default-500'>
      <div className='mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-5 px-4 py-9 sm:px-7'>
        <Link href='/' aria-label={`${BRAND_NAME} home`}>
          <Logo size={26} caption='REPORT · MIT CORE' />
        </Link>
        <nav
          aria-label='Footer'
          className='flex flex-wrap gap-[26px] font-semibold uppercase tracking-[0.08em] [font-variation-settings:"wdth"_90]'>
          {MAIN_LINKS.map(link => (
            <FooterAnchor key={link.name} link={link} />
          ))}
        </nav>
      </div>
      <div className='border-t border-divider'>
        <div className='mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-5 font-mono text-[12px] sm:px-7'>
          <p>
            &copy; {year} {BRAND_NAME}. All rights reserved.
          </p>
          <p className='uppercase tracking-[0.08em]'>Templates in · PDF &amp; Excel out</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
