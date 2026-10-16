'use client'

import React, { useRef, useState } from 'react'
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, addToast, cn } from '@heroui/react'
import Icon from '@/components/icon'
import { PanelHeader } from '@/components/ui/PageHeader'
import { api } from '@/api/generated/main-service'
import { useUpgradeGate } from '@/hooks/use-upgrade-gate'
import type { ImportTemplateItem, ProjectImportResult } from '@/api/generated/main-service/apiGenerated'

type ImportAction = ImportTemplateItem['action']

const ACTION_LABEL: Record<ImportAction, string> = { create: 'Create', update: 'Update', skip: 'Skip' }

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

/** Project settings → Export & import (Pro): move a whole project between deployments as one ZIP. */
export const ProjectTransferPanel = ({ projectId, projectName }: { projectId: string; projectName: string }): React.JSX.Element => {
  const { requireFeature, gateModal } = useUpgradeGate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [planning, setPlanning] = useState(false)
  const [applying, setApplying] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [plan, setPlan] = useState<ProjectImportResult | null>(null)

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
      <PanelHeader
        title='Export & import'
        description='Move this project to another Qorstack deployment, e.g. from staging to production.'
        actions={<span className='border border-default-300 px-1.5 py-0.5 font-mono text-[11px] text-default-500'>PRO</span>}
      />
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
            New templates are added with the same key, newer versions replace older ones, and anything already up to date is
            skipped. You see the changes before anything is saved.
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
                <div className='overflow-x-auto border border-divider'>
                  <table className='w-full text-[14px]'>
                    <thead>
                      <tr className='border-b border-divider text-left text-[12px] text-default-500'>
                        <th className='px-3 py-2 font-medium'>Template</th>
                        <th className='px-3 py-2 font-medium'>Action</th>
                        <th className='px-3 py-2 font-medium'>Version</th>
                        <th className='px-3 py-2 font-medium'>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan?.templates.map(t => (
                        <tr key={t.key} className='border-b border-divider last:border-b-0'>
                          <td className='px-3 py-2.5'>
                            <div className='font-medium text-foreground'>{t.name}</div>
                            <div className='font-mono text-[12px] text-default-500'>{t.key}</div>
                          </td>
                          <td className='px-3 py-2.5'>
                            <ActionBadge action={t.action} />
                          </td>
                          <td className='whitespace-nowrap px-3 py-2.5 font-mono text-[13px] text-default-500'>
                            {t.fromVersion != null ? `v${t.fromVersion} → ` : ''}v{t.toVersion}
                          </td>
                          <td className='px-3 py-2.5 text-[13px] text-default-500'>{t.reason}</td>
                        </tr>
                      ))}
                      {plan?.templates.length === 0 && (
                        <tr>
                          <td colSpan={4} className='px-3 py-4 text-center text-[13px] text-default-500'>
                            No templates in this file.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

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
