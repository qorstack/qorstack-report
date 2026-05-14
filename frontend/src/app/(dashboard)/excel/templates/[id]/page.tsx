'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/api/generated/main-service'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
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
  Tooltip,
  Switch
} from '@heroui/react'
import Icon from '@/components/icon'
import { TemplateVersionResponse } from '@/api/generated/main-service/apiGenerated'
import { ExcelUiState, ExcelTableItem } from '@/types/excel-sandbox'
import { DeleteTemplateModal } from '@/components/pdf/DeleteTemplateModal'
import {
  ReplacementsSection,
  ImagesSection,
  QrCodesSection,
  BarcodesSection,
  generateId,
  formatKey
} from '@/components/excel/ExcelSandboxInputs'
import { ExcelTablesSection } from '@/components/excel/ExcelSandboxInputs'
import type { ImageItem, QrCodeItem, BarcodeItem } from '@/components/pdf/SandboxInputs'
import { CodeSwitcher } from '@/components/docs/CodeSwitcher'
import { getSdkCodeExamples } from '@/utils/code-gen'
import type { CodeExamples } from '@/utils/code-gen'
import ExcelPreviewDrawer from '@/components/excel/ExcelPreviewDrawer'
import { handleApiError } from '@/hooks/useApiError'
import { SectionHeader, KeyBadge, SegmentedTabs, CategoryNav } from '@/components/ui'
import dynamic from 'next/dynamic'

const PdfPreview = dynamic(() => import('@/components/pdf/PdfPreview'), {
  ssr: false,
  loading: () => (
    <div className='flex items-center gap-2 p-4'>
      <Spinner size='sm' color='primary' />
      <span className='text-sm text-default-500'>Loading Preview...</span>
    </div>
  )
})

// --- Default State ---
const DEFAULT_UI_STATE: ExcelUiState = {
  templateKey: '',
  fileName: 'My_Generated_Report',
  zipOutput: false,
  replace: [],
  table: [],
  image: [],
  qrcode: [],
  barcode: []
}

// --- Converters ---
const convertToUiState = (data: Record<string, unknown>, templateKey: string): ExcelUiState => {
  const tableRaw = (data.table as Record<string, unknown>[] | undefined) || []
  return {
    templateKey,
    fileName: (data.fileName as string) || 'My_Generated_Report',
    zipOutput: (data.zipOutput as boolean) || false,
    replace: Object.entries((data.replace as Record<string, string>) || {}).map(([key, value]) => ({
      id: generateId(),
      key: formatKey(key, 'replace'),
      value: value === null || value === undefined ? '' : String(value)
    })),
    table: tableRaw.map(t => {
      const rows = ((t.rows as Record<string, unknown>[]) || []).map(row => {
        const newRow: Record<string, string> = {}
        Object.entries(row).forEach(([k, v]) => {
          newRow[`{{row:${k}}}`] = v === null || v === undefined ? '' : String(v)
        })
        return newRow
      })
      // Prefer explicitly-saved column order; fall back to first row's key order
      const savedCols = (t.columns as string[]) || []
      const columns =
        savedCols.length > 0 ? savedCols.map(k => `{{row:${k}}}`) : rows.length > 0 ? Object.keys(rows[0]) : []
      return {
        id: generateId(),
        columns,
        rows,
        sort: (t.sort as ExcelTableItem['sort']) || [],
        verticalMerge: (t.verticalMerge as string[]) || [],
        collapse: (t.collapse as string[]) || [],
        freezeHeader: (t.freezeHeader as boolean) ?? false,
        autoFilter: (t.autoFilter as boolean) ?? false,
        autoFitColumns: (t.autoFitColumns as boolean) ?? false,
        outline: (t.outline as boolean) ?? false,
        generateTotals: (t.generateTotals as Record<string, string>) || undefined,
        numberFormat: (t.numberFormat as Record<string, string>) || undefined,
        conditionalFormat: (t.conditionalFormat as ExcelTableItem['conditionalFormat']) || undefined,
        splitToSheets: (t.splitToSheets as ExcelTableItem['splitToSheets']) || undefined
      }
    }),
    image: Object.entries((data.image as Record<string, unknown>) || {}).map(([key, val]) => ({
      id: generateId(),
      key: formatKey(key, 'image'),
      data: val as ImageItem['data']
    })),
    qrcode: Object.entries((data.qrcode as Record<string, unknown>) || {}).map(([key, val]) => ({
      id: generateId(),
      key: formatKey(key, 'qrcode'),
      data: val as QrCodeItem['data']
    })),
    barcode: Object.entries((data.barcode as Record<string, unknown>) || {}).map(([key, val]) => ({
      id: generateId(),
      key: formatKey(key, 'barcode'),
      data: val as BarcodeItem['data']
    }))
  }
}

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

const convertFromUiState = (state: ExcelUiState) => {
  return {
    templateKey: state.templateKey,
    fileName: state.fileName,
    zipOutput: state.zipOutput || false,
    replace: state.replace.reduce<Record<string, string>>(
      (acc, item) => ({ ...acc, [stripKey(item.key, 'replace')]: item.value }),
      {}
    ),
    table: state.table.map(item => {
      const rows = (item.rows || []).map(row => {
        const newRow: Record<string, unknown> = {}
        item.columns.forEach(colKey => {
          const cleanColKey = stripKey(colKey, 'table')
          newRow[cleanColKey] = row[colKey] || ''
        })
        return newRow
      })
      return {
        columns: item.columns.map(c => stripKey(c, 'table')),
        rows,
        sort: item.sort || [],
        verticalMerge: item.verticalMerge,
        collapse: item.collapse,
        freezeHeader: item.freezeHeader ?? false,
        autoFilter: item.autoFilter ?? false,
        autoFitColumns: item.autoFitColumns ?? false,
        outline: item.outline ?? false,
        generateTotals: item.generateTotals,
        numberFormat: item.numberFormat,
        conditionalFormat: item.conditionalFormat,
        splitToSheets: item.splitToSheets
      }
    }),
    image: state.image.reduce<Record<string, unknown>>(
      (acc, item) => ({ ...acc, [stripKey(item.key, 'image')]: item.data }),
      {}
    ),
    qrcode: state.qrcode.reduce<Record<string, unknown>>(
      (acc, item) => ({ ...acc, [stripKey(item.key, 'qrcode')]: item.data }),
      {}
    ),
    barcode: state.barcode.reduce<Record<string, unknown>>(
      (acc, item) => ({ ...acc, [stripKey(item.key, 'barcode')]: item.data }),
      {}
    )
  }
}

// --- Section Wrapper ---
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
  <div>
    <SectionHeader title={title} description={description} action={action} />
    {children}
  </div>
)

// --- Copy Button ---
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
      <button
        onClick={handleCopy}
        className='flex items-center justify-center text-default-400 transition-colors hover:text-foreground'>
        <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} className='h-3 w-3' />
      </button>
    </div>
  )
}

// --- Main Page ---
const ExcelSandboxPage = () => {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const templateKeyParam = params.id as string

  const [uiState, setUiState] = useState<ExcelUiState>(DEFAULT_UI_STATE)
  const [activeMainTab, setActiveMainTab] = useState<'builder' | 'code'>('builder')
  const [activeBuilderCategory, setActiveBuilderCategory] = useState<
    'text' | 'tables' | 'image' | 'qrcode' | 'barcode' | 'settings'
  >('text')

  const [isGenerating, setGenerating] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloadingSource, setIsDownloadingSource] = useState(false)

  const [previewFilePath, setPreviewFilePath] = useState<string | null>(null)

  const [templateName, setTemplateName] = useState('')
  const [templateKey, setTemplateKey] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [tempEditData, setTempEditData] = useState({ name: '', key: '' })
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)

  const [isUpdateFileOpen, setIsUpdateFileOpen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [versions, setVersions] = useState<TemplateVersionResponse[]>([])
  const [activeVersion, setActiveVersion] = useState<number | null>(null)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const fetchTemplateDetails = useCallback(async (key: string) => {
    setIsLoading(true)
    try {
      const template = await api.templates.getTemplateById(key)
      setTemplateName(template.name || '')
      setTemplateKey(template.templateKey || '')
      setLastUpdated(template.updatedDatetime ?? template.createdDatetime ?? null)
      setPreviewFilePath(template.activeVersion?.previewFilePathPresigned || null)

      if (template.allVersions && template.allVersions.length > 0) {
        setVersions(template.allVersions)
      } else if (template.activeVersion) {
        setVersions([template.activeVersion])
      }
      setActiveVersion(template.activeVersion?.version != null ? Number(template.activeVersion.version) : null)

      if (template.sandboxPayload) {
        try {
          const parsed = JSON.parse(template.sandboxPayload)
          setUiState(convertToUiState(parsed, template.templateKey || key))
        } catch {
          setUiState({ ...DEFAULT_UI_STATE, templateKey: template.templateKey || key })
        }
      } else {
        setUiState({ ...DEFAULT_UI_STATE, templateKey: template.templateKey || key })
      }
    } catch (err) {
      handleApiError(err, 'Failed to load template.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (templateKeyParam) {
      fetchTemplateDetails(templateKeyParam)
    }
  }, [templateKeyParam, fetchTemplateDetails])

  useEffect(() => {
    if (isEditOpen) {
      setTempEditData({ name: templateName, key: templateKey })
    }
  }, [isEditOpen, templateName, templateKey])

  const getExampleCode = (): CodeExamples => {
    const payload = convertFromUiState(uiState)
    ;(payload as Record<string, unknown>).templateKey = templateKey
    return getSdkCodeExamples(payload)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const payload = convertFromUiState(uiState)
      ;(payload as Record<string, unknown>).templateKey = templateKey

      const res = await api.render.excelTemplateCreate(payload as Parameters<typeof api.render.excelTemplateCreate>[0])
      if (res?.downloadUrl) {
        const link = document.createElement('a')
        link.href = res.downloadUrl
        link.download = `${uiState.fileName || 'output'}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      // The server already persists the sandbox payload (with base64→minio: conversion)
      // in ExportExcelCommandHandler. Do NOT save from frontend here — the frontend
      // payload still has raw base64 which would overwrite the server's clean version
      // and cause DB errors on next template update.
    } catch (err) {
      handleApiError(err, 'Generation failed. Please check your inputs.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveDetails = async () => {
    setIsSaving(true)
    try {
      const projectId = searchParams.get('projectId')
      const payload = convertFromUiState(uiState)
      ;(payload as Record<string, unknown>).templateKey = templateKey

      // Strip base64 image data before sending — it's too large for URL query params.
      // The server already has the minio: URLs from the last render; only send
      // non-image payload fields (replace, table, fileName, etc.).
      const safePayload = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>
      const stripBase64 = (obj: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(obj)) {
          if (typeof v === 'string' && v.startsWith('data:')) obj[k] = null
          else if (v && typeof v === 'object' && !Array.isArray(v)) stripBase64(v as Record<string, unknown>)
        }
      }
      stripBase64(safePayload)

      await api.templates.templatesUpdate(
        templateKey,
        {
          name: tempEditData.name,
          sandboxPayload: JSON.stringify(safePayload),
          project_id: projectId ?? undefined,
          isAutoGeneratedVariable: false
        },
        {}
      )
      setTemplateName(tempEditData.name)
      setIsEditOpen(false)
      fetchTemplateDetails(templateKey)
      addToast({ title: 'Success', description: 'Template saved successfully', color: 'success' })
    } catch (err) {
      handleApiError(err, 'Failed to save changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const generateKey = async () => {
    setIsGeneratingKey(true)
    try {
      const key = await api.templates.templateGenerateKeyList()
      setTempEditData(prev => ({ ...prev, key }))
    } catch (err) {
      handleApiError(err, 'Failed to generate template key.')
    } finally {
      setIsGeneratingKey(false)
    }
  }

  const handleVersionChange = async (version: number) => {
    try {
      await api.templates.switchVersionUpdate(templateKey, { version })
      fetchTemplateDetails(templateKey)
    } catch (err) {
      handleApiError(err, 'Failed to switch version.')
    }
  }

  const handleUpdateFile = async () => {
    if (!uploadedFile) return
    setIsSaving(true)
    try {
      const projectId = searchParams.get('projectId')
      // Do NOT send sandboxPayload when uploading a new file.
      // The server's UpdateTemplateCommandHandler reads the existing payload from DB
      // (which has clean minio: URLs) and syncs it with the new file's markers.
      // Sending the frontend payload here would include raw base64 image data
      // that's too large for URL query params and would overwrite the clean version.
      await api.templates.templatesUpdate(
        templateKey,
        {
          name: templateName,
          project_id: projectId ?? undefined,
          isAutoGeneratedVariable: true
        },
        { file: uploadedFile }
      )
      addToast({ title: 'Success', description: 'Template file updated successfully', color: 'success' })
      setIsUpdateFileOpen(false)
      setUploadedFile(null)
      fetchTemplateDetails(templateKey)
    } catch (err) {
      handleApiError(err, 'Failed to update file.')
    } finally {
      setIsSaving(false)
    }
  }

  const validateAndSetFile = (file: File) => {
    const valid = ['.xlsx', '.xls']
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!valid.includes(ext)) {
      addToast({ title: 'Invalid file type', description: 'Please upload an .xlsx or .xls file', color: 'danger' })
      return
    }
    setUploadedFile(file)
  }

  if (isLoading) {
    return (
      <div className='flex h-[calc(100vh-210px)] items-center justify-center bg-content1'>
        <Spinner size='lg' />
      </div>
    )
  }

  return (
    <div className='dashboard-panel flex flex-col font-sans text-foreground'>
      {/* Header */}
      <div className='dashboard-header flex-none md:flex-nowrap'>
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
            <div className='flex items-center gap-2.5'>
              <h1 className='truncate text-[17px] font-bold tracking-tight text-foreground'>{templateName}</h1>
              <KeyBadge value={templateKey} />

              <Popover isOpen={isEditOpen} onOpenChange={setIsEditOpen} placement='bottom-start' showArrow offset={10}>
                <PopoverTrigger>
                  <Button
                    isIconOnly
                    size='sm'
                    variant='light'
                    radius='md'
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
                          className='bg-content3 text-default-600'
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
              <span className='inline-flex items-center gap-1 rounded-md bg-success-50 px-1.5 py-0.5 font-label text-[10px] font-bold uppercase tracking-wider text-success-700 dark:bg-success-100/20 dark:text-success-500'>
                <Icon icon='lucide:file-spreadsheet' className='h-3 w-3' />
                Excel
              </span>
              <span className='flex items-center gap-1.5'>
                <Icon icon='lucide:clock' className='h-3 w-3' />
                <span>Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleDateString() : '—'}</span>
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
              if (projectId) router.push(`/project/${projectId}/excel-templates`)
              else router.push('/')
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
                if (res?.url) {
                  const link = document.createElement('a')
                  link.href = res.url
                  link.download = `${templateName}_v${activeVersion || 'latest'}.xlsx`
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                } else {
                  addToast({ title: 'Error', description: 'Download URL not found', color: 'danger' })
                }
              } catch (err) {
                handleApiError(err, 'Failed to download template.')
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
                      <p>version {v.version}</p>
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
            color='primary'
            size='sm'
            radius='md'
            className='h-9 flex-1 px-4 text-[12px] font-bold sm:flex-none sm:px-5'
            isLoading={isGenerating}
            onPress={handleGenerate}
            startContent={!isGenerating && <Icon icon='lucide:zap' className='h-3.5 w-3.5' />}>
            Generate Excel
          </Button>
        </div>
      </div>

      {/* Main Content Area - Split Panel (mirrors PDF page) */}
      <div className='flex flex-col gap-3 p-3 lg:flex-row lg:items-start lg:p-4'>
        {/* Left Panel: Builder (58%) */}
        <div className='builder-shell flex w-full flex-col rounded-2xl lg:w-[58%]'>
          <div className='px-4 pt-2 md:px-5'>
            <SegmentedTabs
              active={activeMainTab}
              onChange={setActiveMainTab}
              items={
                [
                  { id: 'builder', label: 'Builder UI', icon: 'lucide:layout' },
                  { id: 'code', label: 'Integration Code', icon: 'lucide:code' }
                ] as const
              }
            />
          </div>

          {activeMainTab === 'builder' && (
            <div className='flex flex-col gap-3 px-4 pb-5 pt-1 md:flex-row md:px-5'>
              <CategoryNav
                className=''
                active={activeBuilderCategory}
                onChange={setActiveBuilderCategory}
                items={
                  [
                    { id: 'text', icon: 'lucide:type', label: 'Variables', count: uiState.replace.length },
                    { id: 'tables', icon: 'lucide:table', label: 'Tables', count: uiState.table.length },
                    { id: 'image', icon: 'lucide:image', label: 'Images', count: uiState.image.length },
                    { id: 'qrcode', icon: 'lucide:qr-code', label: 'QR Codes', count: uiState.qrcode.length },
                    { id: 'barcode', icon: 'lucide:barcode', label: 'Barcodes', count: uiState.barcode.length },
                    {
                      id: 'settings',
                      icon: 'lucide:settings',
                      label: 'File Settings',
                      section: 'config',
                      count: uiState.zipOutput ? 1 : 0
                    }
                  ] as const
                }
              />

              {/* Section content */}
              <div className='min-w-0 flex-1 p-1'>
                <>
                  {activeBuilderCategory === 'text' && (
                    <SectionWrapper
                      title='Text Replacements'
                      description='Define variables to replace in your template.'
                      action={
                        <Button
                          size='sm'
                          color='primary'
                          variant='flat'
                          onPress={() =>
                            setUiState(p => ({
                              ...p,
                              replace: [...p.replace, { id: generateId(), key: '', value: '' }]
                            }))
                          }
                          startContent={<Icon icon='lucide:plus' className='h-4 w-4' />}>
                          Add Variable
                        </Button>
                      }>
                      <ReplacementsSection
                        items={uiState.replace}
                        onChange={d => setUiState(p => ({ ...p, replace: d }))}
                      />
                    </SectionWrapper>
                  )}

                  {activeBuilderCategory === 'tables' && (
                    <SectionWrapper
                      title='Tables'
                      description='Manage tabular data with Excel-specific formatting options.'
                      action={
                        <Button
                          size='sm'
                          color='primary'
                          variant='flat'
                          onPress={() =>
                            setUiState(p => ({
                              ...p,
                              table: [...p.table, { id: generateId(), columns: [], rows: [] }]
                            }))
                          }
                          startContent={<Icon icon='lucide:plus' className='h-4 w-4' />}>
                          Add Table
                        </Button>
                      }>
                      <ExcelTablesSection items={uiState.table} onChange={d => setUiState(p => ({ ...p, table: d }))} />
                    </SectionWrapper>
                  )}

                  {activeBuilderCategory === 'image' && (
                    <SectionWrapper
                      title='Images'
                      description='Upload or link images.'
                      action={
                        <Button
                          size='sm'
                          color='primary'
                          variant='flat'
                          onPress={() =>
                            setUiState(p => ({
                              ...p,
                              image: [...p.image, { id: generateId(), key: '', data: { src: '', fit: 'cover' } }]
                            }))
                          }
                          startContent={<Icon icon='lucide:plus' className='h-4 w-4' />}>
                          Add Image
                        </Button>
                      }>
                      <ImagesSection items={uiState.image} onChange={d => setUiState(p => ({ ...p, image: d }))} />
                    </SectionWrapper>
                  )}

                  {activeBuilderCategory === 'qrcode' && (
                    <SectionWrapper
                      title='QR Codes'
                      description='Generate QR codes from text.'
                      action={
                        <Button
                          size='sm'
                          color='primary'
                          variant='flat'
                          onPress={() =>
                            setUiState(p => ({
                              ...p,
                              qrcode: [...p.qrcode, { id: generateId(), key: '', data: { text: '' } }]
                            }))
                          }
                          startContent={<Icon icon='lucide:plus' className='h-4 w-4' />}>
                          Add QR
                        </Button>
                      }>
                      <QrCodesSection items={uiState.qrcode} onChange={d => setUiState(p => ({ ...p, qrcode: d }))} />
                    </SectionWrapper>
                  )}

                  {activeBuilderCategory === 'barcode' && (
                    <SectionWrapper
                      title='Barcodes'
                      description='Generate barcodes.'
                      action={
                        <Button
                          size='sm'
                          color='primary'
                          variant='flat'
                          onPress={() =>
                            setUiState(p => ({
                              ...p,
                              barcode: [
                                ...p.barcode,
                                {
                                  id: generateId(),
                                  key: '',
                                  data: { text: '', format: 'Code128', width: 200, height: 50, includeText: true }
                                }
                              ]
                            }))
                          }
                          startContent={<Icon icon='lucide:plus' className='h-4 w-4' />}>
                          Add Barcode
                        </Button>
                      }>
                      <BarcodesSection
                        items={uiState.barcode}
                        onChange={d => setUiState(p => ({ ...p, barcode: d }))}
                      />
                    </SectionWrapper>
                  )}

                  {activeBuilderCategory === 'settings' && (
                    <SectionWrapper
                      title='File Settings'
                      description='Configure output file name and download options.'>
                      <div className='flex flex-col gap-5'>
                        {/* File Name */}
                        <div className='flex flex-col gap-1.5'>
                          <label className='text-sm font-semibold text-foreground'>Output File Name</label>
                          <Input
                            value={uiState.fileName || ''}
                            onValueChange={v => setUiState(p => ({ ...p, fileName: v }))}
                            placeholder='My_Generated_Report'
                            size='sm'
                            variant='bordered'
                            classNames={{ inputWrapper: 'bg-content1 shadow-none border-1' }}
                            endContent={<span className='text-xs text-default-400'>.xlsx</span>}
                            startContent={<Icon icon='lucide:file-spreadsheet' className='h-4 w-4 text-default-400' />}
                          />
                          <p className='text-xs text-default-400'>The file name for the generated Excel output.</p>
                        </div>

                        {/* ZIP Output */}
                        <div className='ring-hairline flex items-center justify-between rounded-lg bg-content2 p-3'>
                          <div className='flex items-center gap-3'>
                            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-default-100'>
                              <Icon icon='lucide:archive' className='h-4 w-4 text-default-600' />
                            </div>
                            <div>
                              <p className='text-sm font-semibold text-foreground'>Download as ZIP</p>
                              <p className='text-xs text-default-500'>Wrap the .xlsx file in a .zip archive</p>
                            </div>
                          </div>
                          <Switch
                            isSelected={!!uiState.zipOutput}
                            onValueChange={v => setUiState(p => ({ ...p, zipOutput: v }))}
                            size='sm'
                          />
                        </div>
                      </div>
                    </SectionWrapper>
                  )}
                </>
              </div>
            </div>
          )}

          {activeMainTab === 'code' && (
            <div className='p-3 md:p-4'>
              <CodeSwitcher
                examples={getExampleCode()}
                title='Integration Code'
                defaultLanguage='api'
                isDisableMarginY={true}
              />
            </div>
          )}
        </div>

        {/* Right Panel: Preview */}
        <div className='builder-shell relative flex w-full flex-col overflow-hidden rounded-2xl bg-content1 lg:sticky lg:top-0 lg:h-[calc(100vh-180px)] lg:w-[42%]'>
          <div className='flex shrink-0 items-center border-b border-default-200/70 px-4 py-2.5 dark:border-white/10'>
            <div className='flex items-center gap-2'>
              <Icon icon='lucide:file-spreadsheet' className='h-4 w-4 text-default-500' />
              <span className='text-[13px] font-bold tracking-tight text-foreground'>Template Preview</span>
            </div>
            <button
              onClick={() => setIsExpanded(true)}
              className='ml-auto rounded-md bg-content2 p-1.5 text-default-500 transition-all duration-200 hover:bg-content3 hover:text-foreground'
              title='Full Screen Preview'>
              <Icon icon='lucide:maximize-2' className='h-3.5 w-3.5' />
            </button>
          </div>

          <div className='no-scrollbar flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-content2/35 p-4'>
            {previewFilePath ? (
              <div className='w-full transition-all duration-300'>
                <div className='mb-3 flex items-center gap-2 rounded-md bg-content2/70 px-3 py-2 text-[10.5px] text-default-600 ring-1 ring-default-200/70 dark:ring-white/10'>
                  <Icon icon='lucide:info' className='h-3.5 w-3.5 shrink-0 text-default-500' />
                  <span>Source preview. Generate Excel to inspect the rendered output file.</span>
                </div>
                <PdfPreview
                  file={previewFilePath}
                  fileName={`${templateName}_template_v${activeVersion ?? 'latest'}.pdf`}
                  loading={<Skeleton className='h-full min-h-[500px] w-full' />}
                  className='flex flex-col gap-4'
                  noBorder
                  minimal
                />
              </div>
            ) : (
              <div className='flex min-h-[280px] w-full flex-col items-center justify-center p-8 text-center'>
                <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-content2'>
                  <Icon icon='lucide:file-spreadsheet' className='h-8 w-8 text-default-500' />
                </div>
                <h3 className='font-semibold text-foreground'>No Preview Available</h3>
                <p className='max-w-xs text-xs text-default-400'>
                  Re-upload the template file to regenerate the preview.
                </p>
              </div>
            )}
          </div>

          <ExcelPreviewDrawer
            isOpen={isExpanded}
            onClose={() => setIsExpanded(false)}
            file={previewFilePath ?? ''}
            fileName={`${templateName}_template_v${activeVersion ?? 'latest'}.pdf`}
            format='pdf'
            mode='template'
          />
        </div>
      </div>

      {/* Update File Modal */}
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
                      ? 'border-primary bg-primary/5'
                      : uploadedFile
                        ? 'border-primary/50 bg-content2'
                        : 'border-default-300 bg-content2 hover:border-primary hover:bg-primary/5',
                    isSaving && 'pointer-events-none opacity-50'
                  )}
                  onDrop={e => {
                    e.preventDefault()
                    setIsDragOver(false)
                    if (e.dataTransfer.files[0]) validateAndSetFile(e.dataTransfer.files[0])
                  }}
                  onDragOver={e => {
                    e.preventDefault()
                    setIsDragOver(true)
                  }}
                  onDragLeave={e => {
                    e.preventDefault()
                    setIsDragOver(false)
                  }}
                  onClick={() => !isSaving && fileInputRef.current?.click()}>
                  <input
                    ref={fileInputRef}
                    type='file'
                    className='hidden'
                    accept='.xlsx,.xls'
                    onChange={e => {
                      if (e.target.files?.[0]) validateAndSetFile(e.target.files[0])
                    }}
                  />
                  {uploadedFile ? (
                    <div className='flex flex-col items-center text-center'>
                      <div className='mb-3 flex h-12 w-12 shrink-0 items-center justify-center border border-success bg-success text-white shadow-sm'>
                        <Icon icon='lucide:file-spreadsheet' className='h-6 w-6' />
                      </div>
                      <p className='text-base font-bold text-foreground'>{uploadedFile.name}</p>
                      <p className='text-xs font-medium text-default-500'>{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setUploadedFile(null)
                        }}
                        disabled={isSaving}
                        className='mt-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-default-400 hover:text-danger disabled:pointer-events-none disabled:opacity-50'>
                        <Icon icon='lucide:x' className='h-3.5 w-3.5' /> Remove File
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className='mb-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-content2'>
                        <Icon icon='lucide:upload-cloud' className='h-8 w-8 text-default-400' />
                      </div>
                      <div className='text-center'>
                        <p className='text-lg font-bold text-foreground'>Click to upload or drag and drop</p>
                        <p className='mt-1 text-xs font-medium text-default-500'>XLSX files only</p>
                      </div>
                    </>
                  )}
                </div>
                <div className='rounded-md bg-primary/5 px-3 py-2.5'>
                  <div className='flex items-center gap-2'>
                    <Icon icon='lucide:scan-search' className='h-6 w-6 shrink-0 text-primary' />
                    <div>
                      <p className='text-sm font-medium text-foreground'>Auto-detect variables</p>
                      <p className='text-xs text-default-500'>
                        Variables like <code className='font-mono'>{`{{name}}`}</code> will be detected from the file
                        and added to the builder automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant='flat' onPress={onClose}>
                  Cancel
                </Button>
                <Button color='primary' isDisabled={!uploadedFile} isLoading={isSaving} onPress={handleUpdateFile}>
                  Update Template
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}

export default ExcelSandboxPage
