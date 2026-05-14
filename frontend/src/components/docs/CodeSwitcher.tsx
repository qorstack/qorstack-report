'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from 'next-themes'
import { obsidianDark } from './code-themes'
import Icon from '@/components/icon'

export const useSharedLanguage = (defaultLang: Language = 'json') => {
  const [lang, setLang] = useState<Language>(defaultLang)

  React.useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('docs-lang') : null
    const isValidLang = saved && OPTIONS.some(opt => opt.matchLangs.includes(saved as Language))

    if (isValidLang) {
      setLang(saved as Language)
    }

    const handleStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent<Language>
      setLang(customEvent.detail)
    }

    window.addEventListener('docs-lang-change', handleStorageChange)
    return () => window.removeEventListener('docs-lang-change', handleStorageChange)
  }, [])

  const handleSetLang = (newLang: Language) => {
    setLang(newLang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('docs-lang', newLang)
      window.dispatchEvent(new CustomEvent('docs-lang-change', { detail: newLang }))
    }
  }

  return [lang, handleSetLang] as const
}

export type Language =
  | 'json'
  | 'api'
  | 'curl'
  | 'nodejs'
  | 'ts'
  | 'csharp'
  | 'dotnet'
  | 'go'
  | 'python'
  | 'java'
  | 'php'
  | 'rust'
  | 'other'

export interface CodeExamples {
  json?: string
  api?: string
  curl?: string
  nodejs?: string
  ts?: string
  csharp?: string
  dotnet?: string
  go?: string
  python?: string
  java?: string
  php?: string
  rust?: string
  other?: string
  [key: string]: string | undefined
}

const OPTIONS: {
  id: string
  label: string
  icon: string
  subtext: string
  section: string
  matchLangs: Language[]
}[] = [
  {
    id: 'nodejs',
    label: 'Node.js / TypeScript SDK',
    icon: 'logos:nodejs-icon',
    subtext: 'Official SDK for Node.js, React and NextJs',
    section: 'SDK',
    matchLangs: ['nodejs', 'ts']
  },
  {
    id: 'dotnet',
    label: '.NET SDK',
    icon: 'logos:dotnet',
    subtext: 'Official SDK for C# and .NET',
    section: 'SDK',
    matchLangs: ['csharp', 'dotnet']
  },
  {
    id: 'api',
    label: 'REST API',
    icon: 'logos:postman-icon',
    subtext: 'Compatible with Go, Python, Java, PHP, Rust, etc.',
    section: 'Integration API',
    matchLangs: ['api', 'curl', 'json', 'go', 'python', 'java', 'php', 'rust', 'other']
  }
]

export const LanguageSelector = ({
  activeLang,
  onLangChange,
  className = '',
  variant = 'light'
}: {
  activeLang: Language
  onLangChange?: (lang: Language) => void
  className?: string
  variant?: 'light' | 'dark'
}) => {
  const [internalLang, setInternalLang] = useSharedLanguage()
  const currentLang = activeLang || internalLang
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLangChange = (lang: Language) => {
    if (onLangChange) {
      onLangChange(lang)
    } else {
      setInternalLang(lang)
    }
    setIsOpen(false)
  }

  const selectedOption = OPTIONS.find(opt => opt.matchLangs.includes(currentLang)) || OPTIONS[0]
  const isDark = variant === 'dark'

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus:outline-none ${
          isDark
            ? 'text-default-600 hover:bg-content2/60 hover:text-foreground'
            : 'text-default-700 hover:bg-content2/60 hover:text-foreground'
        }`}>
        <Icon icon={selectedOption.icon} className='text-lg' />
        <span>{selectedOption.label}</span>
        <Icon
          icon='solar:alt-arrow-down-linear'
          className={`ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className='animate-in fade-in zoom-in-95 absolute left-0 top-full z-50 mt-1 w-72 origin-top-left rounded-lg bg-content1 p-1 shadow-lg ring-1 ring-default-200 duration-100 focus:outline-none dark:ring-white/10'>
          {OPTIONS.map((opt, i) => {
            const prevSection = i > 0 ? OPTIONS[i - 1].section : null
            const showHeader = opt.section !== prevSection
            const isActive = selectedOption.id === opt.id

            return (
              <React.Fragment key={opt.id}>
                {showHeader && (
                  <div
                    className={`px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-default-400 ${i > 0 ? 'mt-1 border-t border-default-100 dark:border-white/5' : ''}`}>
                    {opt.section}
                  </div>
                )}
                <button
                  onClick={() => handleLangChange(opt.id as Language)}
                  className={`flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary/[0.18] font-semibold text-primary'
                      : 'text-default-600 hover:bg-content2/60 hover:text-foreground'
                  }`}>
                  <Icon icon={opt.icon} className='mt-0.5 shrink-0 text-xl' />
                  <div className='min-w-0 flex-1'>
                    <div className={`text-sm ${isActive ? 'text-primary' : 'text-foreground'}`}>{opt.label}</div>
                    <div className='text-xs text-default-500'>{opt.subtext}</div>
                  </div>
                  {isActive && <Icon icon='solar:check-read-linear' className='ml-auto shrink-0 text-primary' />}
                </button>
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}

const InlineCopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied' : 'Copy to clipboard'}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      className='flex h-8 w-8 items-center justify-center rounded-md text-default-500 transition-colors duration-200 hover:bg-content2/60 hover:text-foreground focus:outline-none'>
      <Icon
        icon={copied ? 'solar:check-circle-bold' : 'solar:copy-outline'}
        className={`text-base transition-all duration-200 ${copied ? 'scale-110 text-success' : 'scale-100'}`}
      />
    </button>
  )
}

export const CodeSwitcher = ({
  examples,
  title,
  activeLang: fileActiveLang,
  onLangChange,
  defaultLanguage = 'api',
  isDisableMarginY = false
}: {
  examples: CodeExamples
  title?: string
  activeLang?: Language
  onLangChange?: (lang: Language) => void
  defaultLanguage?: Language
  isDisableMarginY?: boolean
}) => {
  const [internalLang, setInternalLang] = useSharedLanguage(defaultLanguage)
  const activeLang = fileActiveLang || internalLang
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = !mounted || resolvedTheme === 'dark'

  const getContent = (lang: Language): string | undefined => {
    if (examples[lang]) return examples[lang]

    if (lang === 'ts') return examples['ts'] || examples['nodejs']
    if (lang === 'nodejs') return examples['nodejs'] || examples['ts']

    if (lang === 'dotnet') return examples['dotnet'] || examples['csharp']
    if (lang === 'csharp') return examples['csharp'] || examples['dotnet']

    if (['go', 'python', 'java', 'php', 'rust', 'other'].includes(lang)) {
      return examples[lang] || examples['api'] || examples['json'] || examples['curl']
    }

    if (['api', 'curl', 'json'].includes(lang)) {
      return examples['api'] || examples['json'] || examples['curl']
    }

    return undefined
  }

  const currentCode = getContent(activeLang) || getContent('api') || getContent('json') || ''

  const handleLangChange = (lang: Language) => {
    if (onLangChange) {
      onLangChange(lang)
    } else {
      setInternalLang(lang)
    }
  }

  const getHighlighterLang = (_code: string) => {
    if (['nodejs', 'ts'].includes(activeLang)) return 'typescript'
    if (['csharp', 'dotnet'].includes(activeLang)) return 'csharp'
    if (activeLang === 'go') return 'go'
    if (activeLang === 'python') return 'python'
    if (activeLang === 'java') return 'java'
    if (activeLang === 'php') return 'php'
    if (activeLang === 'rust') return 'rust'
    if (activeLang === 'curl') return 'bash'

    const code = _code.trim()
    if (code.startsWith('Method:') || code.startsWith('POST') || code.startsWith('GET')) return 'http'
    if (code.startsWith('curl')) return 'bash'
    if (code.startsWith('{') || code.startsWith('[')) return 'json'
    return 'json'
  }

  const highlightedLineNumbers = React.useMemo(() => {
    const lines = currentCode.split('\n')
    const nums = new Set<number>()
    let inBlock = false

    lines.forEach((line, idx) => {
      const i = idx + 1

      if (
        line.includes('YOUR_API_KEY') ||
        line.includes('Example fetching data from service') ||
        line.includes('mockService.getExamplesAsync') ||
        line.includes('mockService.GetExamplesAsync')
      ) {
        nums.add(i)
      }

      if (line.includes('data.Select((item, index) => new')) {
        inBlock = true
      }
      if (line.includes('data.map((item, index) => ({')) {
        inBlock = true
      }

      if (inBlock) {
        nums.add(i)
        if (line.includes('}).ToList();') || line.includes('}));')) {
          inBlock = false
        }
      }
    })
    return nums
  }, [currentCode])

  const highlightBg = isDark ? 'rgba(255, 255, 255, 0.055)' : 'rgba(59, 130, 246, 0.07)'
  const highlightBorder = isDark ? '#7DD3FC' : '#3B82F6'

  return (
    <div
      className={`${isDisableMarginY ? '' : 'my-4'} builder-code-shell flex flex-col overflow-hidden rounded-xl shadow-sm`}>
      <div className='builder-code-chrome flex items-center justify-between gap-2 border-b px-3 py-1.5'>
        <LanguageSelector activeLang={activeLang} onLangChange={handleLangChange} variant='dark' />
        <InlineCopyButton text={currentCode} />
      </div>

      <div className='no-scrollbar relative overflow-x-auto'>
        <SyntaxHighlighter
          language={getHighlighterLang(currentCode)}
          style={isDark ? obsidianDark : oneLight}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '12.5px',
            lineHeight: 1.55,
            background: 'transparent',
            minHeight: '100px',
            padding: '12px',
            minWidth: '100%',
            width: 'max-content'
          }}
          showLineNumbers={true}
          lineNumberStyle={{
            minWidth: '2.25em',
            paddingRight: '1em',
            textAlign: 'right',
            userSelect: 'none',
            color: isDark ? 'rgb(113, 113, 122)' : 'rgb(161, 161, 170)'
          }}
          wrapLines={true}
          lineProps={lineNumber => {
            const style: React.CSSProperties = { display: 'block', minWidth: '100%' }
            if (highlightedLineNumbers.has(lineNumber)) {
              style.backgroundColor = highlightBg
              style.borderLeft = `2px solid ${highlightBorder}`
              style.paddingLeft = '10px'
              style.marginLeft = '-12px'
              style.paddingRight = '12px'
            }
            return { style }
          }}
          wrapLongLines={false}>
          {currentCode}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
