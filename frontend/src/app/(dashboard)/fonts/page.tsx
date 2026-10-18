'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Checkbox,
  addToast
} from '@heroui/react'
import Icon from '@/components/icon'
import { PageHeader, PanelHeader } from '@/components/ui/PageHeader'
import { cn } from '@/utils/cn'
import { api } from '@/api/generated/main-service'
import { handleApiError } from '@/hooks/useApiError'
import { FontSummaryDto } from '@/api/generated/main-service/apiGenerated'

const ACCEPTED_FORMATS = ['.ttf', '.otf', '.woff', '.woff2']
const ACCEPTED_MIME = ['font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/font-woff', 'application/x-font-ttf', 'application/x-font-otf']
// Seconds to wait after upload/delete for font-syncer + fc-cache + LibreOffice restart
const GOTENBERG_SYNC_DELAY_MS = 8000
const PREVIEW_TEXT = 'Aa Bb 123 — สวัสดี ภาษาไทย'

// Renderer readiness per font from GET /fonts/status (optional — older backends don't have it).
type FontSyncStatus = 'syncing' | 'ready' | 'error'
interface FontStatusItem {
  id: string
  status: FontSyncStatus
  message?: string | null
}

const SYNC_BADGE: Record<FontSyncStatus, { label: string; icon: string; tone: string }> = {
  ready: { label: 'Ready', icon: 'lucide:check-circle-2', tone: 'text-success' },
  syncing: { label: 'Syncing', icon: 'lucide:loader-circle', tone: 'text-default-500' },
  error: { label: 'Problem', icon: 'lucide:alert-circle', tone: 'text-danger' }
}

const SyncBadge = ({ status, message }: { status?: FontSyncStatus; message?: string | null }) => {
  if (!status) return <span className='text-[13px] text-default-400' title='Status not reported by this server'>—</span>
  const b = SYNC_BADGE[status]
  return (
    <span className='inline-flex items-center gap-1.5 text-[13px] text-default-500' title={message || undefined}>
      <Icon icon={b.icon} className={cn('h-3.5 w-3.5', b.tone, status === 'syncing' && 'animate-spin')} aria-hidden />
      {b.label}
    </span>
  )
}

/** Worst state wins: one broken weight makes the family "Problem". */
const familyStatus = (items: (FontSyncStatus | undefined)[]): FontSyncStatus | undefined => {
  const known = items.filter(Boolean) as FontSyncStatus[]
  if (known.length === 0) return undefined
  if (known.includes('error')) return 'error'
  if (known.includes('syncing')) return 'syncing'
  return 'ready'
}

const formatBytes = (bytes: number | string): string => {
  const n = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes
  if (!n) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

const isValidFontFile = (file: File): boolean => {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  return ACCEPTED_FORMATS.includes(ext) || ACCEPTED_MIME.includes(file.type)
}

interface ProgressState {
  current: number
  total: number
  phase: 'uploading' | 'deleting' | 'syncing'
}

function ProgressBar({ progress }: { progress: ProgressState }) {
  const isSyncing = progress.phase === 'syncing'
  const pct = isSyncing
    ? 100
    : Math.round((progress.current / progress.total) * 100)

  const label = isSyncing
    ? 'Applying changes…'
    : progress.phase === 'uploading'
      ? `Uploading ${progress.current} / ${progress.total}`
      : `Deleting ${progress.current} / ${progress.total}`

  return (
    <div className='space-y-1.5'>
      <div className='flex items-center justify-between text-[13px] text-default-500' aria-live='polite'>
        <span>{label}</span>
        {!isSyncing && <span className='font-mono tabular-nums'>{pct}%</span>}
      </div>
      <div className='h-1 w-full overflow-hidden bg-content3'>
        <div
          className={`h-full transition-all duration-300 ${
            progress.phase === 'deleting' ? 'bg-danger' : 'bg-foreground'
          } ${isSyncing ? 'animate-pulse' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function GlobalFonts() {
  const [fonts, setFonts] = useState<FontSummaryDto[]>([])
  const [syncStatus, setSyncStatus] = useState<Record<string, FontStatusItem>>({})
  const [openFamilies, setOpenFamilies] = useState<Set<string>>(new Set())
  const toggleFamily = (family: string) =>
    setOpenFamilies(prev => {
      const next = new Set(prev)
      if (next.has(family)) next.delete(family)
      else next.add(family)
      return next
    })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loadingFonts, setLoadingFonts] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Upload
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  // Progress
  const [progress, setProgress] = useState<ProgressState | null>(null)

  const fetchFonts = useCallback(async () => {
    setLoadingFonts(true)
    try {
      const data = await api.fonts.fontsList(debouncedSearch ? { search: debouncedSearch } : undefined)
      setFonts(data || [])
      api.instance
        .get<FontStatusItem[]>('/fonts/status')
        .then(res => setSyncStatus(Object.fromEntries((res.data || []).map(f => [f.id, f]))))
        .catch(() => setSyncStatus({}))
    } catch (err) {
      handleApiError(err, 'Failed to load fonts.')
    } finally {
      setLoadingFonts(false)
    }
  }, [debouncedSearch])

  useEffect(() => { fetchFonts() }, [fetchFonts])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setSelected(new Set())
    }, 400)
  }

  const handleAddFiles = (files: FileList | File[]) => {
    const arr = Array.from(files)
    const valid = arr.filter(f => {
      if (!isValidFontFile(f)) {
        addToast({ title: `${f.name} — unsupported format`, color: 'danger' })
        return false
      }
      return true
    })
    setUploadFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...valid.filter(f => !names.has(f.name))]
    })
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    handleAddFiles(e.dataTransfer.files)
  }

  const handleUpload = async () => {
    if (!uploadFiles.length) return
    let successCount = 0
    setProgress({ current: 0, total: uploadFiles.length, phase: 'uploading' })

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i]
      try {
        await api.fonts.fontsCreate({ file })
        successCount++
      } catch (error: unknown) {
        const resp = error as Record<string, unknown> | null
        const data = resp?.data as Record<string, unknown> | undefined
        const msg = (data?.detail as string) || (data?.title as string) || 'Upload failed'
        handleApiError(error, `${file.name} — ${msg}`)
      }
      setProgress({ current: i + 1, total: uploadFiles.length, phase: 'uploading' })
    }

    if (successCount > 0) {
      setProgress({ current: successCount, total: uploadFiles.length, phase: 'syncing' })
      await new Promise(r => setTimeout(r, GOTENBERG_SYNC_DELAY_MS))
      addToast({
        title: `${successCount} font${successCount > 1 ? 's' : ''} uploaded`,
        color: 'success'
      })
    }

    setProgress(null)
    setUploadFiles([])
    await fetchFonts()
  }

  const handleBulkDelete = async () => {
    if (!selected.size) return
    const ids = [...selected]
    let successCount = 0
    setProgress({ current: 0, total: ids.length, phase: 'deleting' })

    for (let i = 0; i < ids.length; i++) {
      try {
        await api.fonts.fontsDelete(ids[i])
        successCount++
      } catch (error: unknown) {
        const resp = error as Record<string, unknown> | null
        const data = resp?.data as Record<string, unknown> | undefined
        const msg = (data?.detail as string) || (data?.title as string) || 'Delete failed'
        handleApiError(error, `Delete failed — ${msg}`)
      }
      setProgress({ current: i + 1, total: ids.length, phase: 'deleting' })
    }

    if (successCount > 0) {
      setProgress({ current: successCount, total: ids.length, phase: 'syncing' })
      await new Promise(r => setTimeout(r, GOTENBERG_SYNC_DELAY_MS))
      addToast({ title: `${successCount} font${successCount > 1 ? 's' : ''} deleted`, color: 'success' })
    }

    setProgress(null)
    setSelected(new Set())
    setIsDeleteOpen(false)
    await fetchFonts()
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const uploadableFonts = fonts.filter(f => !f.isSystemFont)
  const allUploadableSelected = uploadableFonts.length > 0 && uploadableFonts.every(f => selected.has(f.id!))
  const toggleSelectAll = () => {
    if (allUploadableSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(uploadableFonts.map(f => f.id!).filter(Boolean)))
    }
  }

  const isBusy = progress !== null
  const showUploadProgress =
    progress !== null && (progress.phase === 'uploading' || (progress.phase === 'syncing' && uploadFiles.length > 0))
  const openFilePicker = () => {
    if (!isBusy) fileInputRef.current?.click()
  }

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        breadcrumb={[{ label: 'Workspace' }, { label: 'Fonts' }]}
        title='Fonts'
        description='Fonts your templates can use when they are turned into PDF. Shared by every project.'
        actions={
          <Button
            color={uploadFiles.length > 0 ? 'default' : 'primary'}
            variant={uploadFiles.length > 0 ? 'bordered' : 'solid'}
            className={cn('h-10 font-medium', uploadFiles.length > 0 && 'border-default-300')}
            startContent={<Icon icon='lucide:upload' className='h-4 w-4' />}
            onPress={openFilePicker}
            isDisabled={isBusy}>
            Upload fonts
          </Button>
        }
      />

      {/* Upload */}
      <section className='border border-divider bg-content1'>
        <PanelHeader
          title='Add fonts'
          description='Use the exact fonts from your Word or Excel files so the PDF looks the same.'
        />
        <div className='flex flex-col gap-4 p-5 sm:p-8'>
          <div
            role='button'
            tabIndex={isBusy ? -1 : 0}
            aria-label='Choose font files to upload'
            aria-disabled={isBusy}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openFilePicker()
              }
            }}
            onDragOver={e => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={openFilePicker}
            className={cn(
              'flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 border border-dashed px-6 py-10 text-center transition-colors',
              isDragging ? 'border-foreground bg-content3' : 'border-default-300 bg-content2 hover:border-foreground',
              isBusy && 'pointer-events-none opacity-60'
            )}>
            <input
              ref={fileInputRef}
              type='file'
              accept={ACCEPTED_FORMATS.join(',')}
              multiple
              className='hidden'
              onChange={e => {
                if (e.target.files) handleAddFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <Icon icon='lucide:upload' className='h-7 w-7 text-default-500' />
            <p className='text-[15px] font-semibold text-foreground'>
              Drop font files here
            </p>
            <p className='text-[14px] text-default-500'>or click to browse — you can pick several files at once</p>
            <p className='font-mono text-[12px] text-default-500'>
              .ttf · .otf · .woff · .woff2
            </p>
          </div>

          {uploadFiles.length > 0 && (
            <div>
              <p className='border-b border-divider pb-2 text-[14px] font-medium text-foreground'>
                Ready to upload <span className='font-mono text-default-500'>{uploadFiles.length}</span>
              </p>
              <ul className='max-h-64 divide-y divide-divider overflow-y-auto'>
                {uploadFiles.map((f, i) => (
                  <li key={f.name} className='flex min-h-11 items-center gap-3'>
                    <Icon icon='lucide:file-type' className='h-4 w-4 shrink-0 text-default-500' />
                    <span className='flex-1 truncate text-[14px] text-foreground'>{f.name}</span>
                    <span className='shrink-0 font-mono text-[12px] text-default-500'>{formatBytes(f.size)}</span>
                    {!isBusy && (
                      <button
                        type='button'
                        aria-label={`Remove ${f.name}`}
                        onClick={() => setUploadFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className='flex h-10 w-10 shrink-0 items-center justify-center text-default-500 hover:text-danger'>
                        <Icon icon='lucide:x' className='h-4 w-4' />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <div className='flex flex-col gap-3 border-t border-divider pt-4'>
                {showUploadProgress && progress && <ProgressBar progress={progress} />}
                <div className='flex justify-end gap-2'>
                  <Button
                    variant='light'
                    className='h-10 font-medium'
                    isDisabled={isBusy}
                    onPress={() => setUploadFiles([])}>
                    Clear
                  </Button>
                  <Button
                    color='primary'
                    className='h-10 font-medium'
                    isLoading={isBusy}
                    isDisabled={isBusy}
                    onPress={handleUpload}
                    startContent={!isBusy && <Icon icon='lucide:upload' className='h-4 w-4' />}>
                    {isBusy
                      ? progress?.phase === 'syncing'
                        ? 'Applying…'
                        : 'Uploading…'
                      : `Upload ${uploadFiles.length} file${uploadFiles.length > 1 ? 's' : ''}`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Font list */}
      <section className='border border-divider bg-content1'>
        <PanelHeader
          title='Installed fonts'
          description='Grouped by family — open a family to see its weights. System fonts come with the server; uploaded fonts can be deleted.'
        />

        {/* Toolbar */}
        <div className='flex flex-col gap-3 border-b border-divider px-5 py-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex min-h-10 items-center gap-3'>
            <Checkbox
              aria-label='Select all uploaded fonts'
              isSelected={allUploadableSelected}
              isIndeterminate={selected.size > 0 && !allUploadableSelected}
              onValueChange={toggleSelectAll}
              radius='none'
              color='default'
              isDisabled={uploadableFonts.length === 0 || isBusy}
            />
            <span className='text-[14px] text-default-500'>
              {selected.size > 0
                ? `${selected.size} selected`
                : `${new Set(fonts.map(f => f.familyName || f.name)).size} families · ${fonts.length} styles`}
            </span>
            {selected.size > 0 && (
              <Button
                color='danger'
                variant='bordered'
                className='h-10 font-medium'
                startContent={<Icon icon='lucide:trash-2' className='h-4 w-4' />}
                isDisabled={isBusy}
                onPress={() => setIsDeleteOpen(true)}>
                Delete ({selected.size})
              </Button>
            )}
          </div>
          <Input
            aria-label='Search fonts'
            placeholder='Search fonts'
            value={search}
            onValueChange={handleSearchChange}
            variant='bordered'
            className='w-full sm:max-w-xs'
            classNames={{ inputWrapper: 'h-10 min-h-10 border-transparent bg-content2 data-[hover=true]:border-default-300 group-data-[focus=true]:border-foreground', input: 'text-[14px]' }}
            startContent={<Icon icon='lucide:search' className='h-4 w-4 text-default-500' />}
            isClearable
            onClear={() => {
              setSearch('')
              setDebouncedSearch('')
              setSelected(new Set())
            }}
          />
        </div>

        {progress && progress.phase !== 'uploading' && !showUploadProgress && !isDeleteOpen && (
          <div className='border-b border-divider px-5 py-3'>
            <ProgressBar progress={progress} />
          </div>
        )}

        {loadingFonts ? (
          <div className='flex items-center justify-center py-16'>
            <Spinner color='default' label='Loading fonts' classNames={{ label: 'text-[13px] text-default-500' }} />
          </div>
        ) : fonts.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-2 px-6 py-16 text-center'>
            <Icon icon='lucide:type' className='h-8 w-8 text-default-400' />
            <p className='text-[15px] font-medium text-foreground'>
              {debouncedSearch ? 'No fonts match your search' : 'No fonts yet'}
            </p>
            <p className='text-[14px] text-default-500'>
              {debouncedSearch ? 'Try a different name.' : 'Drop font files in the area above.'}
            </p>
          </div>
        ) : (
          <div className='relative overflow-x-auto'>
            <p className='flex items-start gap-2 border-b border-divider px-5 py-2.5 text-[12px] text-default-500'>
              <Icon icon='lucide:info' className='mt-0.5 h-3.5 w-3.5 shrink-0' aria-hidden />
              Preview uses the font only if your device has it; otherwise a fallback is shown. Generated PDFs always use the
              server copy — check the Status column.
            </p>
            <table className='w-full min-w-[760px] text-left'>
              <thead>
                <tr className='border-b border-divider'>
                  <th scope='col' className='w-12 px-5 py-3'>
                    <span className='sr-only'>Select</span>
                  </th>
                  {['Font', 'Preview (approximate)', 'Weights', 'Source', 'Status'].map(h => (
                    <th key={h} scope='col' className='px-3 py-3 text-[13px] font-medium text-default-500'>
                      {h}
                    </th>
                  ))}
                  <th scope='col' className='w-14 px-3 py-3'>
                    <span className='sr-only'>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(
                  fonts.reduce<Record<string, FontSummaryDto[]>>((acc, f) => {
                    const key = f.familyName || f.name || 'Unknown'
                    ;(acc[key] ||= []).push(f)
                    return acc
                  }, {})
                ).map(([family, members]) => {
                  const sorted = [...members].sort((a, b) => (Number(a.weight) || 400) - (Number(b.weight) || 400))
                  const open = openFamilies.has(family)
                  const isSystem = sorted.every(f => f.isSystemFont === true)
                  const regular = sorted.find(f => Number(f.weight) === 400 && !f.isItalic) || sorted[0]
                  const fStatus = familyStatus(sorted.map(f => syncStatus[f.id!]?.status))
                  return (
                    <React.Fragment key={family}>
                      <tr className='border-b border-divider hover:bg-content2'>
                        <td className='px-5 py-3' />
                        <td className='max-w-[240px] px-3 py-3'>
                          <button
                            type='button'
                            aria-expanded={open}
                            onClick={() => toggleFamily(family)}
                            className='flex min-w-0 items-center gap-2 text-left'>
                            <Icon
                              icon='lucide:chevron-right'
                              className={cn('h-4 w-4 shrink-0 text-default-500 transition-transform', open && 'rotate-90')}
                            />
                            <span className='truncate text-[14px] font-semibold text-foreground'>{family}</span>
                          </button>
                        </td>
                        <td className='max-w-[320px] px-3 py-3'>
                          <span
                            className='block truncate text-[18px] leading-snug text-foreground'
                            style={{ fontFamily: `'${family}', 'Anuphan', sans-serif`, fontWeight: Number(regular.weight) || 400 }}>
                            {PREVIEW_TEXT}
                          </span>
                        </td>
                        <td className='whitespace-nowrap px-3 py-3 text-[13px] text-default-500'>
                          {sorted.length} {sorted.length === 1 ? 'style' : 'styles'}
                        </td>
                        <td className='px-3 py-3 text-[13px] text-default-500'>{isSystem ? 'System' : 'Uploaded'}</td>
                        <td className='px-3 py-3'>
                          <SyncBadge status={fStatus} />
                        </td>
                        <td className='px-3 py-3' />
                      </tr>
                      {open &&
                        sorted.map(font => {
                          const fontIsSystem = font.isSystemFont === true
                          const isChecked = selected.has(font.id!)
                          const st = syncStatus[font.id!]
                          return (
                            <tr
                              key={font.id}
                              className={cn(
                                'border-b border-divider bg-content1 last:border-0',
                                isChecked ? 'bg-content2' : 'hover:bg-content2'
                              )}>
                              <td className='px-5 py-2.5'>
                                {!fontIsSystem && (
                                  <Checkbox
                                    aria-label={`Select ${font.name}`}
                                    isSelected={isChecked}
                                    onValueChange={() => toggleSelect(font.id!)}
                                    isDisabled={isBusy}
                                    radius='none'
                                    color='default'
                                  />
                                )}
                              </td>
                              <td className='max-w-[240px] py-2.5 pl-9 pr-3'>
                                <span className='block truncate text-[13px] text-foreground'>{font.name}</span>
                                <span className='block truncate font-mono text-[11px] text-default-500'>
                                  {font.fileFormat} · {formatBytes(font.fileSizeBytes ?? 0)}
                                </span>
                              </td>
                              <td className='max-w-[320px] px-3 py-2.5'>
                                <span
                                  className='block truncate text-[16px] leading-snug text-foreground'
                                  style={{
                                    fontFamily: `'${font.familyName}', 'Anuphan', sans-serif`,
                                    fontWeight: Number(font.weight) || 400,
                                    fontStyle: font.isItalic ? 'italic' : 'normal'
                                  }}>
                                  {PREVIEW_TEXT}
                                </span>
                              </td>
                              <td className='whitespace-nowrap px-3 py-2.5 text-[13px] text-default-500'>
                                {font.weight}
                                {font.isItalic ? ' · Italic' : ''}
                              </td>
                              <td className='px-3 py-2.5 text-[13px] text-default-500'>{fontIsSystem ? 'System' : 'Uploaded'}</td>
                              <td className='px-3 py-2.5'>
                                <SyncBadge status={st?.status} message={st?.message} />
                              </td>
                              <td className='px-3 py-2.5 text-right'>
                                {!fontIsSystem && (
                                  <Button
                                    isIconOnly
                                    variant='light'
                                    aria-label={`Delete ${font.name}`}
                                    className='h-9 w-9 min-w-9 text-default-500 hover:text-danger'
                                    isDisabled={isBusy}
                                    onPress={() => {
                                      setSelected(new Set([font.id!]))
                                      setIsDeleteOpen(true)
                                    }}>
                                    <Icon icon='lucide:trash-2' className='h-4 w-4' />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={isDeleteOpen}
        classNames={{ base: 'border border-divider bg-content1' }}
        onOpenChange={open => {
          if (!isBusy && !open) {
            setIsDeleteOpen(false)
            setSelected(new Set())
          }
        }}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className='text-[16px] font-semibold'>
                Delete font{selected.size > 1 ? 's' : ''}?
              </ModalHeader>
              <ModalBody className='space-y-4'>
                <div className='flex items-start gap-3 border border-danger/40 p-3 text-[14px]'>
                  <Icon icon='lucide:alert-circle' className='mt-0.5 h-5 w-5 shrink-0 text-danger' />
                  <p className='text-default-500'>
                    Permanently delete{' '}
                    {selected.size === 1 ? (
                      <span className='font-semibold text-foreground'>{fonts.find(f => f.id === [...selected][0])?.name}</span>
                    ) : (
                      <span className='font-semibold text-foreground'>{selected.size} fonts</span>
                    )}
                    ? Templates that use {selected.size > 1 ? 'them' : 'it'} will fall back to another font. This cannot be
                    undone.
                  </p>
                </div>
                {progress && (progress.phase === 'deleting' || progress.phase === 'syncing') && (
                  <ProgressBar progress={progress} />
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant='light' className='h-10 font-medium' onPress={onClose} isDisabled={isBusy}>
                  Cancel
                </Button>
                <Button
                  color='danger'
                  variant='bordered'
                  className='h-10 font-medium'
                  onPress={handleBulkDelete}
                  isLoading={isBusy}
                  isDisabled={isBusy}>
                  {isBusy ? (progress?.phase === 'syncing' ? 'Applying…' : 'Deleting…') : 'Delete'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
