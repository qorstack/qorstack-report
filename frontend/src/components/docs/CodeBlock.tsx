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
  className?: string
}

export const CodeBlock = ({
  code,
  language = 'text',
  title,
  showHeader = true,
  compact = false,
  className = ''
}: CodeBlockProps) => {
  return (
    <div
      className={`overflow-hidden rounded-lg ${compact ? '' : 'my-4'} ${className}`}
      style={{ background: '#0A0E16' }}>
      {showHeader && (
        <div className='flex items-center justify-between px-4 py-2.5' style={{ background: '#10131C' }}>
          <span className='font-mono text-xs' style={{ color: '#7C8090' }}>{title || language}</span>
          <CopyButton text={code} variant='dark' />
        </div>
      )}
      <div className='overflow-x-auto'>
        <SyntaxHighlighter
          language={language}
          style={obsidianDark}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '13px',
            lineHeight: '1.65',
            background: 'transparent',
            padding: '16px'
          }}
          showLineNumbers={false}>
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
