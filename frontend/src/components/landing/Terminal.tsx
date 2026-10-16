'use client'

import { useEffect, useState, type JSX, type ReactNode } from 'react'
import { prefersReducedMotion, useInView } from './hooks'

type LineKind = 'cmd' | 'ok' | 'dim'

const LINES: [LineKind, string][] = [
  ['cmd', 'git clone https://github.com/qorstack/qorstack-report.git'],
  ['cmd', 'cd qorstack-report/selfhost && bash init.sh'],
  ['cmd', 'docker compose up -d'],
  ['ok', 'postgres   started'],
  ['ok', 'rustfs     started'],
  ['ok', 'gotenberg  started'],
  ['ok', 'app        started  → :8080  (web UI + /api)'],
  ['dim', ''],
  ['cmd', 'bash verify.sh'],
  ['ok', 'All checks passed']
]

const CHAR_MS = 20
const CMD_PAUSE_MS = 320
const LINE_PAUSE_MS = 230

interface TermState {
  line: number
  char: number
}

const DONE: TermState = { line: LINES.length, char: 0 }

const renderLine = ([kind, text]: [LineKind, string], key: number): ReactNode => {
  if (kind === 'cmd')
    return (
      <span key={key}>
        <span className='text-[#F2271C]'>$</span> {text}
        {'\n'}
      </span>
    )
  if (kind === 'ok')
    return (
      <span key={key} className='text-[#F4F1EC]'>
        <b className='font-bold text-[#F2271C]'>■</b> {text}
        {'\n'}
      </span>
    )
  return (
    <span key={key} className='text-[#8C8882]'>
      {text}
      {'\n'}
    </span>
  )
}

/** 04 terminal that "types" the Docker deploy once it scrolls into view. */
export const Terminal = (): JSX.Element => {
  const [ref, inView] = useInView<HTMLElement>()
  const [state, setState] = useState<TermState | null>(null)

  useEffect(() => {
    if (!inView || state !== null) return
    setState(prefersReducedMotion() ? DONE : { line: 0, char: 0 })
  }, [inView, state])

  useEffect(() => {
    if (state === null || state.line >= LINES.length) return
    const [kind, text] = LINES[state.line]
    const typing = kind === 'cmd' && state.char <= text.length
    const delay = typing ? CHAR_MS : kind === 'cmd' ? CMD_PAUSE_MS : LINE_PAUSE_MS
    const t = setTimeout(
      () => setState(typing ? { line: state.line, char: state.char + 1 } : { line: state.line + 1, char: 0 }),
      delay
    )
    return () => clearTimeout(t)
  }, [state])

  const doneLines = state ? LINES.slice(0, state.line) : []
  const current = state && state.line < LINES.length ? LINES[state.line] : null

  return (
    <figure ref={ref} className='crop m-0 border border-default-300 bg-[#040404] font-mono text-[13.5px]'>
      <span className='crop-cm' />
      <div className='flex h-10 items-center gap-2 border-b border-[#33312F] px-3.5 text-[12px] text-[#8C8882]'>
        <i className='block h-2.5 w-2.5 border border-primary bg-primary' />
        <i className='block h-2.5 w-2.5 border border-[#33312F]' />
        <i className='block h-2.5 w-2.5 border border-[#33312F]' />
        <span className='ml-2'>~/qorstack-report/selfhost</span>
      </div>
      <pre className='m-0 min-h-[320px] whitespace-pre-wrap p-[22px] leading-[1.85] text-[#D9D5CE]' aria-hidden='true'>
        {doneLines.map(renderLine)}
        {current?.[0] === 'cmd' && state ? (
          <span>
            <span className='text-[#F2271C]'>$</span> {current[1].slice(0, state.char)}
            <span className='lp-caret' />
          </span>
        ) : null}
        {state && !current ? (
          <span>
            <span className='text-[#F2271C]'>$</span> <span className='lp-caret' />
          </span>
        ) : null}
      </pre>
      <figcaption className='sr-only'>
        Terminal demo: git clone the repository, run init.sh to create .env, run docker compose up -d — postgres, rustfs,
        gotenberg and the app (web UI and API on port 8080) start — then bash verify.sh reports all checks passed.
      </figcaption>
    </figure>
  )
}

export default Terminal
