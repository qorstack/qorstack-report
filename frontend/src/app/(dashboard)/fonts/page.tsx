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
import { api } from '@/api/generated/main-service'
import { handleApiError } from '@/hooks/useApiError'
import { FontSummaryDto } from '@/api/generated/main-service/apiGenerated'

const ACCEPTED_FORMATS = ['.ttf', '.otf', '.woff', '.woff2']
const ACCEPTED_MIME = ['font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/font-woff', 'application/x-font-ttf', 'application/x-font-otf']
// Seconds to wait after upload/delete for font-syncer + fc-cache + LibreOffice restart
const GOTENBERG_SYNC_DELAY_MS = 8000

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
      <div className='flex items-center justify-between text-xs text-default-500'>
        <span>{label}</span>
        {!isSyncing && <span>{pct}%</span>}
      </div>
      <div className='h-1.5 w-full overflow-hidden rounded-full bg-default-200'>
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress.phase === 'deleting' ? 'bg-danger' : 'bg-primary'
          } ${isSyncing ? 'animate-pulse' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function GlobalFonts() {
  const [fonts, setFonts] = useState<FontSummaryDto[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loadingFonts, setLoadingFonts] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Upload
  const [isUploadOpen, setIsUploadOpen] = useState(false)
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
    setIsUploadOpen(false)
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

  return (
    <div className='dashboard-panel flex flex-col'>
      {/* Header */}
      <div className='dashboard-header'>
        <div>
          <h1 className='dashboard-title'>Fonts</h1>
          <p className='dashboard-subtitle'>Global fonts available to all projects and PDF templates.</p>
        </div>
        <Button
          color='primary'
          size='sm'
          radius='md'
          startContent={<Icon icon='lucide:upload' className='h-3.5 w-3.5' />}
          onPress={() => setIsUploadOpen(true)}
          isDisabled={isBusy}
          className='h-9 rounded-lg px-4 text-[12px] font-bold'>
          Upload Font
        </Button>
      </div>

      {/* Toolbar */}
      <div className='dashboard-toolbar justify-between'>
        <div className='flex items-center gap-2'>
          <Checkbox
            isSelected={allUploadableSelected}
            isIndeterminate={selected.size > 0 && !allUploadableSelected}
            onValueChange={toggleSelectAll}
            size='sm'
            isDisabled={uploadableFonts.length === 0 || isBusy}
          />
          {selected.size > 0 ? (
            <span className='text-xs font-medium text-default-600'>
              {selected.size} selected
            </span>
          ) : (
            <span className='text-xs text-default-400'>{fonts.length} fonts</span>
          )}
          {selected.size > 0 && (
            <Button
              size='sm'
              color='danger'
              variant='flat'
              className='h-7 rounded-md px-3 text-xs'
              startContent={<Icon icon='lucide:trash-2' className='h-3.5 w-3.5' />}
              isDisabled={isBusy}
              onPress={() => setIsDeleteOpen(true)}>
              Delete ({selected.size})
            </Button>
          )}
        </div>
        <Input
          placeholder='Search fonts...'
          value={search}
          onValueChange={handleSearchChange}
          size='sm'
          variant='bordered'
          className='max-w-[220px]'
          startContent={<Icon icon='lucide:search' className='h-4 w-4 text-default-400' />}
          isClearable
          onClear={() => { setSearch(''); setDebouncedSearch(''); setSelected(new Set()) }}
        />
      </div>

      {/* Font List */}
      <div>
        {loadingFonts ? (
          <div className='flex items-center justify-center py-16'>
            <Spinner size='md' color='primary' />
          </div>
        ) : fonts.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-3 py-16 text-center'>
            <div className='mb-2 rounded-lg bg-content3 p-4'>
              <Icon icon='lucide:type' className='h-8 w-8 text-default-400' />
            </div>
            <p className='text-base font-medium text-foreground'>
              {debouncedSearch ? 'No fonts match your search' : 'No fonts yet'}
            </p>
            <p className='text-sm text-default-400'>
              {debouncedSearch ? 'Try a different search term.' : 'Upload your first font using the button above.'}
            </p>
          </div>
        ) : (
          <div className='divide-y divide-default-100'>
            {fonts.map(font => {
              const isSystem = font.isSystemFont === true
              const isChecked = selected.has(font.id!)
              return (
                <div
                  key={font.id}
                  className={`flex items-center gap-4 px-5 py-3 transition-colors ${isChecked ? 'bg-primary/10' : 'hover:bg-content2'}`}>
                  <Checkbox
                    isSelected={isChecked}
                    onValueChange={() => toggleSelect(font.id!)}
                    isDisabled={isSystem || isBusy}
                    size='sm'
                    className={isSystem ? 'invisible' : ''}
                  />

                  <div className='dashboard-icon-box'>
                    <Icon icon='lucide:type' className='h-4 w-4 text-default-500' />
                  </div>

                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <span className='truncate text-sm font-semibold text-foreground'>{font.name}</span>
                      {isSystem ? (
                        <span className='qs-chip qs-chip-neutral'>
                          System
                        </span>
                      ) : (
                        <span className='qs-chip qs-chip-success'>
                          Uploaded
                        </span>
                      )}
                      {font.isItalic && (
                        <span className='qs-chip qs-chip-neutral italic'>
                          Italic
                        </span>
                      )}
                    </div>
                    <div className='mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-default-400'>
                      <span>{font.familyName}</span>
                      <span>·</span>
                      <span>Weight {font.weight}</span>
                      <span>·</span>
                      <span className='uppercase'>{font.fileFormat}</span>
                      <span>·</span>
                      <span>{formatBytes(font.fileSizeBytes ?? 0)}</span>
                    </div>
                  </div>

                  {!isSystem && (
                    <Button
                      isIconOnly
                      size='sm'
                      variant='light'
                      color='danger'
                      isDisabled={isBusy}
                      onPress={() => {
                        setSelected(new Set([font.id!]))
                        setIsDeleteOpen(true)
                      }}>
                      <Icon icon='lucide:trash-2' className='h-4 w-4' />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadOpen} onOpenChange={open => { if (!isBusy) setIsUploadOpen(open) }} size='md' scrollBehavior='inside'>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className='flex items-center gap-2'>
                <Icon icon='lucide:upload' className='h-5 w-5 text-primary' />
                Upload Fonts
              </ModalHeader>
              <ModalBody className='space-y-4'>
                <p className='text-sm text-default-500'>
                  Supports .ttf, .otf, .woff, .woff2 — select multiple files to upload at once.
                </p>
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => !isBusy && fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-default-300 hover:border-primary/60 hover:bg-content2'
                  }`}>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept={ACCEPTED_FORMATS.join(',')}
                    multiple
                    className='hidden'
                    onChange={e => { if (e.target.files) handleAddFiles(e.target.files); e.target.value = '' }}
                  />
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-default-100'>
                    <Icon icon='lucide:upload' className='h-5 w-5 text-default-400' />
                  </div>
                  <div>
                    <p className='text-sm font-medium text-foreground'>Drop font files here or click to browse</p>
                    <p className='mt-0.5 text-xs text-default-400'>.ttf · .otf · .woff · .woff2 · multiple files supported</p>
                  </div>
                </div>

                {uploadFiles.length > 0 && (
                  <div className='max-h-64 space-y-1.5 overflow-y-auto'>
                    {uploadFiles.map((f, i) => (
                      <div key={f.name} className='flex items-center gap-2 rounded-lg bg-content2 px-3 py-2 ring-hairline'>
                        <Icon icon='lucide:file-type' className='h-4 w-4 shrink-0 text-primary' />
                        <span className='flex-1 truncate text-sm text-foreground'>{f.name}</span>
                        <span className='shrink-0 text-xs text-default-400'>{formatBytes(f.size)}</span>
                        {!isBusy && (
                          <button
                            onClick={() => setUploadFiles(prev => prev.filter((_, idx) => idx !== i))}
                            className='shrink-0 text-default-400 hover:text-danger'>
                            <Icon icon='lucide:x' className='h-3.5 w-3.5' />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {progress && (progress.phase === 'uploading' || (progress.phase === 'syncing' && isUploadOpen)) && (
                  <ProgressBar progress={progress} />
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant='light' onPress={onClose} isDisabled={isBusy}>Cancel</Button>
                <Button
                  color='primary'
                  isDisabled={!uploadFiles.length || isBusy}
                  isLoading={isBusy}
                  onPress={handleUpload}
                  startContent={!isBusy && <Icon icon='lucide:upload' className='h-4 w-4' />}>
                  {isBusy ? (progress?.phase === 'syncing' ? 'Applying…' : 'Uploading…') : `Upload${uploadFiles.length > 0 ? ` (${uploadFiles.length})` : ''}`}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={isDeleteOpen} onOpenChange={open => { if (!isBusy && !open) { setIsDeleteOpen(false); setSelected(new Set()) } }}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader>Delete Font{selected.size > 1 ? 's' : ''}</ModalHeader>
              <ModalBody className='space-y-4'>
                <p className='text-sm text-default-500'>
                  Permanently delete{' '}
                  {selected.size === 1
                    ? <><strong>{fonts.find(f => f.id === [...selected][0])?.name}</strong>?</>
                    : <><strong>{selected.size} fonts</strong>?</>
                  }
                  {' '}This removes the font{selected.size > 1 ? 's' : ''} from storage and all projects. This action cannot be undone.
                </p>
                {progress && (progress.phase === 'deleting' || progress.phase === 'syncing') && (
                  <ProgressBar progress={progress} />
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant='light' onPress={onClose} isDisabled={isBusy}>Cancel</Button>
                <Button color='danger' onPress={handleBulkDelete} isLoading={isBusy} isDisabled={isBusy}>
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
