'use client'

import React, { useRef, useState } from 'react'
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Progress, Spinner, cn } from '@heroui/react'
import Icon from '@/components/icon'
import { listAllProjectTemplates, regenerateTemplatePreview } from '@/api/template-preview'

type RowStatus = 'waiting' | 'running' | 'done' | 'failed'

interface Row {
  key: string
  name: string
  status: RowStatus
  error?: string
}

type Phase = 'confirm' | 'loading' | 'running' | 'finished'

const errorText = (error: unknown): string => {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (data && typeof data === 'object') {
    const d = data as { detail?: string; title?: string }
    return d.detail || d.title || 'Failed'
  }
  return typeof data === 'string' && data ? data : 'Failed'
}

const StatusIcon = ({ status }: { status: RowStatus }): React.JSX.Element => {
  if (status === 'running') return <Spinner size='sm' color='default' aria-label='Rendering' />
  if (status === 'done') return <Icon icon='lucide:check' className='h-4 w-4 text-success' aria-label='Done' />
  if (status === 'failed') return <Icon icon='lucide:x' className='h-4 w-4 text-danger' aria-label='Failed' />
  return <span aria-label='Waiting' className='mx-1.5 h-1.5 w-1.5 bg-default-400' />
}

/**
 * Re-renders the preview of every template in a project, one at a time, with live progress.
 * Use after uploading or importing fonts: previews made before the renderer had a font show a substitute.
 */
export const RegeneratePreviewsModal = ({
  projectId,
  isOpen,
  onOpenChange,
  onFinished
}: {
  projectId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Called after the run so the list can reload its thumbnails. */
  onFinished?: () => void
}): React.JSX.Element => {
  const [phase, setPhase] = useState<Phase>('confirm')
  const [rows, setRows] = useState<Row[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const cancelled = useRef(false)

  const update = (index: number, patch: Partial<Row>): void =>
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))

  const run = async (): Promise<void> => {
    cancelled.current = false
    setPhase('loading')
    let list: Row[]
    try {
      const templates = await listAllProjectTemplates(projectId)
      list = templates
        .filter(t => t.activeVersion)
        .map(t => ({ key: t.templateKey, name: t.name || t.templateKey, status: 'waiting' as RowStatus }))
    } catch (error) {
      setLoadError(errorText(error))
      setPhase('finished')
      return
    }
    setRows(list)
    setPhase('running')

    for (let i = 0; i < list.length; i++) {
      if (cancelled.current) break
      update(i, { status: 'running' })
      try {
        await regenerateTemplatePreview(list[i].key)
        update(i, { status: 'done' })
      } catch (error) {
        update(i, { status: 'failed', error: errorText(error) })
      }
    }
    setPhase('finished')
    onFinished?.()
  }

  const done = rows.filter(r => r.status === 'done').length
  const failed = rows.filter(r => r.status === 'failed').length
  const finishedCount = done + failed
  const busy = phase === 'loading' || phase === 'running'

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) {
          // Stop after the current template; the next open starts fresh.
          if (busy) cancelled.current = true
          setPhase('confirm')
          setRows([])
          setLoadError(null)
        }
        onOpenChange(open)
      }}
      isDismissable={!busy}
      size='2xl'
      scrollBehavior='inside'
      classNames={{ base: 'border border-divider bg-content1' }}>
      <ModalContent>
        {onClose => (
          <>
            <ModalHeader className='flex flex-col gap-1'>
              <span className='text-[16px] font-semibold'>Regenerate previews</span>
              <span className='text-[13px] font-normal text-default-500'>
                Re-renders the preview of every template in this project with the fonts installed now.
              </span>
            </ModalHeader>
            <ModalBody className='gap-4'>
              {phase === 'confirm' && (
                <p className='text-[14px] text-default-600'>
                  Use this after uploading or importing fonts. Just-added fonts reach the renderer within about a minute — if a
                  preview still looks wrong, run it again a little later. Templates and their test data are not changed.
                </p>
              )}

              {phase === 'loading' && (
                <div className='flex items-center gap-2 text-[14px] text-default-500'>
                  <Spinner size='sm' color='default' /> Loading templates…
                </div>
              )}

              {(phase === 'running' || phase === 'finished') && rows.length > 0 && (
                <>
                  <div className='flex flex-col gap-2'>
                    <div className='flex items-center justify-between text-[13px] text-default-500'>
                      <span>
                        {phase === 'running' ? 'Rendering' : 'Finished'} · {finishedCount} / {rows.length}
                      </span>
                      <span>
                        <span className='text-success'>{done} done</span>
                        {failed > 0 && <span className='text-danger'> · {failed} failed</span>}
                      </span>
                    </div>
                    <Progress
                      aria-label='Preview progress'
                      size='sm'
                      radius='none'
                      value={rows.length ? (finishedCount / rows.length) * 100 : 0}
                      classNames={{ indicator: failed > 0 ? 'bg-warning' : 'bg-foreground' }}
                    />
                  </div>
                  <ul className='flex flex-col divide-y divide-divider border border-divider'>
                    {rows.map(r => (
                      <li key={r.key} className='flex items-start gap-3 px-3 py-2'>
                        <span className='mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center'>
                          <StatusIcon status={r.status} />
                        </span>
                        <span className='min-w-0 flex-1'>
                          <span className={cn('block truncate text-[14px]', r.status === 'waiting' ? 'text-default-500' : 'text-foreground')}>
                            {r.name}
                          </span>
                          {r.error && <span className='block text-[12px] text-danger'>{r.error}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {phase === 'finished' && rows.length === 0 && !loadError && (
                <p className='text-[14px] text-default-500'>This project has no templates with a file yet.</p>
              )}
              {loadError && <p className='text-[14px] text-danger'>Could not load the templates: {loadError}</p>}
            </ModalBody>
            <ModalFooter>
              {phase === 'confirm' ? (
                <>
                  <Button variant='light' className='h-10 font-medium' onPress={onClose}>
                    Cancel
                  </Button>
                  <Button
                    color='primary'
                    className='h-10 font-medium'
                    startContent={<Icon icon='lucide:refresh-cw' className='h-4 w-4' />}
                    onPress={() => void run()}>
                    Regenerate all previews
                  </Button>
                </>
              ) : (
                <Button variant={busy ? 'light' : 'solid'} color={busy ? 'default' : 'primary'} className='h-10 font-medium' onPress={onClose}>
                  {busy ? 'Stop' : 'Close'}
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}

export default RegeneratePreviewsModal
