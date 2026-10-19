'use client'

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Progress, Spinner, addToast, cn } from '@heroui/react'
import { API_BASE_URL } from '@/api/base-url'
import Icon from '@/components/icon'
import { PanelHeader } from '@/components/ui/PageHeader'
import { api } from '@/api/generated/main-service'
import { useUpgradeGate } from '@/hooks/use-upgrade-gate'
import type { ImportChange, ImportTemplateItem, ProjectImportResult } from '@/api/generated/main-service/apiGenerated'

type ImportAction = ImportTemplateItem['action']

const ACTION_LABEL: Record<ImportAction, string> = { create: 'Create', update: 'Update', skip: 'Skip' }

/** What the row means for this project: new, changed, identical, or left out. */
type ImportStatus = 'new' | 'changed' | 'unchanged' | 'skipped'

const statusOf = (t: ImportTemplateItem): ImportStatus => {
  if (t.action === 'create') return 'new'
  if (t.action === 'update') return 'changed'
  return t.unchanged ? 'unchanged' : 'skipped'
}

const STATUS: Record<ImportStatus, { label: string; dot: string }> = {
  new: { label: 'New', dot: 'bg-success' },
  changed: { label: 'Changed', dot: 'bg-warning' },
  unchanged: { label: 'No changes', dot: 'bg-default-300' },
  skipped: { label: 'Skipped', dot: 'bg-danger' }
}

/** Changed first (what needs reading), then new, skipped, and identical last. */
const STATUS_ORDER: Record<ImportStatus, number> = { changed: 0, new: 1, skipped: 2, unchanged: 3 }

const CHANGE_ICON: Record<ImportChange['kind'], string> = {
  file: 'lucide:file-diff',
  fields: 'lucide:braces',
  name: 'lucide:pencil',
  testData: 'lucide:flask-conical',
  key: 'lucide:key-round'
}

const StatusBadge = ({ status }: { status: ImportStatus }): React.JSX.Element => (
  <span
    className={cn(
      'inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em]',
      status === 'unchanged' ? 'border-divider text-default-400' : 'border-default-300 text-foreground'
    )}>
    <span aria-hidden className={cn('h-1.5 w-1.5', STATUS[status].dot)} />
    {STATUS[status].label}
  </span>
)

const FieldChips = ({ names, tone }: { names: string[]; tone: 'added' | 'removed' }): React.JSX.Element => (
  <span className='flex flex-wrap gap-1'>
    {names.map(n => (
      <span
        key={n}
        className={cn(
          'border px-1.5 py-px font-mono text-[12px]',
          tone === 'added' ? 'border-success/40 text-success' : 'border-danger/40 text-danger line-through'
        )}>
        {tone === 'added' ? '+' : '−'} {n}
      </span>
    ))}
  </span>
)

/** One template in the import review: status, versions, and what differs from this project. */
const ImportRow = ({ item }: { item: ImportTemplateItem }): React.JSX.Element => {
  const status = statusOf(item)
  const changes = item.changes ?? []
  const versions =
    item.fromVersion != null && status === 'changed' ? `v${item.fromVersion} → v${item.toVersion}` : `v${item.toVersion}`
  return (
    <li className='flex flex-col gap-2 px-4 py-3'>
      <div className='flex flex-wrap items-start justify-between gap-x-4 gap-y-1'>
        <div className='min-w-0'>
          <div className='truncate font-medium text-foreground'>{item.name}</div>
          <div className='truncate font-mono text-[12px] text-default-500'>{item.key}</div>
        </div>
        <div className='flex items-center gap-3'>
          <span className='whitespace-nowrap font-mono text-[12px] text-default-500'>{versions}</span>
          <StatusBadge status={status} />
        </div>
      </div>
      {status === 'skipped' && item.reason && <p className='text-[13px] text-default-500'>Not imported: {item.reason}.</p>}
      {status === 'new' && changes.length === 0 && (
        <p className='text-[13px] text-default-500'>Added as a new template with the same key.</p>
      )}
      {changes.length > 0 && (
        <ul className='flex flex-col gap-1.5'>
          {changes.map((c, i) => (
            <li key={`${c.kind}-${i}`} className='flex items-start gap-2 text-[13px] text-default-600'>
              <Icon icon={CHANGE_ICON[c.kind] ?? 'lucide:dot'} className='mt-0.5 h-3.5 w-3.5 shrink-0 text-default-500' aria-hidden />
              <span className='flex min-w-0 flex-col gap-1'>
                <span>{c.summary}</span>
                {c.added.length > 0 && <FieldChips names={c.added} tone='added' />}
                {c.removed.length > 0 && <FieldChips names={c.removed} tone='removed' />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

const ActionBadge = ({ action }: { action: ImportAction }): React.JSX.Element => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em]',
      action === 'skip' ? 'border-divider text-default-400' : 'border-default-300 text-foreground'
    )}>
    <span
      aria-hidden
      className={cn('h-1.5 w-1.5', action === 'create' ? 'bg-success' : action === 'update' ? 'bg-warning' : 'bg-default-300')}
    />
    {ACTION_LABEL[action]}
  </span>
)

const errorMessage = (error: unknown): string => {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data) return data
  if (data && typeof data === 'object') {
    const d = data as { detail?: string; title?: string; message?: string }
    return d.detail || d.message || d.title || 'Something went wrong.'
  }
  return 'Something went wrong.'
}

const fileNameFrom = (disposition: string | undefined, fallback: string): string => {
  if (!disposition) return fallback
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  if (star) return decodeURIComponent(star[1])
  const plain = /filename="?([^";]+)"?/i.exec(disposition)
  return plain ? plain[1] : fallback
}

type LiveStatus = 'waiting' | 'running' | 'imported' | 'failed'

interface LiveRow {
  id: string
  kind: 'font' | 'template'
  name: string
  key?: string
  status: LiveStatus
  error?: string | null
}

/** One line of POST …/import?stream=true (application/x-ndjson). */
type StreamEvent =
  | { type: 'start'; total: number }
  | { type: 'font' | 'template'; done: number; total: number; name: string; key?: string | null; result?: string | null; error?: string | null }
  | { type: 'done'; result: ProjectImportResult }
  | { type: 'error'; message: string }

/** Posts the ZIP and calls onEvent for every progress line as it arrives. */
const streamImport = async (projectId: string, zip: File, onEvent: (e: StreamEvent) => void): Promise<void> => {
  const post = (): Promise<Response> => {
    const form = new FormData()
    form.append('file', zip)
    return fetch(`${API_BASE_URL}/projects/${projectId}/import?dryRun=false&stream=true`, {
      method: 'POST',
      body: form,
      credentials: 'include'
    })
  }

  let response = await post()
  if (response.status === 401) {
    // Expired access token: refresh once (the axios client does this for normal calls), then retry.
    await api.instance.post('/auth/refresh-token')
    response = await post()
  }
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '')
    let message = text || `Import failed (${response.status}).`
    try {
      const data = JSON.parse(text) as { detail?: string; title?: string }
      message = data.detail || data.title || message
    } catch {
      // plain-text error body
    }
    throw new Error(message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (value) buffer += decoder.decode(value, { stream: true })
    let nl = buffer.indexOf('\n')
    while (nl >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (line) onEvent(JSON.parse(line) as StreamEvent)
      nl = buffer.indexOf('\n')
    }
    if (done) break
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer.trim()) as StreamEvent)
}

const LiveIcon = ({ status }: { status: LiveStatus }): React.JSX.Element => {
  if (status === 'running') return <Spinner size='sm' color='default' aria-label='Importing' />
  if (status === 'imported') return <Icon icon='lucide:check' className='h-4 w-4 text-success' aria-label='Imported' />
  if (status === 'failed') return <Icon icon='lucide:x' className='h-4 w-4 text-danger' aria-label='Failed' />
  return <span aria-label='Waiting' className='mx-1.5 h-1.5 w-1.5 bg-default-400' />
}

/** Export & import (Pro): move a whole project between deployments as one ZIP. */
export const ProjectTransferPanel = ({
  projectId,
  projectName,
  showHeader = true
}: {
  projectId: string
  projectName: string
  /** Off on the Export & import page, whose page header already says what this is. */
  showHeader?: boolean
}): React.JSX.Element => {
  const { requireFeature, gateModal } = useUpgradeGate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [planning, setPlanning] = useState(false)
  const [applying, setApplying] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [plan, setPlan] = useState<ProjectImportResult | null>(null)
  const [showUnchanged, setShowUnchanged] = useState(false)
  const router = useRouter()
  /** review → importing (live progress) → finished (summary). */
  const [phase, setPhase] = useState<'review' | 'importing' | 'finished'>('review')
  const [rows, setRows] = useState<LiveRow[]>([])
  const [streamError, setStreamError] = useState<string | null>(null)

  const handleExport = async (): Promise<void> => {
    if (!requireFeature('projectTransfer')) return
    setExporting(true)
    try {
      const response = await api.instance.get<Blob>(`/projects/${projectId}/export`, { responseType: 'blob' })
      const name = fileNameFrom(response.headers['content-disposition'] as string | undefined, `${projectName}.qorstack.zip`)
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      link.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      addToast({ title: 'Export failed', description: errorMessage(error), color: 'danger' })
    } finally {
      setExporting(false)
    }
  }

  const send = async (zip: File, dryRun: boolean): Promise<ProjectImportResult> => {
    const form = new FormData()
    form.append('file', zip)
    const response = await api.instance.post<ProjectImportResult>(`/projects/${projectId}/import?dryRun=${dryRun}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  }

  const handleChoose = (): void => {
    if (!requireFeature('projectTransfer')) return
    inputRef.current?.click()
  }

  const handleFile = async (picked: File | undefined): Promise<void> => {
    if (inputRef.current) inputRef.current.value = ''
    if (!picked) return
    setFile(picked)
    setPlanning(true)
    try {
      setPlan(await send(picked, true))
    } catch (error: any) {
      setFile(null)
      addToast({ title: 'Could not read the file', description: errorMessage(error), color: 'danger' })
    } finally {
      setPlanning(false)
    }
  }

  const changes = plan ? plan.templates.filter(t => t.action !== 'skip').length + plan.fonts.filter(f => f.action !== 'skip').length : 0
  const templates = plan?.templates ?? []
  const counts = templates.reduce<Record<ImportStatus, number>>(
    (acc, t) => ({ ...acc, [statusOf(t)]: acc[statusOf(t)] + 1 }),
    { new: 0, changed: 0, unchanged: 0, skipped: 0 }
  )
  const listed = templates
    .filter(t => statusOf(t) !== 'unchanged')
    .sort((a, b) => STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)])
  const unchanged = templates.filter(t => statusOf(t) === 'unchanged')

  const resetImport = (): void => {
    setPlan(null)
    setFile(null)
    setShowUnchanged(false)
    setPhase('review')
    setRows([])
    setStreamError(null)
  }

  const handleApply = async (): Promise<void> => {
    if (!file || !plan) return
    // Same order as the server: fonts first, then templates.
    const initial: LiveRow[] = [
      ...plan.fonts.filter(f => f.action !== 'skip').map(f => ({ id: `f:${f.name}`, kind: 'font' as const, name: f.name, status: 'waiting' as LiveStatus })),
      ...plan.templates
        .filter(t => t.action !== 'skip')
        .map(t => ({ id: `t:${t.key}`, kind: 'template' as const, name: t.name, key: t.key, status: 'waiting' as LiveStatus }))
    ]
    if (initial.length > 0) initial[0] = { ...initial[0], status: 'running' }
    setRows(initial)
    setStreamError(null)
    setPhase('importing')
    setApplying(true)

    try {
      await streamImport(projectId, file, e => {
        if (e.type === 'font' || e.type === 'template') {
          const id = e.type === 'font' ? `f:${e.name}` : `t:${e.key}`
          setRows(prev => {
            const next = prev.map(row =>
              row.id === id
                ? { ...row, status: (e.result === 'failed' ? 'failed' : 'imported') as LiveStatus, error: e.error }
                : row
            )
            const waiting = next.findIndex(row => row.status === 'waiting')
            if (waiting >= 0) next[waiting] = { ...next[waiting], status: 'running' }
            return next
          })
        } else if (e.type === 'error') {
          setStreamError(e.message)
        }
      })
    } catch (error: any) {
      setStreamError(error?.message || errorMessage(error))
    } finally {
      // Anything still waiting did not run (stream ended early).
      setRows(prev => prev.map(row => (row.status === 'waiting' || row.status === 'running' ? { ...row, status: 'failed', error: row.error ?? 'Not imported' } : row)))
      setApplying(false)
      setPhase('finished')
    }
  }

  const imported = rows.filter(r => r.status === 'imported').length
  const failedRows = rows.filter(r => r.status === 'failed')
  const finishedCount = imported + failedRows.length
  const fontsImported = rows.some(r => r.kind === 'font' && r.status === 'imported')
  const templatesHref = `/project/${projectId}/templates`

  return (
    <section className='border border-divider bg-content1'>
      {showHeader && (
        <PanelHeader
          title='Export & import'
          description='Move this project to another Qorstack deployment, e.g. from staging to production.'
          actions={<span className='border border-default-300 px-1.5 py-0.5 font-mono text-[11px] text-default-500'>PRO</span>}
        />
      )}
      <div className='grid gap-px bg-divider md:grid-cols-2'>
        <div className='flex flex-col gap-3 bg-content1 p-5'>
          <h3 className='text-[14px] font-semibold text-foreground'>Export</h3>
          <p className='text-[14px] text-default-500'>
            One .zip with the current version of every template, its test data and images, and your uploaded fonts. API keys,
            members and history are not included.
          </p>
          <Button
            variant='bordered'
            className='h-10 self-start border-default-300 font-medium'
            isLoading={exporting}
            startContent={!exporting && <Icon icon='lucide:download' className='h-4 w-4' />}
            onPress={handleExport}>
            Export project
          </Button>
        </div>
        <div className='flex flex-col gap-3 bg-content1 p-5'>
          <h3 className='text-[14px] font-semibold text-foreground'>Import</h3>
          <p className='text-[14px] text-default-500'>
            Templates are matched by key. New ones are added, changed ones get a new version (the old one stays in Version
            history), identical ones are left alone. You review every difference before anything is saved.
          </p>
          <input
            ref={inputRef}
            type='file'
            accept='.zip,application/zip'
            className='hidden'
            aria-label='Choose a project export (.zip)'
            onChange={e => void handleFile(e.target.files?.[0])}
          />
          <Button
            variant='bordered'
            className='h-10 self-start border-default-300 font-medium'
            isLoading={planning}
            startContent={!planning && <Icon icon='lucide:upload' className='h-4 w-4' />}
            onPress={handleChoose}>
            Choose .zip
          </Button>
        </div>
      </div>

      <Modal
        isOpen={!!plan}
        isDismissable={!applying}
        hideCloseButton={applying}
        onOpenChange={open => {
          if (!open && !applying) resetImport()
        }}
        size='3xl'
        scrollBehavior='inside'
        classNames={{ base: 'border border-divider bg-content1' }}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className='flex flex-col gap-1'>
                <span className='text-[16px] font-semibold'>
                  {phase === 'review' ? 'Review import' : phase === 'importing' ? 'Importing…' : 'Import finished'}
                </span>
                <span className='text-[13px] font-normal text-default-500'>
                  From {plan?.sourceProject || 'an export'}
                  {plan?.exportedAt ? ` · exported ${new Date(plan.exportedAt).toLocaleString()}` : ''} · {file?.name}
                </span>
              </ModalHeader>
              <ModalBody className='gap-5'>
                {phase !== 'review' ? (
                  <div className='flex flex-col gap-4'>
                    {phase === 'finished' && (
                      <div
                        role='status'
                        className={cn(
                          'flex items-start gap-3 border px-4 py-3',
                          failedRows.length > 0 || streamError ? 'border-warning/50' : 'border-success/40'
                        )}>
                        <Icon
                          icon={failedRows.length > 0 || streamError ? 'lucide:triangle-alert' : 'lucide:circle-check'}
                          className={cn('mt-0.5 h-5 w-5 shrink-0', failedRows.length > 0 || streamError ? 'text-warning' : 'text-success')}
                        />
                        <div className='flex flex-col gap-1 text-[14px]'>
                          <span className='font-medium text-foreground'>
                            {failedRows.length === 0 && !streamError
                              ? `Done — ${imported} item${imported === 1 ? '' : 's'} imported.`
                              : `${imported} imported, ${failedRows.length} not imported.`}
                          </span>
                          {streamError && <span className='text-[13px] text-danger'>{streamError}</span>}
                          {failedRows.length > 0 && (
                            <span className='text-[13px] text-default-500'>
                              Items that were imported stay imported. Fix the reason below and import the same file again — finished items
                              show as No changes.
                            </span>
                          )}
                          {fontsImported && (
                            <span className='text-[13px] text-default-500'>
                              Fonts were added. Previews made before the renderer had them can look off: wait about a minute, then use
                              Regenerate previews on the Templates page.
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className='flex flex-col gap-2'>
                      <div className='flex items-center justify-between text-[13px] text-default-500'>
                        <span>
                          {phase === 'importing' ? 'Importing' : 'Finished'} · {finishedCount} / {rows.length}
                        </span>
                        <span>
                          <span className='text-success'>{imported} imported</span>
                          {failedRows.length > 0 && <span className='text-danger'> · {failedRows.length} failed</span>}
                        </span>
                      </div>
                      <Progress
                        aria-label='Import progress'
                        size='sm'
                        radius='none'
                        value={rows.length ? (finishedCount / rows.length) * 100 : 100}
                        classNames={{ indicator: failedRows.length > 0 ? 'bg-warning' : 'bg-foreground' }}
                      />
                    </div>
                    <ul className='flex flex-col divide-y divide-divider border border-divider'>
                      {rows.map(row => (
                        <li key={row.id} className='flex items-start gap-3 px-3 py-2'>
                          <span className='mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center'>
                            <LiveIcon status={row.status} />
                          </span>
                          <span className='min-w-0 flex-1'>
                            <span className={cn('block truncate text-[14px]', row.status === 'waiting' ? 'text-default-500' : 'text-foreground')}>
                              {row.name}
                            </span>
                            <span className='block truncate font-mono text-[12px] text-default-500'>
                              {row.kind === 'font' ? 'Font' : row.key}
                            </span>
                            {row.error && <span className='block text-[12px] text-danger'>{row.error}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <>
                {/* Summary first, so the size of the import is clear before reading the details. */}
                <div className='grid grid-cols-2 gap-px border border-divider bg-divider sm:grid-cols-4'>
                  {(['new', 'changed', 'unchanged', 'skipped'] as const).map(k => (
                    <div key={k} className='flex flex-col gap-0.5 bg-content1 px-4 py-3'>
                      <span className='flex items-center gap-1.5 text-[12px] text-default-500'>
                        <span aria-hidden className={cn('h-1.5 w-1.5', STATUS[k].dot)} />
                        {STATUS[k].label}
                      </span>
                      <span className='font-mono text-[20px] font-semibold text-foreground'>{counts[k]}</span>
                    </div>
                  ))}
                </div>

                {templates.length === 0 ? (
                  <p className='border border-divider px-4 py-6 text-center text-[13px] text-default-500'>No templates in this file.</p>
                ) : (
                  <div className='flex flex-col border border-divider'>
                    {listed.length > 0 ? (
                      <ul className='divide-y divide-divider'>
                        {listed.map(t => (
                          <ImportRow key={t.key} item={t} />
                        ))}
                      </ul>
                    ) : (
                      <p className='px-4 py-4 text-[13px] text-default-500'>
                        Every template in this file is identical to the one in this project — nothing to import.
                      </p>
                    )}
                    {unchanged.length > 0 && (
                      <div className={cn(listed.length > 0 && 'border-t border-divider')}>
                        <button
                          type='button'
                          aria-expanded={showUnchanged}
                          onClick={() => setShowUnchanged(v => !v)}
                          className='flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-[13px] text-default-500 transition-colors hover:text-foreground'>
                          <span>
                            {unchanged.length} template{unchanged.length === 1 ? '' : 's'} without changes (same file, name and
                            test data)
                          </span>
                          <Icon icon={showUnchanged ? 'lucide:chevron-up' : 'lucide:chevron-down'} className='h-4 w-4' />
                        </button>
                        {showUnchanged && (
                          <ul className='divide-y divide-divider border-t border-divider'>
                            {unchanged.map(t => (
                              <ImportRow key={t.key} item={t} />
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!!plan?.fonts.length && (
                  <div className='flex flex-col gap-2'>
                    <h4 className='text-[13px] font-medium text-default-500'>Fonts</h4>
                    <ul className='flex flex-col gap-1.5'>
                      {plan.fonts.map(f => (
                        <li key={f.name} className='flex items-center justify-between gap-3 text-[14px]'>
                          <span className='text-foreground'>{f.name}</span>
                          <span className='flex items-center gap-2 text-[13px] text-default-500'>
                            {f.reason}
                            <ActionBadge action={f.action} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!!plan?.warnings.length && (
                  <div className='flex flex-col gap-1.5 border border-warning/40 p-3 text-[13px] text-default-500'>
                    <span className='flex items-center gap-2 font-medium text-warning'>
                      <Icon icon='lucide:triangle-alert' className='h-4 w-4' />
                      {plan.warnings.length} item(s) can't be imported
                    </span>
                    {plan.warnings.map(w => (
                      <span key={w}>{w}</span>
                    ))}
                  </div>
                )}
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                {phase === 'review' && (
                  <>
                    <Button variant='light' className='h-10 font-medium' onPress={onClose}>
                      Cancel
                    </Button>
                    <Button color='primary' className='h-10 font-medium' isDisabled={changes === 0} onPress={() => void handleApply()}>
                      {changes === 0 ? 'Nothing to import' : `Import ${changes} change${changes === 1 ? '' : 's'}`}
                    </Button>
                  </>
                )}
                {phase === 'importing' && (
                  <span className='flex items-center gap-2 text-[13px] text-default-500'>
                    <Spinner size='sm' color='default' /> Keep this window open until the import finishes.
                  </span>
                )}
                {phase === 'finished' && (
                  <>
                    <Button variant='light' className='h-10 font-medium' onPress={onClose}>
                      Close
                    </Button>
                    <Button
                      color='primary'
                      className='h-10 font-medium'
                      endContent={<Icon icon='lucide:arrow-right' className='h-4 w-4' />}
                      onPress={() => {
                        resetImport()
                        router.push(fontsImported ? `${templatesHref}?regenerate=1` : templatesHref)
                      }}>
                      Go to Templates
                    </Button>
                  </>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      {gateModal}
    </section>
  )
}

export default ProjectTransferPanel
