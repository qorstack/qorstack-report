'use client'

import { useCallback, useEffect, useState, type JSX } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import DocSearch from '@/components/docs/DocSearch'
import { Logo } from '@/components/brand/Logo'
import { GitHubStarButton } from '@/components/landing/GitHubStars'
import { GITHUB_URL, IS_MARKETING_SITE, PRICING_HREF } from '@/components/landing/constants'
import { cn } from '@/utils/cn'

interface NavbarProps {
  maxWidth?: string
  onSearchNavigate?: (id: string) => void
}

interface NavLink {
  name: string
  href: string
}

// Landing-page anchors exist only on the marketing site; a self-hosted install opens the app at "/".
const NAV_LINKS: NavLink[] = IS_MARKETING_SITE
  ? [
      { name: 'How it works', href: '/#how' },
      { name: 'Features', href: '/#features' },
      { name: 'Developers', href: '/#developers' },
      { name: 'Pricing', href: PRICING_HREF },
      { name: 'Docs', href: '/docs' }
    ]
  : [
      { name: 'Docs', href: '/docs' },
      { name: 'Self-host', href: '/self-host' },
      { name: 'Free vs Pro', href: PRICING_HREF }
    ]

const SearchIcon = (): JSX.Element => (
  <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
    <circle cx='11' cy='11' r='7' />
    <path d='M20 20l-3.5-3.5' strokeLinecap='square' />
  </svg>
)

const MenuIcon = ({ open }: { open: boolean }): JSX.Element => (
  <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
    {open ? <path d='M5 5l14 14M19 5L5 19' /> : <path d='M3 7h18M3 12h18M3 17h18' />}
  </svg>
)

const Navbar = ({ maxWidth, onSearchNavigate }: NavbarProps): JSX.Element => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const isDocs = pathname?.startsWith('/docs') ?? false

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
      if (e.key === 'Escape') setMenuOpen(false)
    }
    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearchNavigate = useCallback(
    (id: string, path?: string) => {
      setSearchOpen(false)
      if (path) {
        router.push(path)
      } else if (onSearchNavigate) {
        onSearchNavigate(id)
      } else {
        router.push(`/docs#${id}`)
      }
    },
    [onSearchNavigate, router]
  )

  const isActive = (href: string): boolean => !href.includes('#') && pathname === href

  const primaryCta = IS_MARKETING_SITE ? { name: 'Get started', href: '/self-host' } : { name: 'Dashboard', href: '/' }

  return (
    <>
      <header className='sticky top-0 z-[60] border-b border-divider bg-background/85 backdrop-blur-md'>
        <div className={cn('mx-auto flex h-[68px] items-center gap-10 px-4 sm:px-7', maxWidth || 'max-w-[1280px]')}>
          <Link href='/' aria-label='Qorstack Report home' className='shrink-0'>
            <Logo size={34} />
          </Link>

          <nav
            aria-label='Main'
            className='hidden gap-[30px] text-[14px] font-medium uppercase tracking-[0.06em] text-default-500 [font-variation-settings:"wdth"_92] min-[900px]:flex'>
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={cn(
                  "relative py-1.5 transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 after:content-[''] hover:text-foreground hover:after:scale-x-100",
                  isActive(link.href) && 'text-foreground'
                )}>
                {link.name}
              </Link>
            ))}
          </nav>

          <div className='ml-auto flex items-center gap-2.5'>
            {isDocs && (
              <button
                type='button'
                onClick={() => setSearchOpen(true)}
                aria-label='Search docs'
                className='inline-flex h-10 items-center gap-2 border border-default-300 px-3 text-default-500 transition-colors hover:border-foreground hover:text-foreground'>
                <SearchIcon />
                <kbd className='hidden font-mono text-[11px] lg:inline'>⌘K</kbd>
              </button>
            )}
            <GitHubStarButton className='max-[560px]:hidden' />
            <Link
              href={primaryCta.href}
              className='hidden h-10 items-center bg-primary px-4 text-[13px] font-bold uppercase tracking-[0.04em] text-white transition-colors [font-variation-settings:"wdth"_90] hover:bg-primary-600 sm:inline-flex'>
              {primaryCta.name}
            </Link>
            <button
              type='button'
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls='mobile-menu'
              className='inline-flex h-10 w-10 items-center justify-center border border-default-300 text-foreground transition-colors hover:border-foreground min-[900px]:hidden'>
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id='mobile-menu'
            aria-label='Mobile'
            className='border-t border-divider bg-background px-4 pb-6 pt-2 min-[900px]:hidden'>
            <ul className='flex flex-col'>
              {NAV_LINKS.map(link => (
                <li key={link.href} className='border-b border-divider'>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className='block py-4 text-[15px] font-semibold uppercase tracking-[0.06em] text-default-500 hover:text-foreground'>
                    {link.name}
                  </Link>
                </li>
              ))}
              <li className='border-b border-divider'>
                <a
                  href={GITHUB_URL}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='block py-4 text-[15px] font-semibold uppercase tracking-[0.06em] text-default-500 hover:text-foreground'>
                  GitHub
                </a>
              </li>
            </ul>
            <Link
              href={primaryCta.href}
              onClick={() => setMenuOpen(false)}
              className='mt-5 flex h-12 items-center justify-center bg-primary text-[14px] font-bold uppercase tracking-[0.04em] text-white hover:bg-primary-600'>
              {primaryCta.name}
            </Link>
          </nav>
        )}
      </header>

      {searchOpen && <DocSearch onNavigate={handleSearchNavigate} onClose={() => setSearchOpen(false)} />}
    </>
  )
}

export default Navbar
