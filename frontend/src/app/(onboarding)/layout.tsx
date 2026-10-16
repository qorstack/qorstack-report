'use client'

import AuthGuard from '@/providers/auth'
import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className='flex h-screen flex-col overflow-hidden bg-background'>
        {/* Minimal top bar */}
        <header className='flex h-16 shrink-0 items-center justify-between border-b border-divider px-4 sm:px-6'>
          <Link href='/' aria-label='Qorstack Report — home' className='transition-opacity hover:opacity-80'>
            <Logo size={26} />
          </Link>
          <span className='hidden text-[13px] text-default-500 sm:inline'>Setup</span>
        </header>

        {/* Page content */}
        <main className='flex-1 overflow-y-auto'>{children}</main>
      </div>
    </AuthGuard>
  )
}
