'use client'

import AuthGuard from '@/providers/auth'
import SwitchTheme from '@/components/switch-theme'
import Image from 'next/image'
import Link from 'next/link'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className='flex h-screen flex-col overflow-hidden bg-background'>
        {/* Minimal top bar */}
        <header className='flex h-14 shrink-0 items-center justify-between border-b border-default-100 px-6'>
          <Link href='/' className='flex items-center gap-2.5 transition-opacity hover:opacity-80'>
            <Image src='/images/logo/logo.png' alt='Qorstack Report' width={26} height={26} className='object-contain' />
            <span className='text-sm font-bold text-foreground'>Qorstack Report</span>
          </Link>
          <SwitchTheme />
        </header>

        {/* Page content */}
        <main className='flex-1 overflow-y-auto'>{children}</main>
      </div>
    </AuthGuard>
  )
}
