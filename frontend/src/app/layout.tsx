import type { Metadata, Viewport } from 'next'
import {
  Inter,
  Space_Grotesk,
  Manrope,
  Prompt,
  Sarabun,
  Sriracha,
  Chonburi,
  Kanit,
  Noto_Sans_Thai,
  Bai_Jamjuree,
  Pridi,
  Roboto,
  Montserrat,
  Playfair_Display,
  Outfit
} from 'next/font/google'
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

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter'
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-space-grotesk'
})

const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-manrope'
})

const prompt = Prompt({
  subsets: ['latin', 'latin-ext', 'thai'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-prompt'
})

const sarabun = Sarabun({
  subsets: ['latin', 'latin-ext', 'thai'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sarabun'
})

const sriracha = Sriracha({
  subsets: ['latin', 'latin-ext', 'thai'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-sriracha'
})

const chonburi = Chonburi({
  subsets: ['latin', 'latin-ext', 'thai'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-chonburi'
})

const kanit = Kanit({
  subsets: ['latin', 'latin-ext', 'thai'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-kanit'
})

const notoSansThai = Noto_Sans_Thai({
  subsets: ['latin', 'latin-ext', 'thai'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-thai'
})

const baiJamjuree = Bai_Jamjuree({
  subsets: ['latin', 'latin-ext', 'thai'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-bai-jamjuree'
})

const pridi = Pridi({
  subsets: ['latin', 'latin-ext', 'thai'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-pridi'
})

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-roboto'
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-montserrat'
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-playfair'
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-outfit'
})

// Brand config from env — change these when rebranding
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Qorstack Report'
const BRAND_URL = process.env.NEXT_PUBLIC_BRAND_URL || 'https://qorstack.dev'
const TWITTER_HANDLE = process.env.NEXT_PUBLIC_TWITTER_HANDLE || '@qorstack_report'

export const metadata: Metadata = {
  metadataBase: new URL(BRAND_URL),
  title: {
    default: `${BRAND_NAME} - The Developer-First PDF Reporting Engine`,
    template: `%s | ${BRAND_NAME}`
  },
  description: `Stop wasting days coding PDFs. Design, test, and generate beautiful reports in seconds with ${BRAND_NAME}. The best alternative to JasperReports, Crystal Reports, and jsPDF.`,
  keywords: [
    'PDF Generation',
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
    'SaaS Reporting',
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
    siteName: `${BRAND_NAME} Engine`,
    title: `${BRAND_NAME} - The Developer-First PDF Reporting Engine`,
    description: `Stop wasting days coding PDFs. Design, test, and generate beautiful reports in seconds with ${BRAND_NAME}.`,
    images: [
      {
        url: `${BRAND_URL}/seo/opengraph-home.png`,
        width: 1200,
        height: 630,
        alt: `${BRAND_NAME} Dashboard`,
        type: 'image/png'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
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
  themeColor: '#080E1D'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang='en'
      className={`scroll-smooth ${inter.variable} ${spaceGrotesk.variable} ${manrope.variable} ${prompt.variable} ${sarabun.variable} ${sriracha.variable} ${chonburi.variable} ${kanit.variable} ${notoSansThai.variable} ${baiJamjuree.variable} ${pridi.variable} ${roboto.variable} ${montserrat.variable} ${playfair.variable} ${outfit.variable}`}
      suppressHydrationWarning>
      <body>
        <Providers>
          <style
            dangerouslySetInnerHTML={{
              __html: `body { font-family: ${inter.style.fontFamily}, ${prompt.style.fontFamily}, sans-serif; }`
            }}
          />
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
