'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card,
  CardBody,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
  Spinner,
  Pagination,
  useDisclosure,
  addToast
} from '@heroui/react'
import Icon from '@/components/icon'
import { useProject } from '@/providers/ProjectContext'
import { api } from '@/api/generated/main-service'
import { FontSummaryDto, FontDetailDto } from '@/api/generated/main-service/apiGenerated'

const ACCEPTED_FORMATS = ['.ttf', '.otf', '.woff', '.woff2']
const ACCEPTED_MIME = ['font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/font-woff', 'application/x-font-ttf', 'application/x-font-otf']
const PAGE_SIZE = 20

const formatBytes = (bytes: number | string): string => {
  const n = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes
  if (!n) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

const AccessBadge = ({ accessType }: { accessType?: string }) => {
  if (accessType === 'system') {
    return (
      <Chip size='sm' variant='flat' className='h-5 bg-default-100 px-1.5 text-[10px] font-bold text-default-600'>
        System
      </Chip>
    )
  }
  return (
    <Chip size='sm' variant='flat' color='primary' className='h-5 px-1.5 text-[10px] font-bold'>
      Owner
    </Chip>
  )
}

export default function ProjectFonts() {
  const { currentProject } = useProject()

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange } = useDisclosure()
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onOpenChange: onDetailOpenChange } = useDisclosure()
  const { isOpen: isUploadOpen, onOpen: onUploadOpen, onOpenChange: onUploadOpenChange } = useDisclosure()

  const [fonts, setFonts] = useState<FontSummaryDto[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loadingFonts, setLoadingFonts] = useState(true)
  const [page, setPage] = useState(1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selectedFont, setSelectedFont] = useState<FontSummaryDto | null>(null)
  const [fontDetail, setFontDetail] = useState<FontDetailDto | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [licenseNote, setLicenseNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchFonts = useCallback(async () => {
    if (!currentProject?.id) return
    setLoadingFonts(true)
    try {
      const data = await api.projects.fontsDetail(currentProject.id, debouncedSearch ? { search: debouncedSearch } : undefined)
      setFonts(data || [])
    } catch (error: any) {
      addToast({ title: 'Failed to load fonts', color: 'danger' })
    } finally {
      setLoadingFonts(false)
    }
  }, [currentProject, debouncedSearch])

  useEffect(() => {
    fetchFonts()
  }, [fetchFonts])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 400)
  }

  const isValidFontFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    return ACCEPTED_FORMATS.includes(ext) || ACCEPTED_MIME.includes(file.type)
  }

  const handleFileSelect = (file: File) => {
    if (!isValidFontFile(file)) {
      addToast({ title: 'Invalid file format', description: 'Only .ttf, .otf, .woff, .woff2 are supported.', color: 'danger' })
      return
    }
    setUploadFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleUpload = async () => {
    if (!currentProject?.id || !uploadFile) return
    setUploading(true)
    try {
      const res = await api.projects.fontsCreate(
        currentProject.id,
        { file: uploadFile },
        licenseNote ? { licenseNote } : undefined
      )
      const isExisting = res && res.ownershipId && fonts.some(f => f.name === res.name)
      addToast({
        title: isExisting ? 'Ownership granted' : 'Font uploaded',
        description: isExisting
          ? 'Font already exists in the system. Ownership added to this project.'
          : `${res?.name || uploadFile.name} uploaded successfully.`,
        color: 'success'
      })
      setUploadFile(null)
      setLicenseNote('')
      onUploadOpenChange()
      await fetchFonts()
    } catch (error: any) {
      const msg = error?.data?.detail || error?.data?.title || 'Upload failed'
      addToast({ title: 'Upload failed', description: msg, color: 'danger' })
    } finally {
      setUploading(false)
    }
  }

  const handleOpenDetail = async (font: FontSummaryDto) => {
    if (!currentProject?.id || !font.id) return
    setSelectedFont(font)
    setFontDetail(null)
    onDetailOpen()
    setLoadingDetail(true)
    try {
      const detail = await api.projects.fontsDetail2(currentProject.id, font.id)
      setFontDetail(detail)
    } catch (error: any) {
      addToast({ title: 'Failed to load font details', color: 'danger' })
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!currentProject?.id || !selectedFont?.id) return
    setDeleteLoading(true)
    try {
      await api.projects.fontsDelete(currentProject.id, selectedFont.id)
      addToast({ title: 'Font removed', description: `${selectedFont.name} ownership removed from this project.`, color: 'success' })
      setSelectedFont(null)
      onDeleteOpenChange()
      await fetchFonts()
    } catch (error: any) {
      const msg = error?.data?.detail || error?.data?.title || 'Failed to remove font'
      addToast({ title: 'Remove failed', description: msg, color: 'danger' })
    } finally {
      setDeleteLoading(false)
    }
  }

  // Pagination
  const totalPages = Math.ceil(fonts.length / PAGE_SIZE)
  const paginatedFonts = fonts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (!currentProject) return null

  return (
    <div className='space-y-6 pb-20 pt-8'>
      {/* Page Header */}
      <div className='mx-auto max-w-4xl'>
        <div className='flex items-center gap-2 text-sm text-default-500'>
          <span>Projects</span>
          <Icon icon='lucide:chevron-right' className='h-3 w-3' />
          <span className='font-medium text-foreground'>{currentProject.name}</span>
        </div>
        <div className='mt-2 flex items-start justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight text-foreground'>Fonts</h1>
            <p className='mt-1 text-default-500'>Manage custom fonts for your project&apos;s PDF templates.</p>
          </div>
          <Button
            color='primary'
            size='sm'
            className='mt-1 shrink-0'
            onPress={onUploadOpen}
            startContent={<Icon icon='lucide:upload' className='h-4 w-4' />}>
            Upload Font
          </Button>
        </div>
      </div>

      {/* Font List Card */}
      <div className='mx-auto max-w-4xl'>
        <Card className='border border-default-200 shadow-none'>
          {/* Card Header */}
          <div className='flex items-center justify-between gap-4 border-b border-default-200 px-6 py-4'>
            <div>
              <h3 className='font-semibold text-foreground'>Project Fonts</h3>
              <p className='text-sm text-default-500'>System fonts and fonts owned by this project.</p>
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
              onClear={() => {
                setSearch('')
                setDebouncedSearch('')
                setPage(1)
              }}
            />
          </div>

          <CardBody className='p-0'>
            {loadingFonts ? (
              <div className='flex items-center justify-center py-16'>
                <Spinner size='md' color='primary' />
              </div>
            ) : fonts.length === 0 ? (
              <div className='flex flex-col items-center justify-center gap-3 py-16 text-center'>
                <div className='flex h-12 w-12 items-center justify-center rounded-full bg-default-100'>
                  <Icon icon='lucide:type' className='h-6 w-6 text-default-400' />
                </div>
                <p className='text-sm font-medium text-foreground'>
                  {debouncedSearch ? 'No fonts match your search' : 'No fonts yet'}
                </p>
                <p className='text-xs text-default-400'>
                  {debouncedSearch ? 'Try a different search term.' : 'Upload your first font using the button above.'}
                </p>
              </div>
            ) : (
              <>
                <div className='divide-y divide-default-100'>
                  {paginatedFonts.map(font => (
                    <div
                      key={font.id}
                      className='flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-content2'>
                      {/* Icon */}
                      <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-default-100'>
                        <Icon icon='lucide:type' className='h-4 w-4 text-default-500' />
                      </div>

                      {/* Info */}
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-1.5'>
                          <span className='truncate text-sm font-semibold text-foreground'>{font.name}</span>
                          <AccessBadge accessType={font.accessType} />
                          {font.isItalic && (
                            <Chip size='sm' variant='flat' className='h-5 bg-default-100 px-1.5 text-[10px] italic text-default-500'>
                              Italic
                            </Chip>
                          )}
                        </div>
                        <div className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-xs text-default-400'>
                          <span>{font.familyName}</span>
                          <span>·</span>
                          <span>Weight {font.weight}</span>
                          <span>·</span>
                          <span className='uppercase'>{font.fileFormat}</span>
                          <span>·</span>
                          <span>{formatBytes(font.fileSizeBytes ?? 0)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className='flex shrink-0 items-center gap-1'>
                        <Button
                          isIconOnly
                          size='sm'
                          variant='light'
                          onPress={() => handleOpenDetail(font)}
                          className='text-default-400 hover:text-foreground'>
                          <Icon icon='lucide:info' className='h-4 w-4' />
                        </Button>
                        <Button
                          isIconOnly
                          size='sm'
                          variant='light'
                          color='danger'
                          isDisabled={font.isSystemFont === true}
                          className={font.isSystemFont ? 'invisible' : ''}
                          onPress={() => {
                            setSelectedFont(font)
                            onDeleteOpen()
                          }}>
                          <Icon icon='lucide:trash-2' className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className='flex items-center justify-between border-t border-default-100 px-6 py-3'>
                    <span className='text-xs text-default-400'>
                      {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, fonts.length)} of {fonts.length} fonts
                    </span>
                    <Pagination
                      total={totalPages}
                      page={page}
                      onChange={setPage}
                      size='sm'
                      showControls
                      color='primary'
                      variant='flat'
                    />
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Upload Font Modal */}
      <Modal isOpen={isUploadOpen} onOpenChange={onUploadOpenChange} size='md'>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className='flex items-center gap-2'>
                <Icon icon='lucide:upload' className='h-5 w-5 text-primary' />
                Upload Font
              </ModalHeader>
              <ModalBody className='space-y-4'>
                <p className='text-sm text-default-500'>
                  Supports .ttf, .otf, .woff, .woff2 — duplicate files receive ownership automatically.
                </p>

                {/* Drop Zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/5 text-primary'
                      : uploadFile
                        ? 'border-success/50 bg-success/5'
                        : 'border-default-300 hover:border-primary/60 hover:bg-content2'
                  }`}>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept={ACCEPTED_FORMATS.join(',')}
                    className='hidden'
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(file)
                      e.target.value = ''
                    }}
                  />
                  {uploadFile ? (
                    <>
                      <div className='flex h-10 w-10 items-center justify-center rounded-full bg-success/10'>
                        <Icon icon='lucide:file-type' className='h-5 w-5 text-success' />
                      </div>
                      <div>
                        <p className='text-sm font-semibold text-foreground'>{uploadFile.name}</p>
                        <p className='text-xs text-default-400'>{formatBytes(uploadFile.size)}</p>
                      </div>
                      <Button
                        size='sm'
                        variant='light'
                        color='danger'
                        onPress={() => setUploadFile(null)}
                        startContent={<Icon icon='lucide:x' className='h-3 w-3' />}>
                        Remove
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className='flex h-10 w-10 items-center justify-center rounded-full bg-default-100'>
                        <Icon icon='lucide:upload' className='h-5 w-5 text-default-400' />
                      </div>
                      <div>
                        <p className='text-sm font-medium text-foreground'>Drop font file here or click to browse</p>
                        <p className='mt-0.5 text-xs text-default-400'>.ttf · .otf · .woff · .woff2</p>
                      </div>
                    </>
                  )}
                </div>

                {/* License Note */}
                <Input
                  label='License Note (optional)'
                  placeholder='e.g. Licensed from ...'
                  value={licenseNote}
                  onValueChange={setLicenseNote}
                  variant='bordered'
                  size='sm'
                />
              </ModalBody>
              <ModalFooter>
                <Button variant='light' onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color='primary'
                  isDisabled={!uploadFile}
                  isLoading={uploading}
                  onPress={handleUpload}
                  startContent={!uploading && <Icon icon='lucide:upload' className='h-4 w-4' />}>
                  Upload Font
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Font Detail Modal */}
      <Modal isOpen={isDetailOpen} onOpenChange={onDetailOpenChange} size='md'>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className='flex items-center gap-2'>
                <Icon icon='lucide:type' className='h-5 w-5 text-primary' />
                {selectedFont?.name || 'Font Detail'}
              </ModalHeader>
              <ModalBody>
                {loadingDetail ? (
                  <div className='flex items-center justify-center py-8'>
                    <Spinner size='md' color='primary' />
                  </div>
                ) : fontDetail ? (
                  <div className='space-y-4'>
                    <div className='grid grid-cols-2 gap-3'>
                      {[
                        { label: 'Family', value: fontDetail.familyName },
                        { label: 'Sub-Family', value: fontDetail.subFamilyName },
                        { label: 'Weight', value: String(fontDetail.weight ?? '—') },
                        { label: 'Format', value: (fontDetail.fileFormat ?? '').toUpperCase() },
                        { label: 'Size', value: formatBytes(fontDetail.fileSizeBytes ?? 0) },
                        { label: 'Italic', value: fontDetail.isItalic ? 'Yes' : 'No' },
                        { label: 'Access', value: fontDetail.accessType === 'system' ? 'System' : 'Owner' },
                        {
                          label: 'Uploaded',
                          value: fontDetail.createdDatetime
                            ? new Date(fontDetail.createdDatetime).toLocaleDateString()
                            : '—'
                        }
                      ].map(({ label, value }) => (
                        <div key={label} className='rounded-lg bg-content2 px-3 py-2.5'>
                          <p className='text-[10px] font-bold uppercase tracking-wider text-default-400'>{label}</p>
                          <p className='mt-0.5 text-sm font-medium text-foreground'>{value}</p>
                        </div>
                      ))}
                    </div>

                    {fontDetail.licenseNote && (
                      <div className='rounded-lg border border-default-200 bg-content2 p-3'>
                        <p className='text-[10px] font-bold uppercase tracking-wider text-default-400'>License Note</p>
                        <p className='mt-1 text-sm text-default-600'>{fontDetail.licenseNote}</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </ModalBody>
              <ModalFooter>
                {fontDetail?.downloadUrl && (
                  <Button
                    as='a'
                    href={fontDetail.downloadUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    color='primary'
                    variant='flat'
                    startContent={<Icon icon='lucide:download' className='h-4 w-4' />}>
                    Download
                  </Button>
                )}
                <Button color='default' variant='light' onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className='flex flex-col gap-1'>Remove Font Ownership</ModalHeader>
              <ModalBody>
                <p className='text-sm text-default-500'>
                  Remove ownership of <strong>{selectedFont?.name}</strong> from this project? This may affect PDF
                  templates that use this font. If no other project owns it, the font will be deactivated.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color='default' variant='light' onPress={onClose}>
                  Cancel
                </Button>
                <Button color='danger' onPress={handleConfirmDelete} isLoading={deleteLoading}>
                  Remove
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
