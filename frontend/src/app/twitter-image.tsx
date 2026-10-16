import OpengraphImage from './opengraph-image'

// Same artwork as the Open Graph image (config is declared here, not re-exported, so Next can read it statically).
export const alt = 'Qorstack Report — Templates in. PDF & Excel out.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default OpengraphImage

// Static export: generated once at build time.
export const dynamic = 'force-static'
