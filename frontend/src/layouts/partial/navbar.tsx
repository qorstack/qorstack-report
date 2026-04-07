'use client'

import RectButton from '@/components/rect-button'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/providers/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Icon from '@/components/icon'
import { motion, AnimatePresence } from 'framer-motion'
import DocSearch from '@/components/docs/DocSearch'
import { VersionChip } from '@/components/docs/DocComponents'
import SwitchTheme from '@/components/switch-theme'
import Image from 'next/image'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Qorstack Report'

interface NavbarProps {
  maxWidth?: string
  onSearchNavigate?: (id: string) => void
}

const Navbar = ({ maxWidth, onSearchNavigate }: NavbarProps) => {
  const [scrolled, setScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { user, openAuthModal, navigateHome, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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

  const getInitials = () => {
    if (user?.firstName) return user.firstName[0].toUpperCase()
    if (user?.email) return user.email[0].toUpperCase()
    return 'U'
  }

  const isActive = (path: string) => pathname === path

  const navLinks = [
    { name: 'Documentation', path: '/docs' },
    { name: 'Self-Host', path: '/self-host', badge: 'Soon' }
  ]

  return (
    <>
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-background/75 py-3.5 backdrop-blur-xl lg:py-4'
            : 'bg-background/40 py-4 backdrop-blur-sm lg:py-5'
        }`}>
        <div className={`mx-auto flex items-center justify-between px-4 lg:px-6 ${maxWidth || 'container'}`}>
          {/* Logo + Version */}
          <div className='flex items-center gap-2'>
            <div className='group flex cursor-pointer items-center gap-2.5' onClick={() => router.push('/')}>
              <Image
                src='/images/logo/logo.png'
                alt={BRAND_NAME}
                width={32}
                height={32}
                className='h-7 w-7 rounded-lg lg:h-8 lg:w-8'
              />
              <span className='font-headline text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary lg:text-base'>
                {BRAND_NAME}
              </span>
            </div>
            <VersionChip />
          </div>

          {/* Desktop Menu */}
          <div className='hidden items-center gap-7 md:flex'>
            {navLinks.map(link => (
              <div
                key={link.path}
                onClick={() => !link.badge && router.push(link.path)}
                className={`flex cursor-pointer items-center gap-1.5 text-sm font-medium transition-colors ${
                  link.badge
                    ? 'cursor-default text-default-500'
                    : isActive(link.path)
                      ? 'font-bold text-primary'
                      : 'text-default-600 hover:text-primary'
                }`}>
                {link.name}
                {link.badge && (
                  <span className='rounded bg-primary/10 px-1.5 py-0.5 font-label text-[9px] font-bold uppercase tracking-wider text-primary'>
                    {link.badge}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Right: Theme + Search + Auth */}
          <div className='hidden items-center gap-2 md:flex'>
            <SwitchTheme />

            <button
              onClick={() => setSearchOpen(true)}
              className='flex items-center gap-2 rounded-md bg-content2 px-3 py-1 text-sm text-default-500 transition-colors hover:bg-content3 lg:w-48'>
              <Icon icon='solar:magnifer-linear' className='text-sm' />
              <span className='flex-1 text-left text-xs'>Search docs...</span>
              <kbd className='rounded bg-content3 px-1 py-0.5 font-mono text-[10px] text-default-500'>
                ⌘K
              </kbd>
            </button>

            {user ? (
              <div
                className='flex cursor-pointer items-center gap-2 rounded-md bg-content2 p-0.5 pr-3 transition-colors hover:bg-content3'
                onClick={() => navigateHome()}>
                <div className='flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground'>
                  {getInitials()}
                </div>
                <span className='text-xs font-medium text-primary'>{user.firstName || user.email?.split('@')[0]}</span>
              </div>
            ) : (
              <RectButton
                variant='primary'
                className='!rounded-md !bg-gradient-to-br !from-primary !to-primary-600 !py-1.5 !text-primary-foreground !shadow-glow'
                onClick={() => openAuthModal('login')}>
                Get Started
              </RectButton>
            )}
          </div>

          {/* Mobile Right */}
          <div className='flex items-center gap-1 md:hidden'>
            <SwitchTheme />
            <button
              onClick={() => setSearchOpen(true)}
              className='flex h-8 w-8 items-center justify-center rounded-md text-default-600 hover:bg-content3 hover:text-primary'>
              <Icon icon='solar:magnifer-linear' className='text-base' />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className='flex h-8 w-8 items-center justify-center rounded-md text-default-600 hover:bg-content3 hover:text-primary'>
              <Icon icon={isMobileMenuOpen ? 'lucide:x' : 'lucide:menu'} className='h-5 w-5' />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: '100dvh' }}
              exit={{ opacity: 0, height: 0 }}
              className='overflow-hidden bg-background/95 backdrop-blur-xl md:hidden'>
              <div className='flex flex-col space-y-4 p-4'>
                {navLinks.map(link => (
                  <div
                    key={link.path}
                    onClick={() => {
                      if (!link.badge) {
                        router.push(link.path)
                        setIsMobileMenuOpen(false)
                      }
                    }}
                    className={`flex items-center gap-3 rounded-md px-4 py-3 text-base font-medium transition-colors ${
                      link.badge
                        ? 'text-default-500'
                        : isActive(link.path)
                          ? 'bg-primary/10 text-primary'
                          : 'text-default-600 hover:bg-content3 hover:text-primary'
                    }`}>
                    {link.name}
                    {link.badge && (
                      <span className='rounded bg-primary/10 px-2 py-0.5 font-label text-[9px] font-bold uppercase tracking-wider text-primary'>
                        {link.badge}
                      </span>
                    )}
                  </div>
                ))}

                <div className='my-2 h-px bg-content3' />

                {user ? (
                  <div className='flex flex-col gap-2'>
                    <div
                      onClick={() => {
                        navigateHome()
                        setIsMobileMenuOpen(false)
                      }}
                      className='flex items-center gap-3 rounded-md px-4 py-3 hover:bg-content3'>
                      <div className='flex h-8 w-8 items-center justify-center rounded bg-primary text-sm font-bold text-primary-foreground'>
                        {getInitials()}
                      </div>
                      <div className='flex flex-col'>
                        <span className='text-sm font-bold text-foreground'>{user.firstName || 'User'}</span>
                        <span className='text-xs text-default-500'>{user.email}</span>
                      </div>
                    </div>
                    <RectButton
                      variant='ghost'
                      className='w-full justify-center text-danger hover:bg-danger/10 hover:text-danger'
                      onClick={() => {
                        logout()
                        setIsMobileMenuOpen(false)
                      }}>
                      Log out
                    </RectButton>
                  </div>
                ) : (
                  <RectButton
                    variant='primary'
                    className='w-full justify-center !bg-gradient-to-br !from-primary !to-primary-600 !text-primary-foreground !shadow-glow'
                    onClick={() => {
                      openAuthModal('login')
                      setIsMobileMenuOpen(false)
                    }}>
                    Get Started
                  </RectButton>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {searchOpen && <DocSearch onNavigate={handleSearchNavigate} onClose={() => setSearchOpen(false)} />}
    </>
  )
}

export default Navbar
