import type { Config } from 'tailwindcss'
import { heroui } from '@heroui/react'

// =============================================================================
// 🎨 THEME CONFIGURATION - EDIT COLORS HERE
// To change the look and feel, edit these hex codes.
// These changes apply instantly across the platform.
// =============================================================================

// Product accent (used sparingly for CTAs, focus, selected states)
const brandPrimaryLight = '#0A1942'
const brandPrimaryDark = '#F2F4F8'

// Light Mode Settings - neutral graphite canvas with subtle blue-gray layering
const lightBackground = '#F7F8FB'
const lightSurface = '#FFFFFF'
const lightText = '#101828'

// Dark Mode Settings - graphite black, lifted enough to avoid a crushed UI
const darkBackground = '#08090C'
const darkSurface = '#121417'
const darkText = '#F4F7FB'

// System Colors
const colorSuccess = '#34C759'
const colorWarning = '#FF9500'
const colorDanger = '#FF3B30'

const themeLight = {
  colors: {
    default: {
      DEFAULT: lightSurface,
      foreground: lightText
    },
    primary: {
      DEFAULT: brandPrimaryLight,
      foreground: '#FFFFFF'
    },
    secondary: {
      DEFAULT: '#FDB913',
      foreground: '#1B0B2E'
    },
    success: { DEFAULT: colorSuccess, foreground: '#FFFFFF' },
    warning: { DEFAULT: colorWarning, foreground: '#FFFFFF' },
    danger: { DEFAULT: colorDanger, foreground: '#FFFFFF' },
    background: lightBackground,
    foreground: lightText,
    content1: lightSurface,
    content2: '#F3F5F9',
    content3: '#E6EBF2',
    content4: '#D4DCE8',
    focus: brandPrimaryLight,
    overlay: 'rgba(0, 0, 0, 0.4)'
  }
}

const themeDark = {
  colors: {
    default: {
      DEFAULT: darkSurface,
      foreground: darkText
    },
    primary: {
      DEFAULT: brandPrimaryDark,
      foreground: '#08090C'
    },
    secondary: {
      DEFAULT: '#FDB913',
      foreground: '#1B0B2E'
    },
    success: { DEFAULT: colorSuccess, foreground: '#0B0E14' },
    warning: { DEFAULT: colorWarning, foreground: '#0B0E14' },
    danger: { DEFAULT: colorDanger, foreground: '#0B0E14' },
    background: darkBackground,
    foreground: darkText,
    content1: darkSurface,
    content2: '#1A1D22',
    content3: '#2A2E35',
    content4: '#3A4049',
    focus: brandPrimaryDark,
    overlay: 'rgba(11, 14, 20, 0.6)'
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
          accent: brandPrimaryDark,
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
      borderRadius: {
        sm: '3px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        '3xl': '16px',
        '4xl': '20px'
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        headline: ['var(--font-manrope)', 'var(--font-space-grotesk)', 'sans-serif'],
        label: ['var(--font-space-grotesk)', 'var(--font-inter)', 'sans-serif'],
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
        glow: `0 0 24px ${brandPrimaryDark}40`,
        'glow-blue': `0 0 24px ${brandPrimaryDark}40`,
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
          small: '6px',
          medium: '10px',
          large: '14px'
        },
        boxShadow: {
          small: '0px 1px 2px rgba(15, 23, 42, 0.05)',
          medium: '0px 8px 18px rgba(15, 23, 42, 0.08)',
          large: '0px 22px 48px rgba(15, 23, 42, 0.16)'
        },
        borderWidth: {
          small: '0.5px', // iOS hairline borders
          medium: '1px',
          large: '2px'
        },
        disabledOpacity: '0.5'
      },
      addCommonColors: true,
      themes: {
        light: themeLight,
        dark: themeDark
      }
    })
  ]
}

export default config
