import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Icon from '@/components/icon'

export interface SearchItem {
  id: string
  title: string
  section: string
  keywords: string[]
  type: 'section' | 'subsection' | 'property' | 'syntax' | 'page'
  /** Full path for page-level items, e.g. '/' or '/pricing' */
  path?: string
}

const DEFAULT_SEARCH_ITEMS: SearchItem[] = [
  // Overview
  {
    id: 'overview',
    title: 'Overview',
    section: 'Getting Started',
    keywords: ['overview', 'introduction', 'getting started', 'features'],
    type: 'section'
  },
  {
    id: 'overview',
    title: 'Generate from Template',
    section: 'Overview',
    keywords: ['template', 'generate', 'endpoint', 'pre-uploaded'],
    type: 'subsection'
  },
  {
    id: 'overview',
    title: 'Generate from DOCX File',
    section: 'Overview',
    keywords: ['docx', 'file', 'upload', 'raw', 'base64'],
    type: 'subsection'
  },

  // Integration
  {
    id: 'integration',
    title: 'Integration',
    section: 'Getting Started',
    keywords: ['integration', 'sdk', 'install', 'setup'],
    type: 'section'
  },
  {
    id: 'integration',
    title: 'Node.js / TypeScript SDK',
    section: 'Integration',
    keywords: ['nodejs', 'typescript', 'npm', 'yarn', 'sdk', 'javascript'],
    type: 'subsection'
  },
  {
    id: 'integration',
    title: '.NET SDK (C#)',
    section: 'Integration',
    keywords: ['dotnet', 'csharp', 'c#', 'nuget', '.net'],
    type: 'subsection'
  },
  {
    id: 'integration',
    title: 'REST API',
    section: 'Integration',
    keywords: ['rest', 'api', 'http', 'curl', 'postman', 'json'],
    type: 'subsection'
  },
  {
    id: 'integration',
    title: 'templateKey',
    section: 'Integration > Request',
    keywords: ['templatekey', 'template', 'key', 'identifier'],
    type: 'property'
  },
  {
    id: 'integration',
    title: 'fileBase64',
    section: 'Integration > Request',
    keywords: ['filebase64', 'base64', 'file', 'upload'],
    type: 'property'
  },
  {
    id: 'integration',
    title: 'fileName',
    section: 'Integration > Request',
    keywords: ['filename', 'output', 'pdf'],
    type: 'property'
  },

  // Variables
  {
    id: 'variables',
    title: 'Variable Replacement',
    section: 'Template Features',
    keywords: ['variable', 'replace', 'placeholder', 'text', '{{variable}}'],
    type: 'section'
  },
  {
    id: 'variables',
    title: '{{variable}} syntax',
    section: 'Variables',
    keywords: ['syntax', 'mustache', 'handlebars', 'curly', 'braces', 'placeholder'],
    type: 'syntax'
  },

  // Tables
  {
    id: 'tables',
    title: 'Tables',
    section: 'Template Features',
    keywords: ['table', 'dynamic', 'rows', 'columns', 'loop', 'array'],
    type: 'section'
  },
  {
    id: 'tables',
    title: '{{table:name}} syntax',
    section: 'Tables',
    keywords: ['table', 'syntax', 'loop', 'marker'],
    type: 'syntax'
  },
  {
    id: 'tables',
    title: '{{row:field}} syntax',
    section: 'Tables',
    keywords: ['row', 'field', 'column', 'data'],
    type: 'syntax'
  },
  {
    id: 'tables',
    title: 'Table Sort',
    section: 'Tables',
    keywords: ['sort', 'ascending', 'descending', 'order'],
    type: 'property'
  },
  {
    id: 'tables',
    title: 'Vertical Merge',
    section: 'Tables',
    keywords: ['vertical', 'merge', 'cells', 'identical'],
    type: 'property'
  },
  {
    id: 'tables',
    title: 'Collapse Rows',
    section: 'Tables',
    keywords: ['collapse', 'rows', 'identical', 'group'],
    type: 'property'
  },
  {
    id: 'tables',
    title: 'Header Row Grouping',
    section: 'Tables',
    keywords: ['header', 'group', 'grouping', 'category'],
    type: 'subsection'
  },
  {
    id: 'tables',
    title: 'Footer Grouping',
    section: 'Tables',
    keywords: ['footer', 'group', 'total', 'sum'],
    type: 'subsection'
  },
  {
    id: 'tables',
    title: 'Aggregates',
    section: 'Tables',
    keywords: ['aggregate', 'sum', 'count', 'average', 'table_sum', 'group_sum', 'row_sum'],
    type: 'subsection'
  },

  // Images
  {
    id: 'images',
    title: 'Images',
    section: 'Template Features',
    keywords: ['image', 'picture', 'photo', 'logo', 'insert'],
    type: 'section'
  },
  {
    id: 'images',
    title: '{{image:variable}} syntax',
    section: 'Images',
    keywords: ['image', 'syntax', 'placeholder'],
    type: 'syntax'
  },
  {
    id: 'images',
    title: 'Image src (URL / Base64)',
    section: 'Images',
    keywords: ['src', 'url', 'base64', 'source'],
    type: 'property'
  },
  {
    id: 'images',
    title: 'Image fit (cover/contain/fill)',
    section: 'Images',
    keywords: ['fit', 'cover', 'contain', 'fill', 'resize'],
    type: 'property'
  },

  // QR Codes
  {
    id: 'qrcodes',
    title: 'QR Codes',
    section: 'Template Features',
    keywords: ['qr', 'qrcode', 'code', 'scan', 'payment'],
    type: 'section'
  },
  {
    id: 'qrcodes',
    title: '{{qrcode:variable}} syntax',
    section: 'QR Codes',
    keywords: ['qrcode', 'syntax', 'placeholder'],
    type: 'syntax'
  },

  // Barcodes
  {
    id: 'barcodes',
    title: 'Barcodes',
    section: 'Template Features',
    keywords: ['barcode', 'ean', 'upc', 'product', 'tracking'],
    type: 'section'
  },
  {
    id: 'barcodes',
    title: '{{barcode:variable}} syntax',
    section: 'Barcodes',
    keywords: ['barcode', 'syntax', 'placeholder'],
    type: 'syntax'
  },

  // --- Landing Page ---
  { id: '', title: 'Home', section: 'Pages', keywords: ['home', 'landing', 'main'], type: 'page', path: '/' },
  {
    id: '',
    title: 'Tutorial / Demo',
    section: 'Home',
    keywords: ['video', 'tutorial', 'demo', 'how to', 'walkthrough', 'guide', 'steps'],
    type: 'page',
    path: '/'
  },
  {
    id: '',
    title: 'Two Ways to Generate',
    section: 'Home',
    keywords: ['template', 'docx', 'upload', 'generate', 'two ways', 'method', 'workflow'],
    type: 'page',
    path: '/'
  },
  {
    id: '',
    title: 'Visual Template Design',
    section: 'Home',
    keywords: ['visual', 'design', 'word', 'docx', 'template', 'wysiwyg'],
    type: 'page',
    path: '/'
  },
  {
    id: '',
    title: 'Google Fonts Integration',
    section: 'Home',
    keywords: ['font', 'google fonts', 'typography', 'roboto', 'montserrat', 'language', 'thai', 'multilingual'],
    type: 'page',
    path: '/'
  },
  {
    id: '',
    title: 'Security & Data Privacy',
    section: 'Home',
    keywords: ['security', 'privacy', 'zero data', 'retention', 'encryption', 'ssl', 'gdpr'],
    type: 'page',
    path: '/'
  },
  {
    id: '',
    title: 'Document Types (Invoice, Report, Contract)',
    section: 'Home',
    keywords: ['invoice', 'report', 'contract', 'certificate', 'document type', 'example', 'use case'],
    type: 'page',
    path: '/'
  },
  {
    id: '',
    title: 'Tech Stack & Integrations',
    section: 'Home',
    keywords: ['tech stack', 'react', 'node', 'dotnet', 'python', 'java', 'go', 'integration'],
    type: 'page',
    path: '/'
  },
  {
    id: '',
    title: 'Code Example (Send JSON, Get PDF)',
    section: 'Home',
    keywords: ['code', 'example', 'json', 'pdf', 'api', 'request', 'response', 'snippet'],
    type: 'page',
    path: '/'
  },

  // Pricing — Hidden during Beta / Early Access phase
  // {
  //   id: 'pricing',
  //   title: 'Pricing',
  //   section: 'Pages',
  //   keywords: ['pricing', 'price', 'plan', 'free', 'pro', 'enterprise', 'cost', 'subscribe'],
  //   type: 'page',
  //   path: '/pricing'
  // },
  // {
  //   id: 'pricing',
  //   title: 'Free Plan',
  //   section: 'Pricing',
  //   keywords: ['free', 'plan', 'starter', 'trial', 'limit'],
  //   type: 'page',
  //   path: '/pricing'
  // },
  // {
  //   id: 'pricing',
  //   title: 'Pro Plan',
  //   section: 'Pricing',
  //   keywords: ['pro', 'plan', 'paid', 'premium', 'advanced'],
  //   type: 'page',
  //   path: '/pricing'
  // }
]

const TYPE_ICONS: Record<string, string> = {
  section: 'solar:document-text-linear',
  subsection: 'solar:hashtag-linear',
  property: 'solar:code-linear',
  syntax: 'solar:programming-linear',
  page: 'solar:globe-linear'
}

interface DocSearchProps {
  items?: SearchItem[]
  onNavigate: (sectionId: string, path?: string) => void
  onClose: () => void
}

const DocSearch = ({ items = DEFAULT_SEARCH_ITEMS, onNavigate, onClose }: DocSearchProps) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const results = useMemo(() => {
    if (!query.trim()) return items.slice(0, 8)
    const q = query.toLowerCase().trim()
    const terms = q.split(/\s+/)

    return items
      .map(item => {
        let score = 0
        const titleLower = item.title.toLowerCase()
        const sectionLower = item.section.toLowerCase()
        const allKeywords = item.keywords.join(' ').toLowerCase()

        for (const term of terms) {
          if (titleLower.includes(term)) score += 10
          if (titleLower.startsWith(term)) score += 5
          if (sectionLower.includes(term)) score += 3
          if (allKeywords.includes(term)) score += 5
        }

        return { ...item, score }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }, [query, items])

  const handleSelect = useCallback(
    (item: SearchItem) => {
      onClose()
      onNavigate(item.id, item.path)
    },
    [onNavigate, onClose]
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    }
  }

  return (
    <div className='fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]'>
      {/* Backdrop */}
      <div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={onClose} />

      {/* Modal */}
      <div className='relative w-full max-w-xl rounded-xl border border-default-200 bg-content1 shadow-2xl dark:bg-content2'>
        {/* Search Input */}
        <div className='flex items-center gap-3 border-b border-default-200 px-4 py-3'>
          <Icon icon='solar:magnifer-linear' className='shrink-0 text-lg text-default-400' />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Search documentation...'
            className='flex-1 bg-transparent text-sm text-foreground placeholder-default-400 outline-none'
          />
          <kbd className='hidden rounded border border-default-200 px-1.5 py-0.5 font-mono text-[10px] text-default-500 sm:inline-block'>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className='max-h-80 overflow-y-auto p-2'>
          {results.length === 0 ? (
            <div className='flex flex-col items-center gap-2 py-8 text-default-400'>
              <Icon icon='solar:document-text-linear' className='text-3xl' />
              <p className='text-sm'>No results found for &quot;{query}&quot;</p>
            </div>
          ) : (
            <ul>
              {results.map((item, idx) => (
                <li key={`${item.id}-${item.title}-${idx}`}>
                  <button
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      selectedIndex === idx
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-content3 dark:hover:bg-content3'
                    }`}>
                    <Icon
                      icon={TYPE_ICONS[item.type] || 'solar:document-text-linear'}
                      className={`shrink-0 text-base ${selectedIndex === idx ? 'text-primary' : 'text-default-500'}`}
                    />
                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-sm font-medium'>{item.title}</div>
                      <div className='truncate text-xs text-default-500'>{item.section}</div>
                    </div>
                    {selectedIndex === idx && (
                      <Icon icon='solar:arrow-right-linear' className='shrink-0 text-sm text-primary' />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className='flex items-center gap-4 border-t border-default-200 px-4 py-2 text-[11px] text-default-500'>
          <span className='flex items-center gap-1'>
            <kbd className='rounded border border-default-300 px-1 py-0.5 font-mono'>↑↓</kbd> Navigate
          </span>
          <span className='flex items-center gap-1'>
            <kbd className='rounded border border-default-300 px-1 py-0.5 font-mono'>↵</kbd> Select
          </span>
          <span className='flex items-center gap-1'>
            <kbd className='rounded border border-default-300 px-1 py-0.5 font-mono'>Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  )
}

export default DocSearch
