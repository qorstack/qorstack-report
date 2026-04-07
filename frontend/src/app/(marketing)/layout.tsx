import Footer from '@/layouts/partial/footer'
import Navbar from '@/layouts/partial/navbar'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-screen bg-background font-sans text-foreground selection:bg-primary-100 selection:text-primary-900'>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
