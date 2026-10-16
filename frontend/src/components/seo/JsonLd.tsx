const BRAND_URL = 'https://report.qorstack.com'
const BRAND_TWITTER = process.env.NEXT_PUBLIC_BRAND_TWITTER || 'qorstack_report'

export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Qorstack Report',
    url: BRAND_URL,
    logo: `${BRAND_URL}/icons/logo.png`,
    description:
      'Open-core document API: design reports in Word or Excel, send JSON, get a PDF, DOCX or XLSX back.',
    sameAs: [`https://twitter.com/${BRAND_TWITTER}`]
  }

  return <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}

export function WebApplicationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Qorstack Report',
    url: BRAND_URL,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free, open-source core'
    },
    description:
      'Turn Word and Excel templates into PDF, DOCX and XLSX with one API call. Self-hosted, MIT core.'
  }

  return <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}
