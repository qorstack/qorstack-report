import type { ReactNode } from 'react'

// Only rendered inside code panels, which stay dark in both themes — so fixed dark-palette colors.
const TOKEN_CLASS = {
  key: 'text-[#FFB4AC]',
  string: 'text-[#F4F1EC]',
  comment: 'text-[#8C8882]'
} as const

type TokenKind = keyof typeof TOKEN_CLASS

const span = (kind: TokenKind, text: string, key: number): ReactNode => (
  <span key={key} className={TOKEN_CLASS[kind]}>
    {text}
  </span>
)

const JSON_TOKEN = /("(?:[^"\\]|\\.)*")(\s*:)?|(\/\/.*$)/gm

/** Lightweight JSON highlighter: keys, strings and trailing `//` comments. */
export const highlightJson = (text: string): ReactNode[] => {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  for (const match of text.matchAll(JSON_TOKEN)) {
    const start = match.index ?? 0
    if (start > last) out.push(text.slice(last, start))
    if (match[3]) {
      out.push(span('comment', match[3], i++))
    } else if (match[2]) {
      out.push(span('key', match[1], i++), match[2])
    } else {
      out.push(span('string', match[1], i++))
    }
    last = start + match[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/*
 * Snippet markup: ⟦k:keyword⟧ ⟦s:string⟧ ⟦c:comment⟧ — everything else is plain.
 * Unicode brackets never appear in real code, so no escaping is needed.
 */
const MARKUP = /⟦([ksc]):([^⟧]*)⟧/g
const MARKUP_KIND: Record<string, TokenKind> = { k: 'key', s: 'string', c: 'comment' }

export const markupToPlain = (source: string): string => source.replace(MARKUP, (_m, _kind: string, text: string) => text)

export const renderMarkup = (source: string): ReactNode[] => {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  for (const match of source.matchAll(MARKUP)) {
    const start = match.index ?? 0
    if (start > last) out.push(source.slice(last, start))
    out.push(span(MARKUP_KIND[match[1]] ?? 'string', match[2], i++))
    last = start + match[0].length
  }
  if (last < source.length) out.push(source.slice(last))
  return out
}
