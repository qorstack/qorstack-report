'use client'

import React, { useState, useEffect, useRef } from 'react'
import { api } from '@/api/generated/main-service'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Button,
  Chip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Input,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Skeleton,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  addToast,
  cn,
  Checkbox,
  Tooltip,
  Card,
  CardBody
} from '@heroui/react'
import Icon from '@/components/icon'
import { TemplateVersionResponse, WordTableDataRequest, SortDefinition } from '@/api/generated/main-service/apiGenerated'
import { PdfFromTemplateRequest } from '@/types/pdf-sandbox'
import { DeleteTemplateModal } from '@/components/pdf/DeleteTemplateModal'

import {
  ReplacementsSection,
  TablesSection,
  ImagesSection,
  QrCodesSection,
  BarcodesSection,
  FileSettingsSection,
  ReplaceItem,
  TableItem,
  ImageItem,
  QrCodeItem,
  BarcodeItem,
  generateId,
  formatKey
} from '@/components/pdf/SandboxInputs'
import { CodeSwitcher } from '@/components/docs/CodeSwitcher'
import {
  VariablesContent,
  TablesContent,
  ImagesContent,
  QrCodesContent,
  BarcodesContent,
  FileSettingsContent
} from '@/components/docs/DocContents'
import { getSdkCodeExamples } from '@/utils/code-gen'
import type { CodeExamples } from '@/utils/code-gen'
import { ProChip } from '@/components/docs/DocComponents'

// --- Dynamic Components ---
const PdfPreview = dynamic(() => import('@/components/pdf/PdfPreview'), {
  ssr: false,
  loading: () => (
    <div className='flex items-center gap-2 p-4'>
      <Spinner size='sm' color='primary' />
      <span className='text-sm text-default-500'>Initializing Preview...</span>
    </div>
  )
})

// --- UI State Interface (Arrays for Ordering) ---
interface UiState {
  templateKey: string
  fileName: string
  filePassword?: string
  watermark?: string
  replace: ReplaceItem[]
  table: TableItem[]
  image: ImageItem[]
  qrcode: QrCodeItem[]
  barcode: BarcodeItem[]
}

const DEFAULT_UI_STATE: UiState = {
  templateKey: '',
  fileName: 'My_Generated_Report',
  filePassword: '',
  watermark: '',
  replace: [],
  table: [],
  image: [],
  qrcode: [],
  barcode: []
}

// --- Converters ---
const convertToUiState = (data: PdfFromTemplateRequest): UiState => {
  return {
    templateKey: data.templateKey || '',
    fileName: data.fileName || 'My_Generated_Report',
    filePassword: data.filePassword || '',
    watermark: data.watermark || '',
    replace: Object.entries(data.replace || {}).map(([key, value]) => ({
      id: generateId(),
      key: formatKey(key, 'replace'),
      value: String(value)
    })),
    table: (data.table || []).map(t => ({
      id: generateId(),
      columns: t.rows && t.rows.length > 0 ? Object.keys(t.rows[0]) : [],
      rows: (t.rows || []).map(row => {
        const newRow: Record<string, string> = {}
        Object.entries(row).forEach(([k, v]) => {
          newRow[k] = String(v)
        })
        return newRow
      }),
      sort: t.sort || [],
      verticalMerge: t.verticalMerge || [],
      collapse: t.collapse || []
    })),
    image: Object.entries(data.image || {}).map(([key, val]) => ({
      id: generateId(),
      key: formatKey(key, 'image'),
      data: val
    })),
    qrcode: Object.entries(data.qrcode || {}).map(([key, val]) => ({
      id: generateId(),
      key: formatKey(key, 'qrcode'),
      data: val
    })),
    barcode: Object.entries(data.barcode || {}).map(([key, val]) => ({
      id: generateId(),
      key: formatKey(key, 'barcode'),
      data: val
    }))
  }
}

const convertFromUiState = (state: UiState): PdfFromTemplateRequest => {
  const stripKey = (key: string, type: 'replace' | 'table' | 'image' | 'qrcode' | 'barcode') => {
    let k = key.replace(/^\{\{/, '').replace(/\}\}$/, '')
    if (type !== 'replace') {
      const prefix = `${type}:`
      if (k.startsWith(prefix)) return k.substring(prefix.length)
    }
    if (type === 'table') {
      if (k.startsWith('row:')) return k.substring('row:'.length)
      if (k.startsWith('col:')) return k.substring('col:'.length)
    }
    return k
  }

  return {
    templateKey: state.templateKey,
    fileName: state.fileName,
    filePassword: state.filePassword || undefined,
    watermark: state.watermark || undefined,
    replace: state.replace.reduce((acc, item) => ({ ...acc, [stripKey(item.key, 'replace')]: item.value }), {}),
    table: state.table.map(item => {
      const rows = (item.rows || []).map(row => {
        const newRow: Record<string, unknown> = {}
        item.columns.forEach(colKey => {
          let cleanColKey = stripKey(colKey, 'table')
          newRow[cleanColKey] = row[colKey] || ''
        })
        return newRow
      })

      return {
        rows,
        sort: item.sort || [],
        verticalMerge: item.verticalMerge,
        collapse: item.collapse
      }
    }),
    image: state.image.reduce((acc, item) => ({ ...acc, [stripKey(item.key, 'image')]: item.data }), {}),
    qrcode: state.qrcode.reduce((acc, item) => ({ ...acc, [stripKey(item.key, 'qrcode')]: item.data }), {}),
    barcode: state.barcode.reduce((acc, item) => ({ ...acc, [stripKey(item.key, 'barcode')]: item.data }), {})
  }
}

const SectionWrapper = ({
  title,
  description,
  action,
  children
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) => (
  <div className='mb-8 border-b border-default-100 pb-8 last:mb-0 last:border-0 last:pb-0'>
    <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
      <div>
        <h3 className='text-lg font-bold text-foreground'>{title}</h3>
        {description && <p className='text-sm text-default-500'>{description}</p>}
      </div>
      {action && <div className='flex shrink-0 items-center gap-2'>{action}</div>}
    </div>
    <div className='pl-0'>{children}</div>
  </div>
)

const CopyButton = ({ text, className = '' }: { text: string; className?: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={className}>
      <Tooltip
        isOpen={copied}
        content='Copied!'
        placement='top'
        showArrow
        classNames={{
          base: 'before:bg-black after:bg-black',
          content: 'bg-black text-white font-bold text-[10px] px-2 py-1'
        }}>
        <button
          onClick={handleCopy}
          className='flex items-center justify-center text-zinc-400 transition-colors hover:text-black'>
          <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} className='h-3 w-3' />
        </button>
      </Tooltip>
    </div>
  )
}

const TemplateSandboxPage = () => {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const templateKeyParam = params.id as string

  const [uiState, setUiState] = useState<UiState>(DEFAULT_UI_STATE)
  const [activeMainTab, setActiveMainTab] = useState<'builder' | 'code'>('builder')
  const [activeBuilderCategory, setActiveBuilderCategory] = useState<
    'text' | 'tables' | 'image' | 'qrcode' | 'barcode' | 'settings'
  >('text')

  const [isGenerating, setGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloadingSource, setIsDownloadingSource] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const clearValidationError = (id: string) => {
    setValidationErrors(prev => {
      // If error exists, remove it
      if (prev[id]) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return prev
    })
  }

  // --- Effects ---
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'before' | 'after'>('before')
  const [isExpanded, setIsExpanded] = useState(false)
  const [previewFilePath, setPreviewFilePath] = useState<string | null>(null)

  const [templateName, setTemplateName] = useState('')
  const [templateKey, setTemplateKey] = useState('')
  const [tempEditData, setTempEditData] = useState({ name: '', key: '' })
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)
  const [numPages, setNumPages] = useState<number>(0)
  const [containerWidth, setContainerWidth] = useState<number>(0)

  // Update File State
  const [isUpdateFileOpen, setIsUpdateFileOpen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [autoGeneratedVariable, setAutoGeneratedVariable] = useState(true)

  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // Version State
  const [versions, setVersions] = useState<TemplateVersionResponse[]>([])
  const [activeVersion, setActiveVersion] = useState<number | null>(null)

  // Docs State
  const [isDocsOpen, setIsDocsOpen] = useState(false)
  const [activeDocsSection, setActiveDocsSection] = useState<'variables' | 'tables' | 'image' | 'qrcode' | 'barcode' | 'settings'>(
    'variables'
  )

  useEffect(() => {
    if (templateKeyParam) {
      fetchTemplateDetails(templateKeyParam)
    }
  }, [templateKeyParam])

  const fetchTemplateDetails = async (key: string) => {
    setIsLoading(true)
    try {
      const template = await api.templates.getTemplateById(key)
      setTemplateName(template.name || '')
      setTemplateKey(template.templateKey || '')
      setTemplateKey(template.templateKey || '')
      setPreviewFilePath(template.activeVersion?.previewFilePathPresigned || null)

      // Check for persistent result
      if (template.fileSandboxLastTestPresigned) {
        setGeneratedUrl(template.fileSandboxLastTestPresigned)
        // Default to 'before' (Template Source) as requested
        setPreviewMode('before')
      } else {
        setGeneratedUrl(null)
        setPreviewMode('before')
      }

      if (template.allVersions && template.allVersions.length > 0) {
        setVersions(template.allVersions)
      } else if (template.activeVersion) {
        setVersions([template.activeVersion])
      }
      setActiveVersion(template.activeVersion?.version != null ? Number(template.activeVersion.version) : null)

      if (template.sandboxPayload) {
        try {
          const parsed = JSON.parse(template.sandboxPayload)
          const fullRequest = {
            ...DEFAULT_UI_STATE,
            ...parsed,
            templateKey: template.templateKey || parsed.templateKey
          }
          setUiState(convertToUiState(fullRequest))
        } catch (e) {
          console.error('Failed to parse sandbox payload', e)
          setUiState({ ...DEFAULT_UI_STATE, templateKey: template.templateKey || '' })
        }
      } else {
        setUiState({ ...DEFAULT_UI_STATE, templateKey: template.templateKey || '' })
      }
    } catch (error) {
      console.error('Failed to fetch template details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const validateUiState = (): boolean => {
    setValidationErrors({})
    return true
  }

  const handleGenerate = async () => {
    if (!validateUiState()) {
      return
    }

    setGenerating(true)
    try {
      const payload = convertFromUiState(uiState)

      // Sanitise payload for render API
      // If we have any extra fields in table we don't need, clear them.
      // Current structure `table` is array of TableDataRequest objects.
      const renderPayload = JSON.parse(JSON.stringify(payload))

      renderPayload.templateKey = templateKey

      const res = await api.render.wordTemplateSandboxCreate(templateKey, renderPayload)
      if (res && res.downloadUrl) {
        setGeneratedUrl(res.downloadUrl)
        setPreviewMode('after')
      }
    } catch (error) {
      addToast({ title: 'Error', description: 'Generation failed. Please check your inputs.', color: 'danger' })
    } finally {
      setGenerating(false)
    }
  }

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const handleSaveDetails = async () => {
    setIsSaving(true)
    try {
      const projectId = searchParams.get('projectId')
      const payload = convertFromUiState(uiState)
      payload.templateKey = templateKey

      await api.templates.templatesUpdate(
        templateKey,
        {
          name: tempEditData.name,
          sandboxPayload: JSON.stringify(payload),
          project_id: projectId ?? undefined,
          isAutoGeneratedVariable: false
        },
        {}
      )

      setTemplateName(tempEditData.name)
      setIsEditOpen(false)
      fetchTemplateDetails(templateKey)
      addToast({ title: 'Success', description: 'Template saved successfully', color: 'success' })
    } catch (error) {
      console.error('Failed to save template', error)
      addToast({ title: 'Error', description: 'Failed to save changes.', color: 'danger' })
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (isEditOpen) {
      setTempEditData({ name: templateName, key: templateKey })
    }
  }, [isEditOpen, templateName, templateKey])

  const openEditPopover = () => {
    setIsEditOpen(true)
  }

  const getExampleCode = (): CodeExamples => {
    const requestData = convertFromUiState(uiState)
    requestData.templateKey = templateKey

    // Fallback if no specific data exists (e.g. clean template mode)
    if (!requestData.fileName) requestData.fileName = 'generated_document'

    return getSdkCodeExamples(requestData)
  }

  const generateKey = async () => {
    setIsGeneratingKey(true)
    try {
      const key = await api.templates.templateGenerateKeyList()
      setTempEditData(prev => ({ ...prev, key }))
    } catch (error) {
      console.error('Failed to generate key', error)
      addToast({
        title: 'Error',
        description: 'Failed to generate template key',
        color: 'danger'
      })
    } finally {
      setIsGeneratingKey(false)
    }
  }

  const handleUpdateFile = async () => {
    if (!uploadedFile) return
    setIsSaving(true)
    try {
      const projectId = searchParams.get('projectId')
      await api.templates.templatesUpdate(
        templateKey,
        {
          name: templateName,
          project_id: projectId ?? undefined,
          isAutoGeneratedVariable: autoGeneratedVariable
        },
        { file: uploadedFile }
      )
      addToast({ title: 'Success', description: 'Template file updated successfully', color: 'success' })
      setIsUpdateFileOpen(false)
      setUploadedFile(null)
      setPreviewMode('before')
      fetchTemplateDetails(templateKey)
    } catch (error) {
      console.error('Failed to update file', error)
      addToast({ title: 'Error', description: 'Failed to update file', color: 'danger' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleVersionChange = async (version: number) => {
    try {
      await api.templates.switchVersionUpdate(templateKey, { version })
      setPreviewMode('before')
      setGeneratedUrl(null)
      fetchTemplateDetails(templateKey)
    } catch (error) {
      console.error('Failed to switch version', error)
      addToast({ title: 'Error', description: 'Failed to switch version', color: 'danger' })
    }
  }

  const validateAndSetFile = (file: File) => {
    const validExtensions = ['.docx']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!validExtensions.includes(fileExtension)) {
      addToast({
        title: 'Invalid file type',
        description: 'Please upload a .docx file only',
        color: 'danger'
      })
      return
    }

    setUploadedFile(file)
  }

  const clearFile = () => {
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      validateAndSetFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      validateAndSetFile(file)
    }
  }

  useEffect(() => {
    if (!previewContainerRef.current) return

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    resizeObserver.observe(previewContainerRef.current)

    return () => resizeObserver.disconnect()
  }, [])


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  if (isLoading) {
    return (
      <div className='flex h-[calc(100vh-210px)] items-center justify-center bg-background'>
        <Spinner size='lg' />
      </div>
    )
  }

  const previewSrc = previewMode === 'before' ? previewFilePath || '' : generatedUrl

  return (
    <div className='flex flex-col rounded-lg border border-default-200 bg-background font-sans text-foreground shadow-sm lg:h-[calc(100vh-64px)] lg:overflow-hidden'>
      {/* Header */}
      <div className='flex flex-none flex-col justify-between border-b border-default-200 bg-background px-4 py-3 md:flex-row md:px-6'>
        <div className='flex flex-wrap items-center gap-2 sm:gap-4'>
          <Button
            isIconOnly
            size='sm'
            variant='light'
            radius='lg'
            onPress={() => router.back()}
            className='-ml-2 rounded-md text-default-500 hover:text-foreground'>
            <Icon icon='lucide:arrow-left' className='h-5 w-5' />
          </Button>
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-3'>
              <h1 className='truncate text-xl font-bold tracking-tight text-foreground'>{templateName}</h1>
              <div className='flex max-w-[160px] items-center gap-1.5 rounded-md bg-content3 px-2 py-0.5 sm:max-w-none'>
                <span className='shrink-0 font-mono text-[10px] font-medium text-default-500'>KEY:</span>
                <span className='truncate font-mono text-[10px] font-bold text-foreground'>{templateKey}</span>
                <CopyButton text={templateKey} className='ml-1 shrink-0' />
              </div>

              <Popover isOpen={isEditOpen} onOpenChange={setIsEditOpen} placement='bottom-start' showArrow offset={10}>
                <PopoverTrigger>
                  <Button
                    isIconOnly
                    size='sm'
                    variant='light'
                    radius='full'
                    onPress={openEditPopover}
                    className='text-default-400 hover:bg-content3 hover:text-default-600'>
                    <Icon icon='lucide:pencil' className='h-3.5 w-3.5' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-80 p-4'>
                  <div className='w-full space-y-4'>
                    <h4 className='font-medium text-foreground'>Edit Template Details</h4>
                    <Input
                      label='Template Name'
                      variant='bordered'
                      value={tempEditData.name}
                      onValueChange={v => setTempEditData(prev => ({ ...prev, name: v }))}
                    />
                    <Input
                      label='Template Key'
                      variant='bordered'
                      placeholder='Optional'
                      value={tempEditData.key}
                      onValueChange={v => setTempEditData(prev => ({ ...prev, key: v }))}
                      endContent={
                        <Button
                          isIconOnly
                          size='sm'
                          variant='flat'
                          className='bg-content3 text-default-600 hover:bg-default-200'
                          onPress={generateKey}
                          isLoading={isGeneratingKey}
                          title='Generate Key'>
                          {!isGeneratingKey && <Icon icon='lucide:sparkles' className='h-4 w-4' />}
                        </Button>
                      }
                    />
                    <div className='flex justify-end gap-2'>
                      <Button size='sm' variant='light' onPress={() => setIsEditOpen(false)}>
                        Cancel
                      </Button>
                      <Button size='sm' color='primary' onPress={handleSaveDetails} isLoading={isSaving}>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className='mt-1 flex items-center gap-3 text-xs text-default-400'>
              <span className='flex items-center gap-1.5'>
                <Icon icon='lucide:clock' className='h-3 w-3' />
                <span>Last updated: {new Date().toLocaleDateString()}</span>
              </span>
            </div>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
          <Button
            isIconOnly
            color='danger'
            variant='flat'
            size='sm'
            className='bg-danger-50 text-danger-500 hover:bg-danger-100'
            onPress={() => setIsDeleteModalOpen(true)}
            title='Delete Template'>
            <Icon icon='lucide:trash-2' className='h-4 w-4' />
          </Button>

          <DeleteTemplateModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onSuccess={() => {
              const projectId = searchParams.get('projectId')
              if (projectId) {
                router.push(`/project/${projectId}/pdf-templates`)
              } else {
                router.push('/')
              }
            }}
            templateName={templateName}
            templateKey={templateKey}
          />

          <Button
            isIconOnly
            variant='flat'
            size='sm'
            className='bg-content3 text-default-500 hover:bg-default-200'
            isLoading={isDownloadingSource}
            onPress={async () => {
              setIsDownloadingSource(true)
              try {
                const res = await api.templates.downloadTemplate(templateKey)
                if (res && res.url) {
                  try {
                    // Fetch blob to enforce filename
                    const response = await fetch(res.url)
                    const blob = await response.blob()
                    const url = window.URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = `${templateName}_v${activeVersion || 'latest'}.docx`
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    window.URL.revokeObjectURL(url)
                  } catch (fetchError) {
                    console.error('Blob fetch failed, falling back to direct link', fetchError)
                    // Fallback if fetch fails (e.g. CORS)
                    const link = document.createElement('a')
                    link.href = res.url
                    link.download = `${templateName}_v${activeVersion || 'latest'}.docx`
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }
                } else {
                  addToast({ title: 'Error', description: 'Download URL not found', color: 'danger' })
                }
              } catch (e) {
                console.error(e)
                addToast({ title: 'Error', description: 'Failed to download template', color: 'danger' })
              } finally {
                setIsDownloadingSource(false)
              }
            }}
            title='Download Source File'>
            {!isDownloadingSource && <Icon icon='lucide:download' className='h-4 w-4' />}
          </Button>

          <div className='mx-1 h-6 w-px bg-default-200' />

          <Dropdown>
            <DropdownTrigger>
              <Button
                variant='bordered'
                size='sm'
                className='hidden border-default-200 font-medium text-default-600 sm:flex'
                endContent={<Icon icon='lucide:chevron-down' className='h-3 w-3 text-default-400' />}>
                v{activeVersion || '?'}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label='Template Versions'
              selectionMode='single'
              selectedKeys={activeVersion ? [activeVersion.toString()] : []}
              className='max-h-[300px] overflow-y-auto'
              onAction={key => handleVersionChange(Number(key))}>
              {versions.length > 0 ? (
                versions.map(v => (
                  <DropdownItem key={v.version?.toString() || ''}>
                    <div className='flex items-center gap-2'>
                      <p>version {v.version} </p>
                      {v.version === activeVersion && (
                        <Chip
                          color='primary'
                          size='sm'
                          variant='flat'
                          radius='sm'
                          className='hidden h-6 font-mono text-[10px] sm:flex'>
                          Active
                        </Chip>
                      )}
                    </div>
                  </DropdownItem>
                ))
              ) : (
                <DropdownItem key='current'>Version {activeVersion}</DropdownItem>
              )}
            </DropdownMenu>
          </Dropdown>

          <Button
            variant='flat'
            size='sm'
            className='hidden bg-content3 font-medium text-default-600 hover:bg-default-200 sm:flex'
            startContent={<Icon icon='lucide:upload-cloud' className='h-4 w-4' />}
            onPress={() => setIsUpdateFileOpen(true)}>
            Update File
          </Button>
          <Button
            isIconOnly
            variant='flat'
            size='sm'
            className='bg-content3 text-default-500 hover:bg-default-200 sm:hidden'
            onPress={() => setIsUpdateFileOpen(true)}>
            <Icon icon='lucide:upload-cloud' />
          </Button>

          <Button
            color='primary'
            size='sm'
            className='flex-1 font-medium shadow-md shadow-primary/20 sm:flex-none sm:px-6'
            isLoading={isGenerating}
            onPress={handleGenerate}
            startContent={!isGenerating && <Icon icon='lucide:zap' className='h-4 w-4' />}>
            Generate PDF
          </Button>
        </div>
      </div>

      {/* Main Content Area - Split Panel */}
      <div className='flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden'>
        {/* Left Panel: Builder (58%) - Internal scroll on desktop */}
        <div className='flex w-full flex-col border-r border-default-200 bg-background lg:w-[58%] lg:overflow-y-auto'>
          <div className='border-b border-default-200 bg-background px-4 pt-4 md:px-6 lg:sticky lg:top-0 lg:z-10'>
            {/* Main Tabs (Builder / Code) */}
            <div className='mb-4 flex items-center gap-1 rounded-lg bg-content3 p-1'>
              <button
                onClick={() => setActiveMainTab('builder')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-semibold transition-all',
                  activeMainTab === 'builder' ? 'bg-background text-foreground shadow-sm' : 'text-default-500 hover:text-default-700'
                )}>
                <Icon icon='lucide:layout' className='h-4 w-4' />
                Builder UI
              </button>
              <button
                onClick={() => setActiveMainTab('code')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-semibold transition-all',
                  activeMainTab === 'code' ? 'bg-background text-foreground shadow-sm' : 'text-default-500 hover:text-default-700'
                )}>
                <Icon icon='lucide:code' className='h-4 w-4' />
                Integration Code
              </button>
            </div>

            {/* Sub Tabs (Only visible when Builder is active) */}
            {activeMainTab === 'builder' && (
              <div className='no-scrollbar mt-2 flex items-center gap-4 overflow-x-auto md:gap-6'>
                {(
                  [
                    { id: 'text', icon: 'lucide:type', label: 'Variables', count: uiState.replace.length },
                    { id: 'tables', icon: 'lucide:table', label: 'Tables', count: uiState.table.length },
                    { id: 'image', icon: 'lucide:image', label: 'Images', count: uiState.image.length },
                    {
                      id: 'qrcode',
                      icon: 'lucide:qr-code',
                      label: 'QR Codes',
                      count: uiState.qrcode.length
                    },
                    {
                      id: 'barcode',
                      icon: 'lucide:barcode',
                      label: 'Barcodes',
                      count: uiState.barcode.length
                    }
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveBuilderCategory(tab.id)}
                    className={cn(
                      'flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors',
                      activeBuilderCategory === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-default-500 hover:border-default-200 hover:text-default-700'
                    )}>
                    {tab.icon && <Icon icon={tab.icon} className='h-4 w-4' />}
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className={cn(
                          'flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold',
                          activeBuilderCategory === tab.id ? 'bg-primary/10 text-primary' : 'bg-content3 text-default-500'
                        )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className='p-4 md:p-6'>
            <div className='min-w-0 flex-1'>
              {activeMainTab === 'builder' && (
                <>
                  {activeBuilderCategory === 'text' && (
                    <SectionWrapper
                      title='Text Replacements'
                      description='Define variables to replace in your template.'
                      action={
                        <div className='flex items-center gap-2'>
                          <Button
                            size='sm'
                            variant='flat'
                            onPress={() => {
                              setActiveDocsSection('variables')
                              setIsDocsOpen(true)
                            }}
                            className='bg-content3 text-default-500'>
                            <Icon icon='lucide:help-circle' className='mr-1 h-4 w-4' />
                            Help
                          </Button>
                          <Button
                            size='sm'
                            color='primary'
                            onPress={() => {
                              const newId = generateId()
                              setUiState(p => ({
                                ...p,
                                replace: [...p.replace, { id: newId, key: '', value: '' }]
                              }))
                            }}
                            className='h-8 shadow-sm'
                            startContent={<Icon icon='lucide:plus' className='h-4 w-4' />}>
                            Add Variable
                          </Button>
                        </div>
                      }>
                      <ReplacementsSection
                        items={uiState.replace}
                        onChange={d => setUiState(p => ({ ...p, replace: d }))}
                        errors={validationErrors}
                        onClearError={clearValidationError}
                      />
                    </SectionWrapper>
                  )}

                  {activeBuilderCategory === 'tables' && (
                    <SectionWrapper
                      title='Tables'
                      description='Manage tabular data.'
                      action={
                        <div className='flex items-center gap-2'>
                          <Button
                            size='sm'
                            variant='flat'
                            onPress={() => {
                              setActiveDocsSection('tables')
                              setIsDocsOpen(true)
                            }}
                            className='bg-content3 text-default-500'>
                            <Icon icon='lucide:help-circle' className='mr-1 h-4 w-4' />
                            Help
                          </Button>
                          <Button
                            size='sm'
                            color='primary'
                            onPress={() => {
                              const newId = generateId()
                              setUiState(p => ({ ...p, table: [...p.table, { id: newId, columns: [], rows: [] }] }))
                            }}
                            className='h-8 shadow-sm'
                            startContent={<Icon icon='lucide:plus' className='h-4 w-4' />}>
                            Add Table
                          </Button>
                        </div>
                      }>
                      <TablesSection
                        items={uiState.table}
                        onChange={d => setUiState(p => ({ ...p, table: d }))}
                        errors={validationErrors}
                        onClearError={clearValidationError}
                      />
                    </SectionWrapper>
                  )}

                  {activeBuilderCategory === 'image' && (
                    <SectionWrapper
                      title='Images'
                      description='Upload or link images.'
                      action={
                        <div className='flex items-center gap-2'>
                          <Button
                            size='sm'
                            variant='flat'
                            onPress={() => {
                              setActiveDocsSection('image')
                              setIsDocsOpen(true)
                            }}
                            className='bg-content3 text-default-500'>
                            <Icon icon='lucide:help-circle' className='mr-1 h-4 w-4' />
                            Help
                          </Button>
                          <Button
                            size='sm'
                            color='primary'
                            onPress={() => {
                              const newId = generateId()
                              setUiState(p => ({
                                ...p,
                                image: [...p.image, { id: newId, key: '', data: { src: '', fit: 'cover' } }]
                              }))
                            }}
                            className='h-8 shadow-sm'
                            startContent={<Icon icon='lucide:plus' className='h-4 w-4' />}>
                            Add Image
                          </Button>
                        </div>
                      }>
                      <ImagesSection
                        items={uiState.image}
                        onChange={d => setUiState(p => ({ ...p, image: d }))}
                        errors={validationErrors}
                        onClearError={clearValidationError}
                      />
                    </SectionWrapper>
                  )}

                  {activeBuilderCategory === 'qrcode' && (
                    <SectionWrapper
                      title='QR Codes'
                      description='Generate QR codes from text.'
                      action={
                        <div className='flex items-center gap-2'>
                          <Button
                            size='sm'
                            variant='flat'
                            onPress={() => {
                              setActiveDocsSection('barcode')
                              setIsDocsOpen(true)
                            }}
                            className='bg-content3 text-default-500'>
                            <Icon icon='lucide:help-circle' className='mr-1 h-4 w-4' />
                            Help
                          </Button>
                          <Button
                            size='sm'
                            color='primary'
                            onPress={() => {
                              const newId = generateId()
                              setUiState(p => ({
                                ...p,
                                qrcode: [...p.qrcode, { id: newId, key: '', data: { text: '' } }]
                              }))
                            }}
                            className='h-8 shadow-sm'
                            startContent={<Icon icon='lucide:plus' className='h-4 w-4' />}>
                            Add QR
                          </Button>
                        </div>
                      }>
                      <QrCodesSection
                        items={uiState.qrcode}
                        onChange={d => setUiState(p => ({ ...p, qrcode: d }))}
                        errors={validationErrors}
                        onClearError={clearValidationError}
                      />
                    </SectionWrapper>
                  )}

                  {activeBuilderCategory === 'barcode' && (
                    <SectionWrapper
                      title='Barcodes'
                      description='Generate barcodes.'
                      action={
                        <div className='flex items-center gap-2'>
                          <Button
                            size='sm'
                            variant='flat'
                            onPress={() => {
                              setActiveDocsSection('barcode')
                              setIsDocsOpen(true)
                            }}
                            className='bg-content3 text-default-500'>
                            <Icon icon='lucide:help-circle' className='mr-1 h-4 w-4' />
                            Help
                          </Button>
                          <Button
                            size='sm'
                            color='primary'
                            onPress={() => {
                              const newId = generateId()
                              setUiState(p => ({
                                ...p,
                                barcode: [
                                  ...p.barcode,
                                  {
                                    id: newId,
                                    key: '',
                                    data: { text: '', format: 'Code128', width: 200, height: 50, includeText: true }
                                  }
                                ]
                              }))
                            }}
                            className='h-8 shadow-sm'
                            startContent={<Icon icon='lucide:plus' className='h-4 w-4' />}>
                            Add Barcode
                          </Button>
                        </div>
                      }>
                      <BarcodesSection
                        items={uiState.barcode}
                        onChange={d => setUiState(p => ({ ...p, barcode: d }))}
                        errors={validationErrors}
                        onClearError={clearValidationError}
                      />
                    </SectionWrapper>
                  )}
                </>
              )}

              {activeMainTab === 'code' && (
                <div className='flex flex-col'>
                  <div className='w-full flex-1'>
                    <CodeSwitcher
                      examples={getExampleCode()}
                      title='Integration Code'
                      defaultLanguage='api'
                      isDisableMarginY={true}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Right Panel: Preview (42%) */}
        <div
          ref={previewContainerRef}
          className='relative flex w-full flex-col border-t border-default-200 bg-content2 lg:border-l lg:border-t-0 lg:w-[42%]'>
          <div className='flex items-center justify-between border-b border-default-200 bg-background px-4 py-2 shadow-sm'>
            <div className='flex items-center gap-1 rounded bg-content3 p-1'>
              <button
                onClick={() => setPreviewMode('before')}
                className={`rounded px-3 py-1 text-xs font-medium transition-all ${previewMode === 'before' ? 'bg-background text-foreground shadow-sm' : 'text-default-500 hover:text-default-700'}`}>
                Template Source
              </button>
              <button
                onClick={() => {
                  setPreviewMode('after')
                }}
                className={`rounded px-3 py-1 text-xs font-medium transition-all ${previewMode === 'after' ? 'bg-background text-foreground shadow-sm' : 'text-default-500 hover:text-default-700'}`}>
                Result (PDF)
              </button>
            </div>
            <div>
              <button
                onClick={() => setIsExpanded(true)}
                className='flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-default-500 hover:bg-content3 hover:text-foreground'
                title='Full Screen Preview'>
                <Icon icon='lucide:maximize' className='h-4 w-4' />
              </button>
            </div>
          </div>

          <div className='bg-content3 p-4 lg:flex-1 lg:overflow-y-auto'>
            <style jsx global>{`
              .rpv-core__page-layer {
                box-shadow: none !important;
              }
            `}</style>

            {previewSrc ? (
              <div className='w-full shadow-lg transition-all duration-300'>
                <PdfPreview
                  file={previewSrc}
                  fileName={`${templateName}_v${activeVersion || 'latest'}.pdf`}
                  onLoadSuccess={numPages => {
                    console.log('[Preview] Loaded Pages:', numPages)
                    setNumPages(numPages)
                  }}
                  loading={<Skeleton className='h-full min-h-[500px] w-full' />}
                  className='flex flex-col gap-4'
                  width={containerWidth ? containerWidth - 32 : undefined}
                />
              </div>
            ) : (
              <div className='flex h-full w-full flex-col items-center justify-center border-2 border-dashed border-default-300 bg-content2 p-8 text-center'>
                <div className='mb-4 flex h-16 w-16 items-center justify-center bg-content3'>
                  {previewMode === 'after' && !generatedUrl ? (
                    <Icon icon='lucide:sparkles' className='h-8 w-8 text-primary-400' />
                  ) : (
                    <Icon icon='lucide:file-text' className='h-8 w-8 text-default-400' />
                  )}
                </div>
                <h3 className='font-semibold text-foreground'>
                  {previewMode === 'after' && !generatedUrl ? 'Result Generated' : 'No Preview Available'}
                </h3>
                <p className='mt-1 max-w-xs text-sm text-default-500'>
                  {previewMode === 'after' && !generatedUrl
                    ? 'Click the "Generate" button in the header to create the PDF from your template.'
                    : 'The template source file could not be found.'}
                </p>
              </div>
            )}
          </div>

          <Modal isOpen={isExpanded} onOpenChange={setIsExpanded} size='5xl' scrollBehavior='inside'>
            <ModalContent className='h-[90vh]'>
              {onClose => (
                <>
                  <ModalHeader className='flex flex-col gap-1'>PDF Preview</ModalHeader>
                  <ModalBody className='p-0'>
                    <div className='h-full w-full overflow-scroll bg-content3'>
                      {typeof previewSrc === 'string' && previewSrc.length > 0 && (
                        <div className='flex justify-center bg-content3 p-8'>
                          <PdfPreview
                            file={previewSrc}
                            fileName={`${templateName}_v${activeVersion || 'latest'}.pdf`}
                            loading={<Skeleton className='h-full w-full' />}
                          />
                        </div>
                      )}
                    </div>
                  </ModalBody>
                  <ModalFooter>
                    <Button color='danger' variant='flat' onPress={onClose}>
                      Close
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
        </div>

        <Modal isOpen={isUpdateFileOpen} onOpenChange={setIsUpdateFileOpen} size='2xl'>
          <ModalContent>
            {onClose => (
              <>
                <ModalHeader>Update Template File</ModalHeader>
                <ModalBody>
                  <div
                    className={cn(
                      'relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center border-2 border-dashed p-6 transition-all duration-200',
                      isDragOver
                        ? 'border-primary bg-primary-50'
                        : uploadedFile
                          ? 'border-primary/50 bg-content2'
                          : 'border-default-300 bg-content2 hover:border-primary hover:bg-primary-50/30',
                      isSaving && 'pointer-events-none opacity-50'
                    )}
                    onDrop={!isSaving ? handleDrop : undefined}
                    onDragOver={!isSaving ? handleDragOver : undefined}
                    onDragLeave={!isSaving ? handleDragLeave : undefined}
                    onClick={() => !isSaving && fileInputRef.current?.click()}>
                    <input
                      ref={fileInputRef}
                      type='file'
                      className='hidden'
                      accept='.docx'
                      onChange={handleFileChange}
                    />

                    {uploadedFile ? (
                      <div className='flex flex-col items-center text-center'>
                        <div className='mb-3 flex h-12 w-12 items-center justify-center border border-primary bg-primary text-primary-foreground shadow-sm'>
                          <Icon icon='lucide:file-check' className='h-6 w-6' />
                        </div>
                        <p className='text-base font-bold text-foreground'>{uploadedFile.name}</p>
                        <p className='text-xs font-medium text-default-500'>{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            clearFile()
                          }}
                          disabled={isSaving}
                          className='mt-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-default-400 hover:text-danger disabled:pointer-events-none disabled:opacity-50'>
                          <Icon icon='lucide:x' className='h-3.5 w-3.5' />
                          Remove File
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className='mb-4 flex h-16 w-16 items-center justify-center border border-default-200 bg-background shadow-sm'>
                          <Icon icon='lucide:upload-cloud' className='h-8 w-8 text-default-400' />
                        </div>
                        <div className='text-center'>
                          <p className='text-lg font-bold text-foreground'>Click to upload or drag and drop</p>
                          <p className='mt-1 text-xs font-medium text-default-500'>DOCX files only</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className='mt-4 flex flex-col gap-2 px-1'>
                    <Checkbox
                      isSelected={autoGeneratedVariable}
                      onValueChange={setAutoGeneratedVariable}
                      isDisabled={isSaving}>
                      <div className='flex flex-col items-start'>
                        <div className='flex items-center gap-1'>
                          <span className='text-sm text-foreground'>Auto-detect variables from file</span>
                          <ProChip />
                        </div>
                        <span className='text-xs text-default-500'>
                          Scan the document for variables {`{{name}}`} and add them to the builder automatically.
                        </span>
                      </div>
                    </Checkbox>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant='light' onPress={onClose} isDisabled={isSaving}>
                    Cancel
                  </Button>
                  <Button color='primary' onPress={handleUpdateFile} isDisabled={!uploadedFile} isLoading={isSaving}>
                    Upload & Update
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Documentation Modal */}
        <Modal isOpen={isDocsOpen} onOpenChange={setIsDocsOpen} size='5xl' scrollBehavior='inside'>
          <ModalContent className='h-[90vh]'>
            {onClose => (
              <>
                <ModalHeader className='flex flex-col gap-1'>Template Documentation</ModalHeader>
                <ModalBody className='p-0'>
                  <div className='flex h-full flex-col'>
                    <div className='w-full border-b border-default-200 bg-content2 p-4'>
                      <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5'>
                        {(
                          [
                            { id: 'variables', label: 'Variables', icon: 'lucide:type' },
                            { id: 'tables', label: 'Tables', icon: 'lucide:table' },
                            { id: 'image', label: 'Images', icon: 'lucide:image' },
                            { id: 'qrcode', label: 'QR Codes', icon: 'lucide:qr-code' },
                            { id: 'barcode', label: 'Barcodes', icon: 'lucide:barcode' },
                            { id: 'settings', label: 'File Settings', icon: 'lucide:settings' }
                          ] as const
                        ).map(item => (
                          <button
                            key={item.id}
                            onClick={() => setActiveDocsSection(item.id)}
                            className={cn(
                              'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                              activeDocsSection === item.id
                                ? 'bg-background text-primary shadow-sm'
                                : 'text-default-600 hover:bg-background/50 hover:text-foreground'
                            )}>
                            <Icon icon={item.icon} className='h-4 w-4' />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className='flex-1 overflow-y-auto p-6'>
                      <div className='prose prose-sm max-w-none'>
                        {activeDocsSection === 'variables' && <VariablesContent />}
                        {activeDocsSection === 'tables' && <TablesContent />}
                        {activeDocsSection === 'image' && <ImagesContent />}
                        {activeDocsSection === 'qrcode' && (
                          <div className='space-y-8'>
                            <QrCodesContent />
                          </div>
                        )}
                        {activeDocsSection === 'barcode' && <BarcodesContent />}
                        {activeDocsSection === 'settings' && <FileSettingsContent />}
                      </div>
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color='primary' onPress={onClose}>
                    Close
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    </div>
  )
}

export default TemplateSandboxPage
