import type { Metadata, Viewport } from 'next'
import { Archivo, Anuphan, JetBrains_Mono, Sarabun } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Providers from './providers'

import '@/styles/globals.css'

// Polyfill for pdfjs-dist on SSR
if (typeof window === 'undefined') {
  // @ts-ignore
  global.DOMMatrix = class DOMMatrix {
    constructor() {}
  }
}

// Press design system fonts: Archivo (variable width) + Anuphan (Thai) + JetBrains Mono.
// Sarabun stays for Thai document previews.
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--font-archivo'
})

const anuphan = Anuphan({
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-anuphan'
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-jetbrains-mono'
})

const sarabun = Sarabun({
  subsets: ['latin', 'latin-ext', 'thai'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-sarabun'
})

// Brand config from env — change these when rebranding
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Qorstack Report'
const BRAND_URL = 'https://report.qorstack.com'
const TWITTER_HANDLE = process.env.NEXT_PUBLIC_TWITTER_HANDLE || '@qorstack_report'

export const metadata: Metadata = {
  metadataBase: new URL(BRAND_URL),
  title: {
    default: `${BRAND_NAME} — Word & Excel templates to PDF, DOCX and XLSX`,
    template: `%s | ${BRAND_NAME}`
  },
  description: `Design reports in Word or Excel, send JSON, get a PDF, DOCX or XLSX back. ${BRAND_NAME} is an open-core document API you can self-host — an alternative to JasperReports, Crystal Reports and jsPDF.`,
  keywords: [
    'PDF Generation',
    'Excel Report Generation',
    'DOCX to PDF API',
    'Self-hosted Report Engine',
    'Report Engine',
    'API Reporting',
    'Invoice Generator',
    'React PDF',
    'JasperReports Alternative',
    'Crystal Reports Alternative',
    'SSRS Alternative',
    'JsReport Alternative',
    'Telerik Reporting Alternative',
    'Developer Tools',
    'Cloud Reporting',
    'Document Generation API',
    'PDF Automation',
    'No-code PDF',
    'HTML to PDF API'
  ],
  applicationName: BRAND_NAME,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BRAND_URL,
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — Templates in. PDF & Excel out.`,
    description: 'Design in Word or Excel, send JSON, get a PDF, DOCX or XLSX back. Self-hosted, MIT core.'
    // og:image comes from src/app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND_NAME} — Templates in. PDF & Excel out.`,
    description: 'Design in Word or Excel, send JSON, get a PDF, DOCX or XLSX back. Self-hosted, MIT core.',
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE
  },
  robots: {
    index: true,
    follow: true
  },
  alternates: {
    canonical: BRAND_URL
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': BRAND_NAME,
    'format-detection': 'telephone=no',
    'mobile-web-app-capable': 'yes'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#070707',
  colorScheme: 'dark'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang='en'
      data-scroll-behavior='smooth'
      className={`dark scroll-smooth ${archivo.variable} ${anuphan.variable} ${jetbrainsMono.variable} ${sarabun.variable}`}
      suppressHydrationWarning>
      <body>
        {/* Non-div, layout-neutral root: browser extensions inject <div>s into <body> before hydration,
            and React only skips body-level nodes whose tag differs from the expected one. */}
        <section id='app-root' className='contents'>
          <Providers>
            <style
              dangerouslySetInnerHTML={{
                __html: `body { font-family: ${archivo.style.fontFamily}, ${anuphan.style.fontFamily}, system-ui, sans-serif; }`
              }}
            />
            {children}
          </Providers>
        </section>
        {/* Vercel Analytics only exists on Vercel; the self-hosted build has no /_vercel endpoint. */}
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  )
}
