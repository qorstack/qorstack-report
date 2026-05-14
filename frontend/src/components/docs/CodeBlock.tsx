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
}

const BG = '#050505'
const CHROME = '#0b0b0b'
const MUTED = '#7C8090'
const LINE_NUM = 'rgb(113, 113, 122)'

export const CodeBlock = ({
  code,
  language = 'text',
  title,
  showHeader = true,
  compact = false,
  showLineNumbers = true,
  className = ''
}: CodeBlockProps) => {
  return (
    <div
      className={`overflow-hidden rounded-xl ${compact ? '' : 'my-4'} ${className}`}
      style={{ background: BG }}>
      {showHeader && (
        <div
          className='flex items-center justify-between border-b px-3 py-1.5'
          style={{ background: CHROME, borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className='font-mono text-xs' style={{ color: MUTED }}>
            {title || language}
          </span>
          <CopyButton text={code} variant='dark' />
        </div>
      )}
      <div className='no-scrollbar overflow-x-auto'>
        <SyntaxHighlighter
          language={language}
          style={obsidianDark}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '12.5px',
            lineHeight: 1.55,
            background: 'transparent',
            padding: '12px',
            minWidth: '100%',
            width: 'max-content'
          }}
          showLineNumbers={showLineNumbers}
          lineNumberStyle={{
            minWidth: '2.25em',
            paddingRight: '1em',
            textAlign: 'right',
            userSelect: 'none',
            color: LINE_NUM
          }}
          wrapLongLines={false}>
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
