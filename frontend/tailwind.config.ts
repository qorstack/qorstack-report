import type { Config } from 'tailwindcss'
import { heroui } from '@heroui/react'

// =============================================================================
// "Obsidian Navy Philosophy" Design System
// Primary: Periwinkle Blue (#B8C5F7 dark / #4A82E8 light)
// Background: Obsidian Navy (#10131C dark / #F6F8FC light)
// Tonal Layering depth system — no explicit borders, background shifts only
// =============================================================================

const themeLight = {
  colors: {
    default: {
      '50': '#F6F8FC',
      '100': '#EEF1F8',
      '200': '#E2E7F0',
      '300': '#CDD4DF',
      '400': '#9DA5B8',
      '500': '#717A8E',
      '600': '#515A6E',
      '700': '#3A4255',
      '800': '#262D3D',
      '900': '#161C2A',
      foreground: '#161C2A',
      DEFAULT: '#CDD4DF'
    },
    primary: {
      '50': '#EEF2FF',
      '100': '#D8E0F8',
      '200': '#B0C2F0',
      '300': '#7896E0',
      '400': '#4A6DC8',
      '500': '#2A4DAE',
      '600': '#1A3590',
      '700': '#122878',
      '800': '#0D1F5C',
      '900': '#0A1942',
      foreground: '#FFFFFF',
      DEFAULT: '#0A1942'
    },
    secondary: {
      '50': '#F0FDF8',
      '100': '#DCFCF0',
      '200': '#B4F7DE',
      '300': '#78EFC2',
      '400': '#34DFA1',
      '500': '#10C983',
      '600': '#089E67',
      '700': '#077A50',
      '800': '#065C3D',
      '900': '#04402C',
      foreground: '#FFFFFF',
      DEFAULT: '#10C983'
    },
    success: {
      '50': '#ECFDF5',
      '100': '#D1FAE5',
      '200': '#A7F3D0',
      '300': '#6EE7B7',
      '400': '#34D399',
      '500': '#10B981',
      '600': '#059669',
      '700': '#047857',
      '800': '#065F46',
      '900': '#064E3B',
      foreground: '#ECFDF5',
      DEFAULT: '#10B981'
    },
    warning: {
      '50': '#FFFBEB',
      '100': '#FEF3C7',
      '200': '#FDE68A',
      '300': '#FCD34D',
      '400': '#FBBF24',
      '500': '#F59E0B',
      '600': '#D97706',
      '700': '#B45309',
      '800': '#92400E',
      '900': '#78350F',
      foreground: '#FFFBEB',
      DEFAULT: '#F59E0B'
    },
    danger: {
      '50': '#FEF2F2',
      '100': '#FEE2E2',
      '200': '#FECACA',
      '300': '#FCA5A5',
      '400': '#F87171',
      '500': '#EF4444',
      '600': '#DC2626',
      '700': '#B91C1C',
      '800': '#991B1B',
      '900': '#7F1D1D',
      foreground: '#fff',
      DEFAULT: '#EF4444'
    },
    background: '#F6F8FC',
    foreground: '#10131C',
    content1: {
      DEFAULT: '#EEF1F8',
      foreground: '#10131C'
    },
    content2: {
      DEFAULT: '#E4E8F2',
      foreground: '#10131C'
    },
    content3: {
      DEFAULT: '#D8DEEB',
      foreground: '#10131C'
    },
    content4: {
      DEFAULT: '#C8D0E2',
      foreground: '#10131C'
    },
    focus: '#0A1942',
    overlay: '#10131C'
  }
}

const themeDark = {
  colors: {
    default: {
      '50': '#090C11',   // bg-level only
      '100': '#10131C',   // bg-level only
      '200': '#1C2028',   // subtle borders
      '300': '#262A33',   // borders
      '400': '#31353E',   // strong borders / dividers
      '500': '#55596A',   // ghost border + barely-readable muted text
      '600': '#7C8090',   // muted secondary text (~3.8:1 on #090C11)
      '700': '#9FA3B3',   // body / helper text (~5.8:1)
      '800': '#C0C4D4',   // emphasis text (~9.5:1)
      '900': '#D8DCEC',   // heading-level text (~13:1)
      foreground: '#E8EAF0',
      DEFAULT: '#1C2028'
    },
    primary: {
      '50': '#060D24',
      '100': '#091338',
      '200': '#0E1E54',
      '300': '#162D7A',
      '400': '#2244A8',
      '500': '#3560CC',
      '600': '#5079D8',
      '700': '#7296E3',
      '800': '#B8C5F7',
      '900': '#DCE4FC',
      foreground: '#091942',
      DEFAULT: '#B8C5F7'
    },
    secondary: {
      '50': '#04402C',
      '100': '#065C3D',
      '200': '#077A50',
      '300': '#089E67',
      '400': '#10C983',
      '500': '#34DFA1',
      '600': '#78EFC2',
      '700': '#B4F7DE',
      '800': '#DCFCF0',
      '900': '#F0FDF8',
      foreground: '#04402C',
      DEFAULT: '#34DFA1'
    },
    success: {
      '50': '#064E3B',
      '100': '#065F46',
      '200': '#047857',
      '300': '#059669',
      '400': '#10B981',
      '500': '#4ADE80',
      '600': '#6EE7B7',
      '700': '#A7F3D0',
      '800': '#D1FAE5',
      '900': '#ECFDF5',
      foreground: '#064E3B',
      DEFAULT: '#4ADE80'
    },
    warning: {
      '50': '#78350F',
      '100': '#92400E',
      '200': '#B45309',
      '300': '#D97706',
      '400': '#F59E0B',
      '500': '#FBBF24',
      '600': '#FCD34D',
      '700': '#FDE68A',
      '800': '#FEF3C7',
      '900': '#FFFBEB',
      foreground: '#78350F',
      DEFAULT: '#FBBF24'
    },
    danger: {
      '50': '#7F1D1D',
      '100': '#991B1B',
      '200': '#B91C1C',
      '300': '#DC2626',
      '400': '#EF4444',
      '500': '#F87171',
      '600': '#FCA5A5',
      '700': '#FECACA',
      '800': '#FEE2E2',
      '900': '#FEF2F2',
      foreground: '#7F1D1D',
      DEFAULT: '#F87171'
    },
    background: '#090C11',
    foreground: '#E8EAF0',
    content1: {
      DEFAULT: '#10131C',
      foreground: '#E8EAF0'
    },
    content2: {
      DEFAULT: '#181C24',
      foreground: '#E8EAF0'
    },
    content3: {
      DEFAULT: '#1C2028',
      foreground: '#E8EAF0'
    },
    content4: {
      DEFAULT: '#262A33',
      foreground: '#E8EAF0'
    },
    focus: '#B8C5F7',
    overlay: '#000000'
  }
}

const config: Config = {
  mode: 'jit',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tertiary: {
          '50': '#FFF5EE',
          '100': '#FEEBD9',
          '200': '#FDD3B0',
          '300': '#FCB886',
          '400': '#FBB796',
          '500': '#F8954F',
          '600': '#E77430',
          '700': '#C05820',
          '800': '#984016',
          '900': '#6F2B0E',
          DEFAULT: '#FBB796'
        },
        surface: {
          lowest: '#0D1117',
          DEFAULT: '#10131C',
          low: '#181C24',
          high: '#1C2028',
          highest: '#262A33'
        }
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px'
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-prompt)', 'sans-serif'],
        headline: ['var(--font-space-grotesk)', 'var(--font-manrope)', 'sans-serif'],
        label: ['var(--font-space-grotesk)', 'sans-serif'],
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
        // Ambient shadows tinted toward primary for "glass refraction" feel
        ambient: '0px 24px 48px rgba(0, 0, 0, 0.4), 0px 0px 0px 1px rgba(184, 197, 247, 0.04)',
        'ambient-sm': '0px 4px 16px rgba(0, 0, 0, 0.30)',
        'ambient-lg': '0px 32px 64px rgba(0, 0, 0, 0.5), 0px 0px 0px 1px rgba(184, 197, 247, 0.04)',
        // Primary glow — periwinkle bloom effect
        glow: '0 0 24px rgba(184, 197, 247, 0.25)',
        'glow-blue': '0 0 24px rgba(184, 197, 247, 0.25)'
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
          small: '4px',
          medium: '6px',
          large: '8px'
        },
        boxShadow: {
          small: '0 1px 4px 0 rgba(0, 0, 0, 0.20), 0 1px 2px -1px rgba(0, 0, 0, 0.15)',
          medium: '0 4px 16px 0 rgba(0, 0, 0, 0.25), 0 2px 4px -2px rgba(0, 0, 0, 0.15)',
          large: '0 8px 32px 0 rgba(0, 0, 0, 0.35), 0 4px 8px -4px rgba(0, 0, 0, 0.20)'
        },
        disabledOpacity: '1'
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
