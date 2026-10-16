export const GITHUB_URL = 'https://github.com/qorstack/qorstack-report'
export const GITHUB_REPO_API = 'https://api.github.com/repos/qorstack/qorstack-report'
export const PAPER = '#FFFFFF'
export const PAPER_INK = '#141414'
export const BRAND_RED = '#F2271C'

/**
 * The public marketing site (Vercel build: NEXT_PUBLIC_SITE_MODE=cloud, see vercel.json). A self-hosted
 * install has no landing page — "/" opens the app — so links to /#how, /#features, /#pricing must be hidden there.
 */
export const IS_MARKETING_SITE = process.env.NEXT_PUBLIC_SITE_MODE === 'cloud'

/** Pricing / Free vs Pro: the landing section on the marketing site, the self-host comparison otherwise. */
export const PRICING_HREF = IS_MARKETING_SITE ? '/#pricing' : '/self-host#free-vs-pro'

export const formatMoney = (value: number): string =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Parses a user-typed number; empty or invalid input counts as 0. */
export const toNumber = (value: string): number => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
