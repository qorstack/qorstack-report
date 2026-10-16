'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { cn } from '@/utils/cn'
import { highlightJson } from './highlight'
import { prefersReducedMotion } from './hooks'
import {
  INITIAL_DRAFTS,
  MAX_ROWS,
  MODES,
  buildRequestJson,
  outputName,
  type LineRow,
  type PlaygroundDraft,
  type PlaygroundMode,
  type PlaygroundView
} from './playground-model'
import { InvoicePreview, PAPER_CLASS, SheetPreview, type HitTarget } from './PlaygroundPreview'

const INPUT_CLASS =
  'h-[42px] w-full border border-default-300 bg-content1 px-3 text-[15px] dark:bg-background font-medium text-foreground transition-[border-color,box-shadow] focus:border-primary focus:shadow-[inset_3px_0_0_#F2271C] focus:outline-none'
const ROW_INPUT_CLASS = cn(INPUT_CLASS, 'h-[38px] px-2.5 text-[14px]')
const LABEL_CLASS = 'font-mono text-[11.5px] tracking-[0.06em] text-default-500'

type Phase = 'idle' | 'busy' | 'done'
type RowField = 'name' | 'qty' | 'price'

const MODE_ORDER: PlaygroundMode[] = ['word', 'excel']
const PRINT_DELAY_MS = 450
const FEED_MS = 1300
const TOAST_MS = 3000

/** Hero playground: edit a Word invoice or an Excel sales report and watch the preview "print". */
export const Playground = (): JSX.Element => {
  const [mode, setMode] = useState<PlaygroundMode>('word')
  const [view, setView] = useState<PlaygroundView>('form')
  const [drafts, setDrafts] = useState<Record<PlaygroundMode, PlaygroundDraft>>(INITIAL_DRAFTS)
  const [hit, setHit] = useState<HitTarget>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [printing, setPrinting] = useState(false)
  const [feedCount, setFeedCount] = useState(0)
  const [stampVisible, setStampVisible] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const hitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextId = useRef(100)
  const rowsRef = useRef<HTMLDivElement>(null)
  const focusLastRow = useRef(false)

  const config = MODES[mode]
  const draft = drafts[mode]

  const clearTimers = useCallback((): void => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  useEffect(
    () => () => {
      clearTimers()
      if (hitTimer.current) clearTimeout(hitTimer.current)
    },
    [clearTimers]
  )

  useEffect(() => {
    if (!focusLastRow.current) return
    focusLastRow.current = false
    const inputs = rowsRef.current?.querySelectorAll<HTMLInputElement>('input[data-field="name"]')
    inputs?.[inputs.length - 1]?.select()
  }, [draft.rows.length])

  const flash = (target: HitTarget): void => {
    if (prefersReducedMotion()) return
    setHit(target)
    if (hitTimer.current) clearTimeout(hitTimer.current)
    hitTimer.current = setTimeout(() => setHit(null), 500)
  }

  const updateDraft = (patch: Partial<PlaygroundDraft>, target: HitTarget): void => {
    setDrafts(prev => ({ ...prev, [mode]: { ...prev[mode], ...patch } }))
    flash(target)
  }

  const updateRow = (id: number, field: RowField, value: string): void => {
    updateDraft({ rows: draft.rows.map(r => (r.id === id ? { ...r, [field]: value } : r)) }, 'total')
  }

  const removeRow = (id: number): void => {
    updateDraft({ rows: draft.rows.filter(r => r.id !== id) }, 'total')
  }

  const addRow = (): void => {
    if (draft.rows.length >= MAX_ROWS) return
    const row: LineRow = { id: nextId.current++, ...config.newRow }
    focusLastRow.current = true
    updateDraft({ rows: [...draft.rows, row] }, 'total')
  }

  const switchMode = (next: PlaygroundMode): void => {
    if (next === mode) return
    clearTimers()
    setMode(next)
    setPhase('idle')
    setPrinting(false)
    setStampVisible(false)
    setToast(null)
    setFeedCount(0)
  }

  const generate = (): void => {
    if (phase === 'busy') return
    const reduce = prefersReducedMotion()
    clearTimers()
    setPhase('busy')
    setPrinting(true)
    setStampVisible(false)
    setToast(null)
    const name = outputName(mode, draft)
    timers.current.push(
      setTimeout(
        () => {
          setFeedCount(c => c + 1)
          setStampVisible(true)
          timers.current.push(
            setTimeout(
              () => {
                setPrinting(false)
                setPhase('done')
                setToast(name)
                timers.current.push(setTimeout(() => setToast(null), TOAST_MS))
              },
              reduce ? 0 : FEED_MS
            )
          )
        },
        reduce ? 0 : PRINT_DELAY_MS
      )
    )
  }

  const json = useMemo(() => highlightJson(buildRequestJson(mode, draft)), [mode, draft])

  const generateLabel = phase === 'busy' ? 'Rendering…' : phase === 'done' ? 'Generate again' : config.generateLabel

  return (
    <div id='playground' className='crop scroll-mt-24 border border-default-300 bg-content2' aria-label='Interactive playground' role='region'>
      <span className='crop-cm' />

      {/* Template type */}
      <div className='grid grid-cols-2 border-b border-default-300' role='group' aria-label='Template type'>
        {MODE_ORDER.map(id => (
          <button
            key={id}
            type='button'
            aria-pressed={mode === id}
            onClick={() => switchMode(id)}
            className={cn(
              'relative h-11 border-r border-default-300 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors last:border-r-0',
              mode === id
                ? 'bg-content3 text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-primary'
                : 'text-default-500 hover:text-foreground'
            )}>
            {MODES[id].switchLabel}
          </button>
        ))}
      </div>

      {/* Request view */}
      <div className='flex h-[46px] items-center border-b border-default-300'>
        <div className='flex h-full' role='tablist' aria-label='Request view'>
          {(['form', 'json'] as const).map(v => (
            <button
              key={v}
              id={`pg-tab-${v}`}
              type='button'
              role='tab'
              aria-selected={view === v}
              aria-controls={`pg-panel-${v}`}
              onClick={() => setView(v)}
              className={cn(
                'border-r border-default-300 px-[18px] font-mono text-[12px] uppercase tracking-[0.12em]',
                view === v ? 'bg-foreground text-background' : 'text-default-500 hover:text-foreground'
              )}>
              {v === 'form' ? 'Form' : 'JSON'}
            </button>
          ))}
        </div>
        <span className='ml-auto truncate px-4 font-mono text-[12px] text-default-500'>
          <b className='text-primary'>POST</b> {config.endpoint}
        </span>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]'>
        {/* Left: form / JSON */}
        <div className='flex min-h-[460px] flex-col gap-4 border-b border-default-300 p-5 sm:border-b-0 sm:border-r'>
          {view === 'form' ? (
            <div id='pg-panel-form' role='tabpanel' aria-labelledby='pg-tab-form' className='flex flex-1 flex-col gap-4'>
              {config.fields.map((field, i) => {
                const key = i === 0 ? 'first' : 'second'
                const inputId = `pg-${mode}-${key}`
                return (
                  <div key={inputId} className='flex flex-col gap-[7px]'>
                    <label htmlFor={inputId} className={LABEL_CLASS}>
                      <em className='not-italic text-primary'>{field.marker}</em>
                      <span className='sr-only'> {field.ariaLabel}</span>
                    </label>
                    <input
                      id={inputId}
                      className={INPUT_CLASS}
                      value={draft[key]}
                      autoComplete='off'
                      onChange={e => updateDraft(key === 'first' ? { first: e.target.value } : { second: e.target.value }, key)}
                    />
                  </div>
                )
              })}

              <div className='flex flex-col gap-[7px]'>
                <span className={LABEL_CLASS} id={`pg-${mode}-rows`}>
                  <em className='not-italic text-primary'>{config.rowMarker}</em> · {config.rowColumns}
                </span>
                <div ref={rowsRef} className='flex flex-col gap-1.5' role='group' aria-labelledby={`pg-${mode}-rows`}>
                  {draft.rows.map((row, i) => (
                    <div key={row.id} className='grid grid-cols-[minmax(90px,1fr)_52px_76px_32px] gap-1.5'>
                      <input
                        className={ROW_INPUT_CLASS}
                        aria-label={`${config.rowNouns.name} ${i + 1}`}
                        data-field='name'
                        value={row.name}
                        autoComplete='off'
                        onChange={e => updateRow(row.id, 'name', e.target.value)}
                      />
                      <input
                        className={ROW_INPUT_CLASS}
                        aria-label={`${config.rowNouns.qty} ${i + 1}`}
                        type='number'
                        min={0}
                        inputMode='decimal'
                        value={row.qty}
                        onChange={e => updateRow(row.id, 'qty', e.target.value)}
                      />
                      <input
                        className={ROW_INPUT_CLASS}
                        aria-label={`${config.rowNouns.price} ${i + 1}`}
                        type='number'
                        min={0}
                        inputMode='decimal'
                        value={row.price}
                        onChange={e => updateRow(row.id, 'price', e.target.value)}
                      />
                      <button
                        type='button'
                        aria-label={`Remove row ${i + 1}`}
                        onClick={() => removeRow(row.id)}
                        className='border border-default-300 text-default-400 transition-colors hover:border-primary hover:text-primary'>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type='button'
                  onClick={addRow}
                  disabled={draft.rows.length >= MAX_ROWS}
                  className='self-start border border-dashed border-default-300 px-3 py-[7px] font-mono text-[12px] tracking-[0.06em] text-default-500 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-default-300 disabled:hover:text-default-500'>
                  + ADD ROW
                </button>
              </div>

              <button
                type='button'
                onClick={generate}
                aria-busy={phase === 'busy'}
                className='mt-auto inline-flex h-[52px] w-full items-center justify-center gap-3 bg-primary px-6 text-[15px] font-bold uppercase tracking-[0.04em] text-white transition-colors [font-variation-settings:"wdth"_90] hover:bg-primary-600'>
                {phase === 'busy' && (
                  <span className='lp-spin block h-3.5 w-3.5 border-2 border-white border-r-transparent' aria-hidden='true' />
                )}
                {generateLabel}
              </button>
            </div>
          ) : (
            <pre
              id='pg-panel-json'
              role='tabpanel'
              aria-labelledby='pg-tab-json'
              aria-label='Request body'
              tabIndex={0}
              className='m-0 flex-1 overflow-auto whitespace-pre border border-divider bg-[#050505] p-[18px] font-mono text-[12px] leading-[1.75] text-[#D9D5CE]'>
              {json}
            </pre>
          )}
        </div>

        {/* Right: printer + paper */}
        <div className='lp-stripes relative flex flex-col items-center overflow-hidden px-[22px] pb-[26px] pt-[22px]'>
          <div className='relative z-[2] h-4 w-full max-w-[340px] border border-default-300 bg-[#1B1B1B]' aria-hidden='true'>
            <span className='absolute inset-x-3 bottom-[3px] h-[3px] bg-[#050505]' />
            <i className={cn('absolute right-2 top-1 block h-1.5 w-1.5 bg-default-400', printing && 'lp-led-on')} />
          </div>
          <div className='-mt-[3px] w-full max-w-[316px] overflow-hidden'>
            <article
              key={`${mode}-${feedCount}`}
              className={cn(PAPER_CLASS, 'px-5 pb-4 pt-5', feedCount > 0 && 'lp-feed')}
              aria-label={mode === 'word' ? 'Invoice preview' : 'Spreadsheet preview'}>
              {mode === 'word' ? <InvoicePreview draft={draft} hit={hit} /> : <SheetPreview draft={draft} hit={hit} />}
              <div
                className={cn(
                  'lp-stamp pointer-events-none absolute right-3.5 top-[68px] border-[3px] border-double border-primary px-2.5 py-[5px] font-mono text-[12px] font-bold tracking-[0.18em] text-primary',
                  stampVisible && 'is-shown'
                )}
                aria-hidden='true'>
                {config.stamp}
              </div>
            </article>
          </div>
          <div
            role='status'
            aria-live='polite'
            className={cn(
              'absolute inset-x-[22px] bottom-3.5 z-[3] flex items-center gap-2.5 bg-foreground px-3 py-2.5 font-mono text-[12px] text-background transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]',
              toast ? 'translate-y-0' : 'translate-y-[140%]'
            )}>
            <i className='block h-2 w-2 flex-none bg-primary' aria-hidden='true' />
            <span>{toast ?? ''}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Playground
