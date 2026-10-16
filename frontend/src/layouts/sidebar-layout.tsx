'use client'

import type { JSX, ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { cn } from '@/utils/cn'
import Sidebar from '@/layouts/partial/sidebar'
import Header from '@/layouts/partial/header'

interface Props {
  children: ReactNode
}

const SidebarLayout = ({ children }: Props): JSX.Element => {
  const reduceMotion = useReducedMotion()
  const pathname = usePathname() || ''
  // Builder pages size themselves to the viewport (calc(100vh - 110px)); keep their tight padding and full width.
  const isBuilder = /^\/(pdf|excel)\/templates\/(?!create)[^/]+/.test(pathname)

  return (
    <div className='flex h-screen flex-col overflow-hidden bg-background text-foreground lg:flex-row'>
      {/* Desktop sidebar (mobile uses the drawer in Header, same content) */}
      <div className='hidden lg:block'>
        <Sidebar />
      </div>

      <div className='flex min-w-0 flex-1 flex-col overflow-hidden lg:pl-[256px]'>
        <div className='shrink-0'>
          <Header />
        </div>

        <motion.main
          id='dashboard-main'
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={cn(
            'flex-1 overflow-y-auto bg-background',
            isBuilder ? 'px-3 py-4 sm:px-4 lg:px-5' : 'px-4 py-6 sm:px-6 lg:px-8 lg:py-8'
          )}>
          <div className={cn('w-full', !isBuilder && 'mx-auto max-w-[1400px]')}>{children}</div>
        </motion.main>
      </div>
    </div>
  )
}

export default SidebarLayout
