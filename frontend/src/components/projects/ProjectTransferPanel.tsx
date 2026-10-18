'use client'

import React, { useRef, useState } from 'react'
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, addToast, cn } from '@heroui/react'
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

  const handleApply = async (): Promise<void> => {
    if (!file) return
    setApplying(true)
    try {
      const result = await send(file, false)
      const created = result.templates.filter(t => t.action === 'create').length
      const updated = result.templates.filter(t => t.action === 'update').length
      addToast({
        title: 'Import finished',
        description: `${created} created, ${updated} updated, ${result.fonts.filter(f => f.action === 'create').length} font(s) added.`,
        color: 'success'
      })
      setPlan(null)
      setFile(null)
      window.location.reload()
    } catch (error: any) {
      addToast({ title: 'Import failed — nothing was changed', description: errorMessage(error), color: 'danger' })
    } finally {
      setApplying(false)
    }
  }

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
        onOpenChange={open => {
          if (!open && !applying) {
            setPlan(null)
            setFile(null)
            setShowUnchanged(false)
          }
        }}
        size='3xl'
        scrollBehavior='inside'
        classNames={{ base: 'border border-divider bg-content1' }}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className='flex flex-col gap-1'>
                <span className='text-[16px] font-semibold'>Review import</span>
                <span className='text-[13px] font-normal text-default-500'>
                  From {plan?.sourceProject || 'an export'}
                  {plan?.exportedAt ? ` · exported ${new Date(plan.exportedAt).toLocaleString()}` : ''} · {file?.name}
                </span>
              </ModalHeader>
              <ModalBody className='gap-5'>
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
              </ModalBody>
              <ModalFooter>
                <Button variant='light' className='h-10 font-medium' onPress={onClose} isDisabled={applying}>
                  Cancel
                </Button>
                <Button color='primary' className='h-10 font-medium' isDisabled={changes === 0} isLoading={applying} onPress={handleApply}>
                  {changes === 0 ? 'Nothing to import' : `Import ${changes} change${changes === 1 ? '' : 's'}`}
                </Button>
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
