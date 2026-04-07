'use client'

import React, { ReactNode } from 'react'
import Sidebar from '@/layouts/partial/sidebar'
import Header from '@/layouts/partial/header'
import { motion } from 'framer-motion'

interface Props {
  children: ReactNode
}

const SidebarLayout = ({ children }: Props) => {
  return (
    <div className='flex h-screen flex-col overflow-hidden bg-background lg:flex-row'>
      {/* Desktop sidebar */}
      <div className='hidden lg:block'>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className='flex flex-1 flex-col overflow-hidden lg:pl-72'>
        {/* Header (contains mobile drawer trigger) */}
        <div className='shrink-0'>
          <Header />
        </div>

        {/* Page content */}
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className='flex-1 overflow-y-auto p-4 lg:p-6'>
          {children}
        </motion.main>
      </div>
    </div>
  )
}

export default SidebarLayout
