'use client'

import { ReactNode } from 'react'
import Sidebar from '@/layouts/partial/sidebar'
import Header from '@/layouts/partial/header'
import { motion } from 'framer-motion'

interface Props {
  children: ReactNode
}

const SidebarLayout = ({ children }: Props) => {
  return (
    <div className='flex h-screen flex-col overflow-hidden bg-background text-foreground lg:flex-row'>
      {/* Desktop sidebar */}
      <div className='hidden lg:block'>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className='flex flex-1 flex-col overflow-hidden lg:pl-[256px]'>
        {/* Header (contains mobile drawer trigger) */}
        <div className='shrink-0'>
          <Header />
        </div>

        {/* Page content — subtle lavender radial glow from top-right for depth */}
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className='flex-1 overflow-y-auto bg-background px-3 py-4 sm:px-4 lg:px-5 lg:py-4'>
          <div className='w-full max-w-[1920px]'>{children}</div>
        </motion.main>
      </div>
    </div>
  )
}

export default SidebarLayout
