import type { Config } from 'tailwindcss'
import { heroui } from '@heroui/react'

// =============================================================================
// THEME — "Press" design system (dark-only, black + signal red, square corners)
// Source of truth: agents/frontend-design/design-all.md
// =============================================================================

// Brand
// `red` is the bright accent (crop marks, large display words, focus rings).
// `redAction` fills buttons that carry white text: #C92820 keeps white text at ~5.5:1 (WCAG AA).
const red = '#F2271C'
const redAction = '#C92820'
const redActionHover = '#B0211A'

// Surfaces (darkest → lightest)
const ink = '#F4F1EC' // primary text
const bg = '#070707'
// Each step is visibly different so page → panel → card → raised read as separate layers.
const surface1 = '#101010'
const surface2 = '#171717'
const surface3 = '#202020'
const surface4 = '#2A2A2A'

// Status — kept visibly different from the brand red (errors are pink-crimson + icon)
const colorSuccess = '#3DDC84'
const colorWarning = '#FFB020'
const colorDanger = '#FF4D6D'

const neutral = {
  50: '#0F0F0F',
  100: '#181818',
  200: '#2A2826',
  300: '#3A3835',
  // Text steps are one notch brighter than the first Press cut: helper text read too dim on black.
  400: '#9C9892', // ≥6:1 on bg — helper text, counts
  500: '#B7B3AD', // secondary text, descriptions
  600: '#CDC9C3',
  700: '#D8D4CE',
  800: '#E8E5E0',
  900: ink,
  DEFAULT: '#2A2826',
  foreground: ink
}

const redScale = {
  50: '#1F0605',
  100: '#3A0B08',
  200: '#6B120D',
  300: '#A8130C',
  400: '#D81E14',
  500: red,
  600: redActionHover,
  700: '#FF6B5F',
  800: '#FF9B92',
  900: '#FFD2CD',
  DEFAULT: redAction,
  foreground: '#FFFFFF'
}

const pressTheme = {
  colors: {
    default: neutral,
    primary: redScale,
    secondary: { DEFAULT: ink, foreground: bg },
    success: { DEFAULT: colorSuccess, foreground: bg },
    warning: { DEFAULT: colorWarning, foreground: bg },
    danger: { DEFAULT: colorDanger, foreground: bg },
    background: bg,
    // 500 is HeroUI's input placeholder colour: dimmer than helper text so it never reads as a typed value.
    foreground: { DEFAULT: ink, 500: '#86827C' },
    content1: surface1,
    content2: surface2,
    content3: surface3,
    content4: surface4,
    // Quiet hairline: panels separate by surface colour first, lines only where needed.
    divider: '#1F1E1C',
    focus: red,
    overlay: 'rgba(0, 0, 0, 0.72)'
  }
}

const config: Config = {
  mode: 'jit',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Airbnb-style semantic tokens (text + hairlines + warm accent)
        ink: 'var(--ink)',
        body: 'var(--body-text)',
        muted: 'var(--muted)',
        hairline: 'var(--hairline)',
        'hairline-soft': 'var(--hairline-soft)',
        coral: {
          DEFAULT: 'var(--coral)',
          hover: 'var(--coral-hover)',
          soft: 'var(--coral-soft)'
        },
        code: {
          panel: '#000000',
          body: '#1C1C1E',
          chrome: '#2C2C2E',
          chip: '#3A3A3C',
          fg: '#E5E5EA',
          high: '#FFFFFF',
          base: '#D1D1D6',
          muted: '#8E8E93',
          subtle: '#636366',
          accent: red,
          ok: colorSuccess
        },
        surface: {
          lowest: 'var(--surface-lowest)',
          DEFAULT: 'var(--surface)',
          low: 'var(--surface-low)',
          high: 'var(--surface-high)',
          highest: 'var(--surface-highest)'
        },
        'token-filled': 'var(--token-filled)'
      },
      // Square system: every rounded-* utility is 0 except rounded-full (avatars, dots)
      borderRadius: {
        none: '0',
        sm: '0',
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        '4xl': '0'
      },
      fontFamily: {
        sans: ['var(--font-archivo)', 'var(--font-anuphan)', 'system-ui', 'sans-serif'],
        headline: ['var(--font-archivo)', 'var(--font-anuphan)', 'system-ui', 'sans-serif'],
        label: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
        thai: ['var(--font-anuphan)', 'sans-serif'],
        prompt: ['var(--font-prompt)', 'sans-serif'],
        sarabun: ['var(--font-sarabun)', 'sans-serif'],
        sriracha: ['var(--font-sriracha)', 'cursive'],
        chonburi: ['var(--font-chonburi)', 'cursive'],
        kanit: ['var(--font-kanit)', 'sans-serif'],
        'noto-sans-thai': ['var(--font-noto-sans-thai)', 'sans-serif'],
        'bai-jamjuree': ['var(--font-bai-jamjuree)', 'sans-serif'],
        pridi: ['var(--font-pridi)', 'serif'],
        roboto: ['var(--font-roboto)', 'sans-serif'],
        montserrat: ['var(--font-montserrat)', 'sans-serif'],
        playfair: ['var(--font-playfair)', 'serif'],
        outfit: ['var(--font-outfit)', 'sans-serif'],
        manrope: ['var(--font-manrope)', 'sans-serif']
      },
      boxShadow: {
        ambient: '0px 10px 30px rgba(15, 23, 42, 0.08)',
        'ambient-sm': '0px 4px 14px rgba(15, 23, 42, 0.06)',
        'ambient-lg': '0px 24px 54px rgba(15, 23, 42, 0.16)',
        glow: `0 0 24px ${red}55`,
        'glow-blue': `0 0 24px ${red}55`,
        // Airbnb single elevation tier
        lift: 'rgba(15, 23, 42, 0.06) 0 0 0 1px, rgba(15, 23, 42, 0.06) 0 8px 18px 0, rgba(15, 23, 42, 0.08) 0 18px 36px -18px'
      },
      keyframes: {
        scroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        'border-beam': {
          '0%': { 'offset-distance': '0%' },
          '100%': { 'offset-distance': '100%' }
        }
      },
      animation: {
        scroll: 'scroll 20s linear infinite',
        blob: 'blob 7s infinite',
        float: 'float 6s ease-in-out infinite',
        'border-beam': 'border-beam 4s linear infinite'
      }
    },
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1200px',
      '2xl': '1536px'
    }
  },
  darkMode: 'class',
  plugins: [
    heroui({
      layout: {
        radius: {
          small: '0px',
          medium: '0px',
          large: '0px'
        },
        boxShadow: {
          small: '0px 1px 2px rgba(15, 23, 42, 0.05)',
          medium: '0px 8px 18px rgba(15, 23, 42, 0.08)',
          large: '0px 22px 48px rgba(15, 23, 42, 0.16)'
        },
        borderWidth: {
          small: '1px',
          medium: '1px',
          large: '2px'
        },
        disabledOpacity: '0.5'
      },
      addCommonColors: true,
      // Dark only — the site has a single theme.
      defaultTheme: 'dark',
      themes: {
        dark: pressTheme
      }
    })
  ]
}

export default config
