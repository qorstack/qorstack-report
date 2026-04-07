import React, { useState, useRef, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { obsidianDark } from './code-themes'
import { CopyButton } from './CopyButton'
import Icon from '@/components/icon'

// Custom hook for shared language state
export const useSharedLanguage = (defaultLang: Language = 'json') => {
  const [lang, setLang] = useState<Language>(defaultLang)

  React.useEffect(() => {
    // Initialize from localStorage
    const saved = typeof window !== 'undefined' ? localStorage.getItem('docs-lang') : null

    // Validate saved language against known options
    const isValidLang = saved && OPTIONS.some(opt => opt.matchLangs.includes(saved as Language))

    if (isValidLang) {
      setLang(saved as Language)
    } else {
      // If invalid or missing, stick to defaultLang (which is passed as prop)
      // But we should probably ensure defaultLang is valid too, usually it is 'json' or 'api'
    }

    // Listen for changes from other components
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
      // Dispatch event to update other components
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

  // Close dropdown when clicking outside
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

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none ${
          variant === 'dark'
            ? 'bg-[#1c2230] text-[#8b95a8] ring-1 ring-inset ring-[#2a3040] hover:bg-[#242c3c]'
            : 'bg-content1 text-default-700 shadow-sm ring-1 ring-inset ring-default-300 hover:bg-content2'
        }`}>
        <Icon icon={selectedOption.icon} className='text-lg' />
        <span>{selectedOption.label}</span>
        <Icon
          icon='solar:alt-arrow-down-linear'
          className={`ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className='animate-in fade-in zoom-in-95 absolute left-0 top-full z-50 mt-1 w-72 origin-top-left rounded-lg bg-content1 p-1 shadow-lg ring-1 ring-default-200 duration-100 focus:outline-none'>
          {OPTIONS.map((opt, i) => {
            const prevSection = i > 0 ? OPTIONS[i - 1].section : null
            const showHeader = opt.section !== prevSection

            return (
              <React.Fragment key={opt.id}>
                {showHeader && (
                  <div
                    className={`px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-default-400 ${i > 0 ? 'mt-1 border-t border-default-100' : ''}`}>
                    {opt.section}
                  </div>
                )}
                <button
                  onClick={() => handleLangChange(opt.id as Language)}
                  className={`flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-content2 ${
                    selectedOption.id === opt.id ? 'bg-primary/10' : ''
                  }`}>
                  <Icon icon={opt.icon} className='mt-0.5 shrink-0 text-xl' />
                  <div>
                    <div className='text-sm font-medium text-foreground'>{opt.label}</div>
                    <div className='text-xs text-default-500'>{opt.subtext}</div>
                  </div>
                  {selectedOption.id === opt.id && (
                    <Icon icon='solar:check-read-linear' className='ml-auto text-primary' />
                  )}
                </button>
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
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
  // Always use dark theme for code blocks — avoids SSR hydration mismatch
  // and follows industry convention (GitHub, Vercel, Stripe docs all do this)

  // Helper to get content with fallback
  const getContent = (lang: Language): string | undefined => {
    // Direct match
    if (examples[lang]) return examples[lang]

    // Mappings
    if (lang === 'ts') return examples['ts'] || examples['nodejs']
    if (lang === 'nodejs') return examples['nodejs'] || examples['ts']

    if (lang === 'dotnet') return examples['dotnet'] || examples['csharp']
    if (lang === 'csharp') return examples['csharp'] || examples['dotnet']

    // REST API Compatible fallback
    if (['go', 'python', 'java', 'php', 'rust', 'other'].includes(lang)) {
      return examples[lang] || examples['api'] || examples['json'] || examples['curl']
    }

    // API fallback
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

  // Map our language keys to SyntaxHighlighter languages
  const getHighlighterLang = (_code: string) => {
    // Use the active language to determine syntax highlighting
    if (['nodejs', 'ts'].includes(activeLang)) return 'typescript'
    if (['csharp', 'dotnet'].includes(activeLang)) return 'csharp'
    if (activeLang === 'go') return 'go'
    if (activeLang === 'python') return 'python'
    if (activeLang === 'java') return 'java'
    if (activeLang === 'php') return 'php'
    if (activeLang === 'rust') return 'rust'
    if (activeLang === 'curl') return 'bash'

    // Fallback: detect from code content
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

      // 1. Single line highlights
      if (
        line.includes('YOUR_API_KEY') ||
        line.includes('Example fetching data from service') ||
        line.includes('mockService.getExamplesAsync') ||
        line.includes('mockService.GetExamplesAsync')
      ) {
        nums.add(i)
      }

      // 2. Block highlights (Data transformation)
      // C# start
      if (line.includes('data.Select((item, index) => new')) {
        inBlock = true
      }
      // Node.js start
      if (line.includes('data.map((item, index) => ({')) {
        inBlock = true
      }

      if (inBlock) {
        nums.add(i)
        // End conditions
        if (line.includes('}).ToList();') || line.includes('}));')) {
          inBlock = false
        }
      }
    })
    return nums
  }, [currentCode])

  return (
    <div
      className={`${isDisableMarginY ? '' : 'my-4'} flex flex-col overflow-hidden rounded-xl bg-[#0f1420] shadow-lg`}>
      <div className='flex items-center justify-between bg-[#131825] px-4 py-2.5'>
        <LanguageSelector activeLang={activeLang} onLangChange={handleLangChange} variant='dark' />

        <div className='flex items-center gap-3 pl-4'>
          <CopyButton text={currentCode} variant='dark' />
        </div>
      </div>

      <div className='relative overflow-x-auto'>
        <div>
          <SyntaxHighlighter
            language={getHighlighterLang(currentCode)}
            style={obsidianDark}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: '13px',
              lineHeight: 1.6,
              background: 'transparent',
              minHeight: '100px',
              padding: '16px',
              minWidth: '100%',
              width: 'max-content'
            }}
            showLineNumbers={true}
            wrapLines={true}
            lineProps={lineNumber => {
              const style: React.CSSProperties = { display: 'block', minWidth: '100%' }
              if (highlightedLineNumbers.has(lineNumber)) {
                style.backgroundColor = 'rgba(100, 160, 255, 0.08)'
                style.borderLeft = '2px solid #85C7FF'
                style.paddingLeft = '14px'
                style.marginLeft = '-16px'
                style.paddingRight = '16px'
              }
              return { style }
            }}
            wrapLongLines={false}
            >
            {currentCode}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  )
}
