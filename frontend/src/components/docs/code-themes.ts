import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'

// Press code theme — restrained, warm, dark-only.
// Keys = soft red (#FFB4AC), strings = foreground, comments = default-400,
// numbers/booleans = amber, keywords = brand-red tint. Punctuation recedes.
const FG = '#D9D5CE'
const INK = '#F4F1EC'
const KEY = '#FFB4AC'
const KEYWORD = '#FF6B5F'
const NUMBER = '#FFB020'
const MUTED = '#8C8882'
const PUNCT = '#6E6A65'

export const obsidianDark: Record<string, React.CSSProperties> = {
  ...oneDark,

  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    color: FG,
    background: '#050505',
    textShadow: 'none',
    fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace'
  },
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    color: FG,
    background: '#050505',
    textShadow: 'none',
    fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace'
  },

  property: { color: KEY },
  'attr-name': { color: KEY },
  tag: { color: KEY },

  function: { color: INK },
  'function-variable': { color: INK },
  'class-name': { color: INK, fontWeight: 600 },

  keyword: { color: KEYWORD },
  atrule: { color: KEYWORD },
  important: { color: KEYWORD, fontWeight: 600 },
  rule: { color: KEYWORD },

  string: { color: INK },
  char: { color: INK },
  'attr-value': { color: INK },
  inserted: { color: INK },
  regex: { color: INK },
  selector: { color: INK },
  builtin: { color: INK },

  number: { color: NUMBER },
  boolean: { color: NUMBER },
  constant: { color: NUMBER },

  variable: { color: FG },

  symbol: { color: KEY },
  deleted: { color: KEY },

  url: { color: INK, textDecoration: 'underline' },

  operator: { color: PUNCT },
  punctuation: { color: PUNCT },

  comment: { color: MUTED, fontStyle: 'italic' },
  prolog: { color: MUTED, fontStyle: 'italic' },
  cdata: { color: MUTED, fontStyle: 'italic' }
}
