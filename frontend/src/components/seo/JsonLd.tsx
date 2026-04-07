const BRAND_URL = process.env.NEXT_PUBLIC_BRAND_URL || 'https://qorstack.dev'
const BRAND_TWITTER = process.env.NEXT_PUBLIC_BRAND_TWITTER || 'qorstack_report'

export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Qorstack Report',
    url: BRAND_URL,
    logo: `${BRAND_URL}/icons/logo.png`,
    description:
      'Stop wasting days coding PDFs. Design, test, and generate beautiful reports in seconds with Qorstack Report.',
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
      description: 'Free tier available'
    },
    description:
      'The Developer-First PDF Reporting Engine. Design, test, and generate beautiful reports in seconds.'
  }

  return <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}
