'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  cn
} from '@heroui/react'
import Icon from '@/components/icon'
import type { TemplateVersionResponse } from '@/api/generated/main-service/apiGenerated'
import { KeyBadge } from '@/components/ui/KeyBadge'
import { EditTemplateDetailsPopover } from './EditTemplateDetailsPopover'

export type TemplateType = 'pdf' | 'excel'

type EditState = {
  isOpen: boolean
  name: string
  templateKey: string
  isGeneratingKey: boolean
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onNameChange: (v: string) => void
  onKeyChange: (v: string) => void
  onGenerateKey: () => void
  onSave: () => void
}

type Props = {
  templateType: TemplateType
  templateName: string
  templateKey: string
  activeVersion: number | null
  versions: TemplateVersionResponse[]
  isDownloadingSource: boolean
  edit: EditState
  onDelete: () => void
  onDownloadSource: () => void
  onVersionChange: (v: number) => void
  onUpdateFile: () => void
  /** Where the "Templates" breadcrumb goes. Defaults to `/project`. */
  templatesHref?: string
  /** Version currently shown in the preview / used by Generate (null = the current version). */
  previewVersion?: number | null
  /** Show another version in the editor without making it current. */
  onPreviewVersion?: (version: number | null) => void
}

const fileNameOf = (path?: string | null) => (path ? path.split('/').pop() || path : '')

const formatDate = (value: unknown) => {
  if (!value) return ''
  const d = new Date(String(value))
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Type badges stay neutral; the type colour is carried only by a 6px dot. */
const TYPE_BADGE: Record<TemplateType, { dotClassName: string; label: string; file: string }> = {
  pdf: { dotClassName: 'bg-primary', label: 'Word → PDF', file: '.docx' },
  excel: { dotClassName: 'bg-success', label: 'Excel', file: '.xlsx' }
}

/**
 * Injects the template builder's header into the global app header via two portal slots:
 * `#global-header-left` (breadcrumb, name, type, key) and `#global-header-actions`
 * (version selector + "More" menu). The primary action — Generate — lives in the preview panel.
 */
export const TemplateHeaderPortals: React.FC<Props> = ({
  templateType,
  templateName,
  templateKey,
  activeVersion,
  versions,
  isDownloadingSource,
  edit,
  onDelete,
  onDownloadSource,
  onVersionChange,
  onUpdateFile,
  templatesHref = '/project',
  previewVersion = null,
  onPreviewVersion
}) => {
  const [historyOpen, setHistoryOpen] = useState(false)
  /** Version waiting for "Make current" confirmation. */
  const [confirmVersion, setConfirmVersion] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [leftEl, setLeftEl] = useState<Element | null>(null)
  const [actionsEl, setActionsEl] = useState<Element | null>(null)

  useEffect(() => {
    setLeftEl(document.getElementById('global-header-left'))
    setActionsEl(document.getElementById('global-header-actions'))
  }, [])

  const badge = TYPE_BADGE[templateType]
  const versionList: TemplateVersionResponse[] =
    versions.length > 0 ? versions : activeVersion != null ? [{ version: activeVersion } as TemplateVersionResponse] : []
  const sortedVersions = [...versionList].sort((a, b) => Number(b.version) - Number(a.version))
  const shownVersion = previewVersion ?? activeVersion
  const viewingOther = previewVersion != null && previewVersion !== activeVersion

  const handleMenuAction = (key: React.Key) => {
    const k = String(key)
    if (k === 'rename') edit.onOpenChange(true)
    if (k === 'download') onDownloadSource()
    if (k === 'replace') onUpdateFile()
    if (k === 'delete') onDelete()
  }

  return (
    <>
      {leftEl &&
        createPortal(
          <div className='flex min-w-0 flex-col gap-0.5 lg:ml-1'>
            <nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-[12px] text-default-500'>
              <Link
                href={templatesHref}
                className='transition-colors hover:text-foreground hover:underline hover:underline-offset-4'>
                Templates
              </Link>
              <Icon icon='lucide:chevron-right' className='h-3 w-3 text-default-400' aria-hidden />
              <span className='truncate text-default-500' aria-current='page'>
                {templateName || 'Untitled'}
              </span>
            </nav>
            <div className='flex min-w-0 items-center gap-2.5'>
              <h1 className='truncate text-[17px] font-semibold leading-tight text-foreground lg:text-[19px]'>
                {templateName || 'Untitled'}
              </h1>
              <span className='hidden h-6 shrink-0 items-center gap-1.5 bg-content3 px-2 font-mono text-[11px] text-default-600 xl:inline-flex'>
                <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', badge.dotClassName)} />
                {badge.label}
              </span>
              {templateKey && <KeyBadge value={templateKey} label='Key' className='hidden xl:flex' />}
            </div>
          </div>,
          leftEl
        )}

      {actionsEl &&
        createPortal(
          <div className='flex shrink-0 items-center gap-2'>
            {versionList.length > 0 && (
              <Button
                variant='bordered'
                size='sm'
                radius='none'
                onPress={() => setHistoryOpen(true)}
                title='Version history'
                className={cn(
                  'h-9 border-1 px-3 text-[13px] font-medium text-foreground hover:border-foreground',
                  viewingOther ? 'border-foreground' : 'border-default-300'
                )}
                startContent={<Icon icon='lucide:history' className='h-4 w-4' aria-hidden />}>
                <span className='whitespace-nowrap'>
                  <span className='hidden xl:inline'>Version </span>
                  <span className='xl:hidden'>v</span>
                  {shownVersion ?? '–'}
                  {viewingOther ? <span className='hidden xl:inline'> (viewing)</span> : ''}
                </span>
              </Button>
            )}

            {/* Used often → always one click away. */}
            <Button
              variant='bordered'
              size='sm'
              radius='none'
              aria-label='Replace file'
              title={`Upload a new ${badge.file} file (keeps the old one as a version)`}
              onPress={onUpdateFile}
              className='h-9 min-w-0 border-1 border-default-300 px-3 text-[13px] font-medium text-foreground hover:border-foreground'
              startContent={<Icon icon='lucide:upload' className='h-4 w-4 shrink-0' aria-hidden />}>
              <span className='hidden xl:inline'>Replace file</span>
            </Button>

            {/* Used now and then → one menu. */}
            <Dropdown placement='bottom-end' radius='none'>
              <DropdownTrigger>
                <Button
                  variant='bordered'
                  size='sm'
                  radius='none'
                  isIconOnly
                  aria-label='More template actions'
                  title='Rename, download the original file, delete'
                  isLoading={isDownloadingSource}
                  className='h-9 w-9 min-w-9 border-1 border-default-300 text-foreground hover:border-foreground'>
                  <Icon icon='lucide:more-horizontal' className='h-4 w-4' aria-hidden />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label='Template actions' onAction={handleMenuAction} className='min-w-[240px]'>
                <DropdownSection aria-label='Template' showDivider>
                  <DropdownItem
                    key='rename'
                    description='Name and template key'
                    startContent={<Icon icon='lucide:pencil' className='h-4 w-4' />}>
                    Rename
                  </DropdownItem>
                  <DropdownItem
                    key='download'
                    description={`The ${badge.file} file you uploaded`}
                    startContent={<Icon icon='lucide:download' className='h-4 w-4' />}>
                    {`Download original ${badge.file}`}
                  </DropdownItem>
                </DropdownSection>
                <DropdownSection aria-label='Danger zone'>
                  <DropdownItem
                    key='delete'
                    color='danger'
                    className='text-danger'
                    startContent={<Icon icon='lucide:trash-2' className='h-4 w-4' />}>
                    Delete template
                  </DropdownItem>
                </DropdownSection>
              </DropdownMenu>
            </Dropdown>

            <EditTemplateDetailsPopover
              isOpen={edit.isOpen}
              onOpenChange={edit.onOpenChange}
              name={edit.name}
              templateKey={edit.templateKey}
              onNameChange={edit.onNameChange}
              onKeyChange={edit.onKeyChange}
              onGenerateKey={edit.onGenerateKey}
              onSave={edit.onSave}
              isGeneratingKey={edit.isGeneratingKey}
              isSaving={edit.isSaving}
            />

            <Modal isOpen={historyOpen} onOpenChange={setHistoryOpen} size='2xl' radius='none' scrollBehavior='inside'>
              <ModalContent className='border border-divider bg-content1'>
                {close => (
                  <>
                    <ModalHeader className='flex flex-col gap-1 border-b border-divider'>
                      <span className='text-[16px] font-semibold text-foreground'>Version history</span>
                      <span className='text-[13px] font-normal text-default-500'>
                        A new version is kept every time you replace the {badge.file} file.
                      </span>
                    </ModalHeader>
                    <ModalBody className='gap-4 py-4'>
                      <ul className='flex flex-col gap-1.5 text-[13px] text-default-500'>
                        <li>
                          <b className='font-medium text-foreground'>View</b> shows that version in the preview without
                          changing anything. Generate then renders that version.
                        </li>
                        <li>
                          <b className='font-medium text-foreground'>Make current</b> switches the template: the builder and
                          every API call without <code className='font-mono text-foreground'>templateVersion</code> use it.
                        </li>
                        <li>
                          API: send <code className='font-mono text-foreground'>{'"templateVersion": N'}</code> to render a
                          specific version.
                        </li>
                      </ul>
                      <div className='flex flex-col border-t border-divider'>
                        {sortedVersions.map(v => {
                          const num = Number(v.version)
                          const isCurrent = num === activeVersion
                          const isViewing = num === shownVersion
                          const date = formatDate(v.updatedDatetime ?? v.createdDatetime)
                          const file = fileNameOf(v.filePath)
                          return (
                            <div
                              key={String(v.version)}
                              className={cn(
                                'flex flex-wrap items-center gap-3 border-b border-divider py-3',
                                isViewing && 'bg-content2 px-2'
                              )}>
                              <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                                <div className='flex items-center gap-2'>
                                  <span className='text-[14px] font-semibold text-foreground'>Version {num}</span>
                                  {isCurrent && (
                                    <span className='border border-default-300 px-1.5 py-0.5 text-[11px] text-default-500'>
                                      Current
                                    </span>
                                  )}
                                  {isViewing && !isCurrent && (
                                    <span className='border border-default-300 px-1.5 py-0.5 text-[11px] text-default-500'>
                                      Viewing
                                    </span>
                                  )}
                                </div>
                                <span className='truncate text-[12px] text-default-500'>
                                  {[date, file].filter(Boolean).join(' · ') || 'No details'}
                                </span>
                              </div>
                              <div className='flex shrink-0 items-center gap-2'>
                                {onPreviewVersion && !isViewing && (
                                  <Button
                                    size='sm'
                                    radius='none'
                                    variant='bordered'
                                    className='h-8 border-1 border-default-300 text-[13px] text-foreground hover:border-foreground'
                                    onPress={() => {
                                      onPreviewVersion(isCurrent ? null : num)
                                      close()
                                    }}>
                                    View
                                  </Button>
                                )}
                                {!isCurrent && (
                                  <Button
                                    size='sm'
                                    radius='none'
                                    variant='bordered'
                                    className='h-8 border-1 border-default-300 text-[13px] text-foreground hover:border-foreground'
                                    onPress={() => {
                                      setConfirmVersion(num)
                                      setConfirmOpen(true)
                                      close()
                                    }}>
                                    Make current
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </ModalBody>
                  </>
                )}
              </ModalContent>
            </Modal>

            <Modal
              isOpen={confirmOpen}
              onOpenChange={setConfirmOpen}
              size='md'
              radius='none'>
              <ModalContent className='border border-divider bg-content1'>
                {close => (
                  <>
                    <ModalHeader className='text-[16px] font-semibold text-foreground'>
                      Make version {confirmVersion} current?
                    </ModalHeader>
                    <ModalBody className='gap-2'>
                      <p className='text-[14px] text-default-500'>
                        API calls without <code className='font-mono text-foreground'>templateVersion</code> will use
                        version {confirmVersion} from now on. The builder switches to it too.
                      </p>
                    </ModalBody>
                    <ModalFooter>
                      <Button variant='light' radius='none' onPress={close}>
                        Cancel
                      </Button>
                      <Button
                        color='primary'
                        radius='none'
                        onPress={() => {
                          if (confirmVersion != null) {
                            onVersionChange(confirmVersion)
                            onPreviewVersion?.(null)
                          }
                          close()
                        }}>
                        Make version {confirmVersion} current
                      </Button>
                    </ModalFooter>
                  </>
                )}
              </ModalContent>
            </Modal>
          </div>,
          actionsEl
        )}
    </>
  )
}
