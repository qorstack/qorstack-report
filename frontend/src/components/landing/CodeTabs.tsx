'use client'

import { useEffect, useMemo, useRef, useState, type JSX, type KeyboardEvent } from 'react'
import { cn } from '@/utils/cn'
import { markupToPlain, renderMarkup } from './highlight'
import { prefersReducedMotion, useInView } from './hooks'

type Lang = 'curl' | 'node' | 'dotnet'

const TABS: { id: Lang; label: string }[] = [
  { id: 'curl', label: 'curl' },
  { id: 'node', label: 'Node.js' },
  { id: 'dotnet', label: '.NET' }
]

/* Markup: ⟦k:…⟧ keyword/key · ⟦s:…⟧ string · ⟦c:…⟧ comment (see highlight.tsx) */
const SNIPPETS: Record<Lang, string> = {
  curl: [
    '⟦c:curl -X POST $API/render/word/template \\⟧',
    '⟦c:  -H "X-API-Key: $KEY" \\⟧',
    '⟦c:  -H "Content-Type: application/json" \\⟧',
    "⟦c:  -d '⟧{",
    '  ⟦k:"templateKey"⟧: ⟦s:"invoice"⟧,',
    '  ⟦k:"fileType"⟧: ⟦s:"pdf"⟧,',
    '  ⟦k:"replace"⟧: [',
    '    { ⟦k:"key"⟧: ⟦s:"customer"⟧, ⟦k:"value"⟧: ⟦s:"ACME Co."⟧ }',
    '  ],',
    '  ⟦k:"table"⟧: [{',
    '    ⟦k:"columns"⟧: [⟦s:"item"⟧, ⟦s:"qty"⟧],',
    '    ⟦k:"rows"⟧: [[⟦s:"Template setup"⟧, 1]]',
    '  }]',
    "}⟦c:'⟧",
    '',
    '⟦c:# → { "downloadUrl": "https://…/invoice.pdf" }⟧',
    '⟦c:# Excel? POST /render/excel/template → .xlsx⟧'
  ].join('\n'),
  node: [
    "⟦k:import⟧ { QorstackApi } ⟦k:from⟧ ⟦s:'qorstack-report-sdk'⟧;",
    '',
    '⟦k:const⟧ api = ⟦k:new⟧ QorstackApi({ baseUrl, securityData });',
    '',
    '⟦k:const⟧ { data } = ⟦k:await⟧ api.render.postRenderWordTemplate({',
    "  templateKey: ⟦s:'invoice'⟧,",
    "  replace: [{ key: ⟦s:'customer'⟧, value: ⟦s:'ACME Co.'⟧ }],",
    '  table: [{',
    "    columns: [⟦s:'item'⟧, ⟦s:'qty'⟧],",
    '    rows: items.map(i => [i.name, i.qty])',
    '  }]',
    '});',
    '',
    'console.log(data.downloadUrl);',
    '⟦c:// Excel: api.render.postRenderExcelTemplate({ … })⟧'
  ].join('\n'),
  dotnet: [
    '⟦k:var⟧ api = ⟦k:new⟧ QorstackApi(apiUrl, apiKey);',
    '',
    '⟦k:var⟧ res = ⟦k:await⟧ api.PostRenderWordTemplateAsync(⟦k:new⟧ PdfFromTemplateRequest',
    '{',
    '    TemplateKey = ⟦s:"invoice"⟧,',
    '    Replace = ⟦k:new⟧ List<KeyValueRequest>',
    '    {',
    '        ⟦k:new⟧() { Key = ⟦s:"customer"⟧, Value = ⟦s:"ACME Co."⟧ }',
    '    }',
    '});',
    '',
    'Console.WriteLine(res.DownloadUrl);',
    '⟦c:// Excel: api.PostRenderExcelTemplateAsync(…)⟧'
  ].join('\n')
}

const CHARS_PER_TICK = 4
const TICK_MS = 16

/** 03 code sample with language tabs, a one-time typing effect and copy-to-clipboard. */
export const CodeTabs = (): JSX.Element => {
  const [lang, setLang] = useState<Lang>('curl')
  const [typed, setTyped] = useState<number | null>(null)
  const [copyLabel, setCopyLabel] = useState('Copy')
  const [ref, inView] = useInView<HTMLDivElement>()
  const startedRef = useRef(false)
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const plain = useMemo(() => markupToPlain(SNIPPETS[lang]), [lang])
  const rich = useMemo(() => renderMarkup(SNIPPETS[lang]), [lang])

  // Type the first snippet once, when the block scrolls into view.
  useEffect(() => {
    if (!inView || startedRef.current) return
    startedRef.current = true
    if (prefersReducedMotion()) return
    const total = markupToPlain(SNIPPETS.curl).length
    let count = 0
    const stop = (): void => {
      if (typingRef.current) clearInterval(typingRef.current)
      typingRef.current = null
      setTyped(null)
    }
    typingRef.current = setInterval(() => {
      count += CHARS_PER_TICK
      if (count >= total) {
        stop()
        return
      }
      setTyped(count)
    }, TICK_MS)
    setTyped(0)
    return () => {
      stop()
      startedRef.current = false
    }
  }, [inView])

  useEffect(() => {
    if (copyLabel === 'Copy') return
    const t = setTimeout(() => setCopyLabel('Copy'), 1500)
    return () => clearTimeout(t)
  }, [copyLabel])

  const selectTab = (next: Lang): void => {
    if (typingRef.current) clearInterval(typingRef.current)
    typingRef.current = null
    setTyped(null)
    setLang(next)
  }

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = (index + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length
    selectTab(TABS[next].id)
    tabRefs.current[next]?.focus()
  }

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(plain)
      setCopyLabel('Copied')
    } catch {
      setCopyLabel('Failed')
    }
  }

  return (
    <div ref={ref} className='crop border border-default-300 bg-[#050505]'>
      <span className='crop-cm' />
      <div className='flex border-b border-[#33312F]'>
        <div role='tablist' aria-label='Language' className='flex'>
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              ref={el => {
                tabRefs.current[i] = el
              }}
              id={`code-tab-${tab.id}`}
              type='button'
              role='tab'
              aria-selected={lang === tab.id}
              aria-controls='code-panel'
              tabIndex={lang === tab.id ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={e => onTabKey(e, i)}
              className={cn(
                'border-r border-[#33312F] px-[18px] py-3.5 font-mono text-[12px] uppercase tracking-[0.08em] transition-colors',
                lang === tab.id ? 'bg-primary text-white' : 'text-[#A9A59F] hover:text-[#F4F1EC]'
              )}>
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type='button'
          onClick={copy}
          aria-live='polite'
          className='ml-auto border-l border-[#33312F] px-[18px] font-mono text-[12px] uppercase tracking-[0.08em] text-[#F4F1EC] transition-colors hover:bg-[#1C1C1C]'>
          {copyLabel}
        </button>
      </div>
      <pre
        id='code-panel'
        role='tabpanel'
        aria-labelledby={`code-tab-${lang}`}
        tabIndex={0}
        className='m-0 min-h-[360px] overflow-auto p-6 font-mono text-[13.5px] leading-[1.8] text-[#D9D5CE]'>
        {typed === null ? (
          rich
        ) : (
          <>
            {plain.slice(0, typed)}
            <span className='lp-caret' aria-hidden='true' />
          </>
        )}
      </pre>
    </div>
  )
}

export default CodeTabs
