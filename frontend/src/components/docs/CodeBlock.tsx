import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { obsidianDark } from './code-themes'
import { CopyButton } from './CopyButton'

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  /** Hide the chrome bar entirely — useful when embedding inside custom terminal UIs */
  showHeader?: boolean
  /** Remove default my-4 margin */
  compact?: boolean
  /** Hide line numbers (default: true — matches CodeSwitcher) */
  showLineNumbers?: boolean
  className?: string
  /** Cap the scroll area height (e.g. 480 or '60vh'). When set, content scrolls vertically. */
  maxHeight?: number | string
  /** When set, renders a download button in the header next to copy. */
  downloadHref?: string
  /** Optional filename for the download attribute. */
  downloadFilename?: string
  /** Wrap long lines instead of scrolling horizontally (good for prose / prompts). */
  wrap?: boolean
}

const LINE_NUM = '#6E6A65'

export const CodeBlock = ({
  code,
  language = 'text',
  title,
  showHeader = true,
  compact = false,
  showLineNumbers = true,
  className = '',
  maxHeight,
  downloadHref,
  downloadFilename,
  wrap = false
}: CodeBlockProps) => {
  // `dark` scopes HeroUI tokens so code blocks stay dark in both themes
  return (
    <div className={`dark overflow-hidden border border-divider bg-[#050505] text-foreground ${compact ? '' : 'my-4'} ${className}`}>
      {showHeader && (
        <div className='flex items-center justify-between gap-3 border-b border-divider bg-content1 py-1.5 pl-3 pr-1.5'>
          <span className='font-mono text-[12px] uppercase tracking-[0.12em] text-default-500'>
            {title || language}
          </span>
          <div className='flex items-center gap-1.5'>
            {downloadHref && (
              <a
                href={downloadHref}
                download={downloadFilename}
                aria-label={downloadFilename ? `Download ${downloadFilename}` : 'Download'}
                className='group inline-flex h-7 items-center gap-1.5 bg-primary px-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary-600'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                  strokeLinecap='square'
                  strokeLinejoin='miter'
                  aria-hidden='true'
                  className='h-3 w-3 transition-transform group-hover:translate-y-0.5'>
                  <path d='M21 15v6H3v-6' />
                  <polyline points='7 10 12 15 17 10' />
                  <line x1='12' y1='15' x2='12' y2='3' />
                </svg>
                Download
              </a>
            )}
            <CopyButton text={code} />
          </div>
        </div>
      )}
      <div className='relative'>
        {!showHeader && (
          <div className='absolute right-1.5 top-1.5 z-10 bg-[#050505]'>
            <CopyButton text={code} />
          </div>
        )}
        <div
          className={`no-scrollbar ${wrap ? '' : 'overflow-x-auto'} ${maxHeight === undefined ? '' : 'overflow-y-auto'}`}
          style={
            maxHeight === undefined
              ? undefined
              : { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }
          }>
          <SyntaxHighlighter
            language={language}
            style={obsidianDark}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: '13px',
              lineHeight: 1.7,
              background: 'transparent',
              padding: '14px',
              minWidth: '100%',
              width: wrap ? '100%' : 'max-content',
              ...(wrap ? { whiteSpace: 'pre-wrap', wordBreak: 'break-word' } : {})
            }}
            showLineNumbers={showLineNumbers}
            lineNumberStyle={{
              minWidth: '2.25em',
              paddingRight: '1em',
              textAlign: 'right',
              userSelect: 'none',
              color: LINE_NUM
            }}
            wrapLongLines={wrap}>
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  )
}
