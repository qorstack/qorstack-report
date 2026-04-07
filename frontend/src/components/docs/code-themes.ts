import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'

// "Obsidian Navy" code theme
// Variable names (plain text) = cyan-blue base color
// String values = muted gray (visible but not prominent)
// Keys/properties = bright sky blue
// Numbers = gold, Keywords = rose italic, Functions = periwinkle
export const obsidianDark: Record<string, React.CSSProperties> = {
  ...oneDark,

  // Base surfaces — color sets the fallback for all undecorated tokens (variable names, identifiers)
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    color: '#60B8FF',   // bright sky-blue = local variable names
    background: '#0A0E16',
    textShadow: 'none'
  },
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    color: '#60B8FF',
    background: '#0A0E16',
    textShadow: 'none'
  },

  // ── KEYS / PROPERTIES — same bright sky blue (consistent with vars) ──
  property: { color: '#60B8FF', fontWeight: 500 },
  'attr-name': { color: '#60B8FF' },
  tag: { color: '#60B8FF' },

  // ── FUNCTIONS — periwinkle ──
  function: { color: '#B8C5F7' },
  'function-variable': { color: '#B8C5F7' },

  // ── KEYWORDS — rose, italic ──
  keyword: { color: '#F28FA8', fontStyle: 'italic' },
  atrule: { color: '#F28FA8' },
  important: { color: '#F28FA8', fontWeight: 600 },
  rule: { color: '#F28FA8' },

  // ── STRING VALUES — soft green (classic, distinct from blue vars) ──
  string: { color: '#A8D4A0' },
  char: { color: '#A8D4A0' },
  'attr-value': { color: '#A8D4A0' },
  inserted: { color: '#A8D4A0' },
  regex: { color: '#A8D4A0' },
  selector: { color: '#A8D4A0' },
  builtin: { color: '#A8D4A0' },

  // ── NUMBERS, BOOLEANS — golden amber ──
  number: { color: '#FBBF24' },
  boolean: { color: '#FBBF24', fontWeight: 500 },
  constant: { color: '#FBBF24' },

  // ── EXPLICIT VARIABLE TOKEN ($var in PHP/SCSS) ──
  variable: { color: '#60B8FF' },

  // ── CLASSES — light periwinkle ──
  'class-name': { color: '#C8D5FA' },

  // ── SYMBOLS, DELETED ──
  symbol: { color: '#F28B8B' },
  deleted: { color: '#F28B8B' },

  // ── URLS ──
  url: { color: '#B8C5F7', textDecoration: 'underline' },

  // ── OPERATORS, PUNCTUATION — muted (recede) ──
  operator: { color: '#5A6070' },
  punctuation: { color: '#5A6070' },

  // ── COMMENTS — muted italic ──
  comment: { color: '#6A6D7C', fontStyle: 'italic' },
  prolog: { color: '#6A6D7C', fontStyle: 'italic' },
  cdata: { color: '#6A6D7C', fontStyle: 'italic' }
}
