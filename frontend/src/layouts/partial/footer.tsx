'use client'

import Icon from '@/components/icon'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Qorstack Report'
const BRAND_GITHUB = process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/nicenathapong/qorstack-report'

const footerLinks: Record<string, { name: string; href: string; external?: boolean }[]> = {
  Product: [
    { name: 'Changelog', href: '/changelog' },
    { name: 'Documentation', href: '/docs' },
    { name: 'Pricing', href: '/pricing' }
  ],
  Company: [
    { name: 'Status', href: '/status' },
    { name: 'Security', href: '/security' },
    { name: 'GitHub', href: BRAND_GITHUB, external: true }
  ],
  Legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' }
  ]
}

const Footer = () => {
  const router = useRouter()

  return (
    <footer className='bg-content1'>
      <div className='container mx-auto px-4 lg:px-6'>
        <div className='grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]'>
          {/* Brand */}
          <div>
            <div className='mb-4 flex cursor-pointer items-center gap-2.5' onClick={() => router.push('/')}>
              <Image
                src='/images/logo/logo.png'
                alt={BRAND_NAME}
                width={28}
                height={28}
                className='h-7 w-7 rounded-lg'
              />
              <span className='font-headline text-base font-bold tracking-tight text-foreground'>{BRAND_NAME}</span>
            </div>
            <p className='max-w-xs text-sm leading-relaxed text-default-500'>
              &copy; {new Date().getFullYear()} {BRAND_NAME}.
              <br />
              Built for the developer era.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className='mb-4 font-label text-xs font-semibold uppercase tracking-[0.05em] text-foreground'>
                {title}
              </h4>
              <ul className='space-y-3'>
                {links.map(link => (
                  <li key={link.name}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-sm text-default-500 transition-colors hover:text-primary'>
                        {link.name}
                      </a>
                    ) : (
                      <button
                        onClick={() => router.push(link.href)}
                        className='text-sm text-default-500 transition-colors hover:text-primary'>
                        {link.name}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom — tonal shift instead of border */}
        <div className='flex flex-col items-center justify-between gap-2 bg-content2 -mx-4 px-4 py-5 sm:flex-row lg:-mx-6 lg:px-6'>
          <p className='text-xs text-default-400'>
            &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </p>
          <div className='flex items-center gap-1.5 text-xs text-default-400'>
            <span>Made with</span>
            <Icon icon='mdi:heart' className='h-3.5 w-3.5 text-primary' />
            <span>for developers</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
