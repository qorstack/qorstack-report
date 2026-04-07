import Footer from '@/layouts/partial/footer'
import Navbar from '@/layouts/partial/navbar'
import { GlobalSpotlight } from '@/components/common/GlobalSpotlight'
import React, { ReactNode } from 'react'

const MainLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className='min-h-screen bg-background font-sans text-foreground selection:bg-primary-100 selection:text-primary-900'>
      {/* Full-page mouse spotlight — dark mode only */}
      <GlobalSpotlight />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  )
}

export default MainLayout
