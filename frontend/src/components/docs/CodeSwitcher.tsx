'use client'

import React, { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
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
  shortLabel: string
  icon: string
  subtext: string
  section: string
  matchLangs: Language[]
}[] = [
  {
    id: 'nodejs',
    label: 'Node.js / TypeScript SDK',
    shortLabel: 'Node.js',
    icon: 'logos:nodejs-icon',
    subtext: 'Official SDK for Node.js, React and NextJs',
    section: 'SDK',
    matchLangs: ['nodejs', 'ts']
  },
  {
    id: 'dotnet',
    label: '.NET SDK',
    shortLabel: '.NET',
    icon: 'logos:dotnet',
    subtext: 'Official SDK for C# and .NET',
    section: 'SDK',
    matchLangs: ['csharp', 'dotnet']
  },
  {
    id: 'api',
    label: 'REST API',
    shortLabel: 'REST API',
    icon: 'logos:postman-icon',
    subtext: 'Compatible with Go, Python, Java, PHP, Rust, etc.',
    section: 'Integration API',
    matchLangs: ['api', 'curl', 'json', 'go', 'python', 'java', 'php', 'rust', 'other']
  }
]

export const LanguageSelector = ({
  activeLang,
  onLangChange,
  className = ''
}: {
  activeLang: Language
  onLangChange?: (lang: Language) => void
  className?: string
  /** Kept for API compatibility — dark-only product. */
  variant?: 'light' | 'dark'
}) => {
  const [internalLang, setInternalLang] = useSharedLanguage()
  const currentLang = activeLang || internalLang

  const handleLangChange = (lang: Language) => {
    if (onLangChange) {
      onLangChange(lang)
      return
    }
    setInternalLang(lang)
  }

  const selectedOption = OPTIONS.find(opt => opt.matchLangs.includes(currentLang)) || OPTIONS[0]

  return (
    <div role='tablist' aria-label='Code language' className={`no-scrollbar flex min-w-0 overflow-x-auto ${className}`}>
      {OPTIONS.map(opt => {
        const isActive = selectedOption.id === opt.id
        return (
          <button
            key={opt.id}
            type='button'
            role='tab'
            aria-selected={isActive}
            title={`${opt.label} — ${opt.subtext}`}
            onClick={() => handleLangChange(opt.id as Language)}
            className={`relative flex h-10 shrink-0 items-center gap-2 border-r border-divider px-4 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary after:transition-transform ${
              isActive
                ? 'text-foreground after:scale-x-100'
                : 'text-default-500 after:scale-x-0 hover:bg-content2 hover:text-foreground'
            }`}>
            <Icon icon={opt.icon} className='h-4 w-4 shrink-0' />
            <span>{opt.shortLabel}</span>
          </button>
        )
      })}
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
      type='button'
      onClick={handleCopy}
      aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
      className='mr-1.5 inline-flex h-7 shrink-0 items-center gap-1.5 border border-default-300 px-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-default-500 transition-colors hover:border-foreground hover:text-foreground'>
      <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} className={`h-3.5 w-3.5 ${copied ? 'text-success' : ''}`} />
      <span className={copied ? 'text-success' : ''}>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

export const CodeSwitcher = ({
  examples,
  title,
  activeLang: fileActiveLang,
  onLangChange,
  defaultLanguage = 'api',
  isDisableMarginY = false,
  maxHeight
}: {
  examples: CodeExamples
  title?: string
  activeLang?: Language
  onLangChange?: (lang: Language) => void
  defaultLanguage?: Language
  isDisableMarginY?: boolean
  /** Cap the scroll area height (e.g. 480 or '60vh'). When set, content scrolls vertically inside the block. */
  maxHeight?: number | string
}) => {
  const [internalLang, setInternalLang] = useSharedLanguage(defaultLanguage)
  const activeLang = fileActiveLang || internalLang
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

  const highlightBg = 'rgba(242, 39, 28, 0.08)'
  const highlightBorder = '#F2271C'

  return (
    <div
      className={`${isDisableMarginY ? '' : 'my-4'} dark flex flex-col overflow-hidden border border-divider bg-[#050505] text-foreground`}>
      <div className='flex items-center justify-between gap-2 border-b border-divider bg-content1'>
        <LanguageSelector activeLang={activeLang} onLangChange={handleLangChange} />
        <InlineCopyButton text={currentCode} />
      </div>

      <div
        className={`no-scrollbar relative overflow-x-auto ${maxHeight === undefined ? '' : 'overflow-y-auto'}`}
        style={
          maxHeight === undefined
            ? undefined
            : { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }
        }>
        <SyntaxHighlighter
          language={getHighlighterLang(currentCode)}
          style={obsidianDark}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '13px',
            lineHeight: 1.7,
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
            color: '#6E6A65'
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
