import Footer from '@/layouts/partial/footer'
import Navbar from '@/layouts/partial/navbar'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-screen bg-background font-sans text-foreground selection:bg-primary selection:text-primary-foreground'>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
