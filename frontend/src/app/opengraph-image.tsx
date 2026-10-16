import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'

// Link preview (Open Graph + Twitter card). Static: rendered once at build time,
// so the bundled fonts are read from disk and no network is needed.

export const alt = 'Qorstack Report — Templates in. PDF & Excel out.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const BG = '#070707'
const INK = '#F4F1EC'
const MUTED = '#8C8882'
const RED = '#F2271C'

const loadFont = (file: string): Promise<Buffer> => readFile(path.join(process.cwd(), 'src/assets/og-fonts', file))

const CropMark = ({ top, left, flipX, flipY }: { top: number; left: number; flipX?: boolean; flipY?: boolean }) => (
  <div
    style={{
      position: 'absolute',
      top,
      left,
      width: 22,
      height: 22,
      display: 'flex',
      borderColor: RED,
      borderStyle: 'solid',
      borderWidth: 0,
      [flipY ? 'borderBottomWidth' : 'borderTopWidth']: 2,
      [flipX ? 'borderRightWidth' : 'borderLeftWidth']: 2
    }}
  />
)

const LogoMark = () => (
  <svg width='52' height='52' viewBox='0 0 40 40'>
    <path d='M4 4H30V22H24V10H10V28H17V34H4Z' fill={INK} />
    <rect x='20' y='20' width='16' height='4' fill={INK} />
    <rect x='20' y='27' width='16' height='4' fill={INK} />
    <rect x='20' y='34' width='16' height='4' fill={INK} />
    <rect x='31' y='13' width='5' height='4' fill={RED} />
  </svg>
)

const OpengraphImage = async (): Promise<ImageResponse> => {
  const [display, body, mono] = await Promise.all([
    loadFont('archivo-condensed-800.ttf'),
    loadFont('archivo-500.ttf'),
    loadFont('jetbrains-mono-500.ttf')
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          position: 'relative',
          backgroundColor: BG,
          backgroundImage:
            'linear-gradient(rgba(244,241,236,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(244,241,236,0.045) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          color: INK,
          fontFamily: 'Archivo'
        }}>
        <CropMark top={30} left={30} />
        <CropMark top={30} left={1148} flipX />
        <CropMark top={578} left={30} flipY />
        <CropMark top={578} left={1148} flipX flipY />

        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <LogoMark />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'Archivo Condensed', fontSize: 30, letterSpacing: '0.02em', lineHeight: 1 }}>
                QORSTACK
              </span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, letterSpacing: '0.42em', color: MUTED, marginTop: 6 }}>
                REPORT
              </span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'JetBrains Mono',
              fontSize: 17,
              letterSpacing: '0.16em',
              color: MUTED,
              border: `1px solid #33312F`,
              padding: '10px 16px'
            }}>
            OPEN SOURCE · MIT CORE
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Archivo Condensed',
            fontSize: 132,
            lineHeight: 0.92,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase'
          }}>
          <span>Templates in.</span>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
            <span style={{ backgroundColor: RED, color: '#FFFFFF', padding: '6px 14px 0' }}>PDF</span>
            <span style={{ marginLeft: 26 }}>&amp; Excel</span>
            <span style={{ marginLeft: 30, color: RED }}>out.</span>
          </div>
        </div>

        {/* Footer row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #33312F',
            paddingTop: 22,
            fontFamily: 'JetBrains Mono',
            fontSize: 20,
            letterSpacing: '0.06em',
            color: MUTED
          }}>
          <div style={{ display: 'flex', gap: 28 }}>
            <span>
              <span style={{ color: INK }}>.DOCX</span>&nbsp;→ .PDF
            </span>
            <span>
              <span style={{ color: INK }}>.XLSX</span>&nbsp;→ .XLSX
            </span>
            <span>SELF-HOSTED</span>
          </div>
          <span style={{ fontFamily: 'Archivo', fontSize: 21, letterSpacing: 0, color: INK }}>report.qorstack.com</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Archivo Condensed', data: display, weight: 800, style: 'normal' },
        { name: 'Archivo', data: body, weight: 500, style: 'normal' },
        { name: 'JetBrains Mono', data: mono, weight: 500, style: 'normal' }
      ]
    }
  )
}

export default OpengraphImage

// Static export: generated once at build time.
export const dynamic = 'force-static'
