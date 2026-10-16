/**
 * Single source for Free vs Pro on the public pages (docs, landing pricing + FAQ, self-host comparison).
 * Mirrors the backend feature flags (IFeatureFlagService / DefaultFeatureFlagService vs ProFeatureFlagService,
 * see EDITIONS.md) — update both together. Everything not listed as Pro is in the free MIT core,
 * including project members and custom template keys.
 */
export const PRO_REQUEST_FIELDS = new Set(['pdfPassword', 'watermark', 'zipOutput', 'async', 'webhookUrl'])

/** 'pdfPassword.userPassword' → plan of 'pdfPassword'. */
export const planForField = (name: string): 'free' | 'pro' =>
  PRO_REQUEST_FIELDS.has(name.split(/[.[]/)[0]) ? 'pro' : 'free'

/** Free template versions kept per template vs Pro (MaxTemplateVersions). */
export const TEMPLATE_VERSIONS = { free: 1, pro: 10 } as const

/** What a Pro licence adds, in display order (PdfPasswordProtection, PdfWatermark, AsyncRender, DownloadAsZip,
 * ProjectTransfer). The version limit is listed separately via TEMPLATE_VERSIONS. */
export const PRO_FEATURES: readonly string[] = [
  'PDF password protection',
  'PDF watermarks',
  'Async renders with signed webhooks',
  'ZIP output',
  'Project export & import'
]

/** In both plans (MIT core). */
export const CORE_FEATURES: readonly string[] = [
  'PDF, DOCX & Excel generation',
  'REST API, SDKs & MCP server',
  'Unlimited projects, templates & documents',
  'Project members & API keys',
  'Google Fonts + custom font upload',
  'QR codes & barcodes',
  'Auto-detected template variables',
  'Live preview while you edit',
  'Generation history'
]

export interface PlanRow {
  feature: string
  free: boolean | string
  pro: boolean | string
}

export const PLAN_ROWS: readonly PlanRow[] = [
  ...CORE_FEATURES.map(feature => ({ feature, free: true, pro: true })),
  {
    feature: 'Template versions kept per template',
    free: String(TEMPLATE_VERSIONS.free),
    pro: String(TEMPLATE_VERSIONS.pro)
  },
  ...PRO_FEATURES.map(feature => ({ feature, free: false, pro: true })),
  { feature: 'License', free: 'MIT', pro: 'Commercial' }
]

const midSentence = (label: string): string => (/^[A-Z]{2}/.test(label) ? label : `${label[0].toLowerCase()}${label.slice(1)}`)

/** Sentence fragment for running text, e.g. the FAQ: "PDF password protection, …, and 10 versions per template instead of 1". */
export const PRO_SUMMARY = `${PRO_FEATURES.map(midSentence).join(', ')}, and ${TEMPLATE_VERSIONS.pro} versions per template instead of ${TEMPLATE_VERSIONS.free}`
