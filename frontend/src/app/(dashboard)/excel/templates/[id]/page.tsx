'use client'

import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/api/generated/main-service'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRouteParams } from '@/hooks/use-route-params'
import { Input, Spinner, Skeleton, addToast, cn, Switch } from '@heroui/react'
import Icon from '@/components/icon'
import { TemplateVersionResponse } from '@/api/generated/main-service/apiGenerated'
import { ExcelUiState, ExcelTableItem } from '@/types/excel-sandbox'
import { toExcelRenderRequest } from '@/utils/keyed-request'
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
import { downloadFileFromUrl } from '@/utils/download-file'
import { CategoryNav } from '@/components/ui'
import {
  AutoPreviewSwitch,
  BuilderPanel,
  BuilderSection,
  BuilderSplit,
  DownloadResultButton,
  EndpointHint,
  GenerateButton,
  HeadTabs,
  PanelHead,
  PreviewCanvas,
  PreviewEmpty,
  PreviewNotice,
  PreviewOpenButton,
  ValidationSummary,
  FieldsSourceNote,
  FieldChangesNotice,
  isSingleColumnLayout,
  type FieldChanges
} from '@/components/template-editor/BuilderLayout'
import {
  TestDataSaveIndicator,
  toStorablePayload,
  useTestDataAutosave
} from '@/components/template-editor/test-data-autosave'
import { diffFields, fieldMarkers, savedEntries, savedTables } from '@/components/template-editor/field-changes'
import {
  focusWhenRendered,
  mapRenderErrors,
  readValidationErrors,
  type MappedError
} from '@/components/template-editor/api-errors'
import { fieldClasses, settingsCard } from '@/components/template-editor/field-styles'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useUpgradeGate } from '@/hooks/use-upgrade-gate'
import { useLivePreview } from '@/hooks/use-live-preview'
import { useResizablePanel } from '@/hooks/use-resizable-panel'
import { TemplateHeaderPortals, UpdateFileModal } from '@/components/templates'

const PdfPreview = dynamic(() => import('@/components/pdf/PdfPreview'), {
  ssr: false,
  loading: () => (
    <div className='flex items-center gap-2 p-4'>
      <Spinner size='sm' color='default' />
      <span className='text-[14px] text-default-500'>Loading preview…</span>
    </div>
  )
})

const ExcelPreview = dynamic(() => import('@/components/excel/ExcelPreview'), {
  ssr: false,
  loading: () => <Skeleton className='h-full min-h-[500px] w-full' />
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
  const tableRaw = savedTables<Record<string, unknown>>(data.table)
  return {
    templateKey,
    fileName: (data.fileName as string) || 'My_Generated_Report',
    zipOutput: (data.zipOutput as boolean) || false,
    replace: savedEntries(data.replace).map(([key, value]) => ({
      id: generateId(),
      key: formatKey(key, 'replace'),
      value: value === null || value === undefined ? '' : String(value)
    })),
    table: tableRaw.map(t => {
      const rows = (Array.isArray(t.rows) ? (t.rows as unknown[]) : []).map(row => {
        const newRow: Record<string, string> = {}
        savedEntries(row).forEach(([k, v]) => {
          newRow[`{{row:${k}}}`] = v === null || v === undefined ? '' : String(v)
        })
        return newRow
      })
      // Prefer explicitly-saved column order; fall back to first row's key order
      const savedCols = Array.isArray(t.columns)
        ? (t.columns as unknown[]).filter((c): c is string => typeof c === 'string' && c.trim() !== '')
        : []
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
    image: savedEntries(data.image, true).map(([key, val]) => ({
      id: generateId(),
      key: formatKey(key, 'image'),
      data: val as ImageItem['data']
    })),
    qrcode: savedEntries(data.qrcode, true).map(([key, val]) => ({
      id: generateId(),
      key: formatKey(key, 'qrcode'),
      data: val as QrCodeItem['data']
    })),
    barcode: savedEntries(data.barcode, true).map(([key, val]) => ({
      id: generateId(),
      key: formatKey(key, 'barcode'),
      data: val as BarcodeItem['data']
    }))
  }
}

const stripKey = (key: string | null | undefined, type: 'replace' | 'table' | 'image' | 'qrcode' | 'barcode') => {
  if (key == null) return ''
  let k = String(key).replace(/^\{\{/, '').replace(/\}\}$/, '')
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
  const hasObjectValues = (value?: Record<string, unknown>) => !!value && Object.keys(value).length > 0

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

      const tablePayload: Record<string, unknown> = {
        columns: item.columns.map(c => stripKey(c, 'table')),
        rows
      }

      if (item.sort?.length) tablePayload.sort = item.sort
      if (item.verticalMerge?.length) tablePayload.verticalMerge = item.verticalMerge
      if (item.collapse?.length) tablePayload.collapse = item.collapse
      if (item.freezeHeader) tablePayload.freezeHeader = true
      if (item.autoFilter) tablePayload.autoFilter = true
      if (item.autoFitColumns) tablePayload.autoFitColumns = true
      if (item.outline) tablePayload.outline = true
      if (hasObjectValues(item.generateTotals)) tablePayload.generateTotals = item.generateTotals
      if (hasObjectValues(item.numberFormat)) tablePayload.numberFormat = item.numberFormat
      if (item.conditionalFormat?.length) tablePayload.conditionalFormat = item.conditionalFormat
      if (item.splitToSheets?.field) tablePayload.splitToSheets = item.splitToSheets
      if (item.excelTableStyle) tablePayload.excelTableStyle = item.excelTableStyle

      return tablePayload
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

// --- Main Page ---
const ExcelSandboxPage = () => {
  const router = useRouter()
  const params = useRouteParams()
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
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [generatedPdfPreviewUrl, setGeneratedPdfPreviewUrl] = useState<string | null>(null)
  const [generatedSheetPageMap, setGeneratedSheetPageMap] = useState<Record<string, number> | null>(null)
  const [generatedSheetPdfUrlMap, setGeneratedSheetPdfUrlMap] = useState<Record<string, string> | null>(null)
  const [activeSheetName, setActiveSheetName] = useState<string | null>(null)
  const [generatedIsZip, setGeneratedIsZip] = useState(false)
  const [generatedZipUrl, setGeneratedZipUrl] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'before' | 'after'>('before')

  const [templateName, setTemplateName] = useState('')
  const [templateKey, setTemplateKey] = useState('')
  const [_lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [tempEditData, setTempEditData] = useState({ name: '', key: '' })
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)

  const [isUpdateFileOpen, setIsUpdateFileOpen] = useState(false)

  const [versions, setVersions] = useState<TemplateVersionResponse[]>([])
  const [activeVersion, setActiveVersion] = useState<number | null>(null)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [liveMode, setLiveMode] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [errorSummary, setErrorSummary] = useState<MappedError[]>([])
  /** What the last Replace file changed in the field list. */
  const [fieldChanges, setFieldChanges] = useState<FieldChanges | null>(null)
  const [loadError, setLoadError] = useState(false)
  /** Version shown in the preview / rendered by Generate. null = the current version. */
  const [previewVersion, setPreviewVersion] = useState<number | null>(null)

  const clearValidationError = (id: string) =>
    setValidationErrors(prev => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  const { requireFeature, gateModal } = useUpgradeGate()
  const {
    width: panelWidth,
    handleMouseDown: handlePanelResize,
    handleKeyDown: handlePanelResizeKey,
    minWidth: panelMinWidth,
    maxWidth: panelMaxWidth
  } = useResizablePanel('builder-panel-width-excel', 640)

  const handleLiveModeToggle = () => {
    setLiveMode(v => {
      const next = !v
      if (!next) setPreviewMode('before')
      return next
    })
  }

  // fetchTemplateDetails is memoised before the autosave hook exists — reach markSaved through a ref.
  const markTestDataSavedRef = useRef<(state: ExcelUiState) => void>(() => {})

  const fetchTemplateDetails = useCallback(async (key: string): Promise<ExcelUiState | null> => {
    let loaded: ExcelUiState | null = null
    setIsLoading(true)
    setLoadError(false)
    try {
      const template = await api.templates.getTemplateById(key)
      setTemplateName(template.name || '')
      setTemplateKey(template.templateKey || '')
      setLastUpdated(template.updatedDatetime ?? template.createdDatetime ?? null)
      setPreviewFilePath(template.activeVersion?.previewFilePathPresigned || null)

      // Sheet names, used to label the last result's sheets.
      let loadedSheetMap: Record<string, number> | null = null
      try {
        const sheetMap = await api.templates.getTemplateSheets(key)
        if (sheetMap && Object.keys(sheetMap).length > 0) loadedSheetMap = sheetMap
      } catch {
        loadedSheetMap = null
      }

      if (template.fileSandboxLastTestPresigned) {
        setGeneratedUrl(template.fileSandboxLastTestPresigned)
      } else {
        setGeneratedUrl(null)
      }

      const pdfPreviewPresigned = template.activeVersion?.sandboxPdfPreviewPresigned ?? null
      setGeneratedPdfPreviewUrl(null) // only used as legacy fallback

      // Parse per-sheet PDF URL map from stored JSON
      let restoredSheetPdfUrlMap: Record<string, string> | null = null
      if (pdfPreviewPresigned) {
        try {
          const parsed = JSON.parse(pdfPreviewPresigned)
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            restoredSheetPdfUrlMap = parsed as Record<string, string>
          }
        } catch {
          // legacy single URL — wrap as single-entry map using first sheet name
          if (loadedSheetMap) {
            const firstName = Object.keys(loadedSheetMap)[0]
            if (firstName) restoredSheetPdfUrlMap = { [firstName]: pdfPreviewPresigned }
          }
        }
      }
      setGeneratedSheetPdfUrlMap(restoredSheetPdfUrlMap)
      setGeneratedSheetPageMap(null)

      if (restoredSheetPdfUrlMap) {
        const firstSheet = Object.keys(restoredSheetPdfUrlMap)[0] ?? null
        setActiveSheetName(firstSheet)
      } else {
        setActiveSheetName(null)
      }
      setPreviewMode('before')

      if (template.allVersions && template.allVersions.length > 0) {
        setVersions(template.allVersions)
      } else if (template.activeVersion) {
        setVersions([template.activeVersion])
      }
      setActiveVersion(template.activeVersion?.version != null ? Number(template.activeVersion.version) : null)

      if (template.sandboxPayload) {
        try {
          const parsed = JSON.parse(template.sandboxPayload)
          loaded = convertToUiState(parsed, template.templateKey || key)
        } catch {
          loaded = { ...DEFAULT_UI_STATE, templateKey: template.templateKey || key }
        }
      } else {
        loaded = { ...DEFAULT_UI_STATE, templateKey: template.templateKey || key }
      }
      setUiState(loaded)
      markTestDataSavedRef.current(loaded)
    } catch (err) {
      setLoadError(true)
      handleApiError(err, 'Failed to load template.')
    } finally {
      setIsLoading(false)
    }
    return loaded
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
    return getSdkCodeExamples(payload, { documentType: 'excel' })
  }

  const showRenderErrors = (err: unknown): boolean => {
    const raw = readValidationErrors(err)
    if (!raw) return false
    const mapped = mapRenderErrors(raw, uiState)
    setValidationErrors(mapped.fieldErrors)
    setErrorSummary(mapped.summary)
    const first = mapped.summary[0]
    if (first) {
      setActiveMainTab('builder')
      setActiveBuilderCategory(first.category)
      focusWhenRendered(first.focusId)
    }
    return true
  }

  const jumpToError = (e: MappedError) => {
    setActiveMainTab('builder')
    setActiveBuilderCategory(e.category)
    focusWhenRendered(e.focusId)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setValidationErrors({})
    setErrorSummary([])
    try {
      const payload = convertFromUiState(uiState)
      const res = await api.render.excelTemplateCreate({
        ...toExcelRenderRequest({ ...payload, templateKey }),
        ...(previewVersion != null ? { templateVersion: previewVersion } : {})
      })
      if (res?.downloadUrl) {
        const isZip = res.isZipped || res.fileType === 'zip'
        setPreviewMode('after')
        if (isZip) {
          setGeneratedIsZip(true)
          setGeneratedZipUrl(res.downloadUrl)
          setGeneratedUrl(null)
          setGeneratedPdfPreviewUrl(null)
          setGeneratedSheetPageMap(null)
        } else {
          setGeneratedIsZip(false)
          setGeneratedZipUrl(null)
          setGeneratedUrl(res.downloadUrl)
          setGeneratedPdfPreviewUrl(res.pdfPreviewUrl ?? null)
          const newPdfMap = res.sheetPdfUrlMap ?? null
          const newPageMap = res.sheetPageMap ?? null
          setGeneratedSheetPdfUrlMap(newPdfMap)
          setGeneratedSheetPageMap(newPageMap)
          const firstSheet = newPdfMap ? Object.keys(newPdfMap)[0] : newPageMap ? Object.keys(newPageMap)[0] : null
          setActiveSheetName(firstSheet ?? null)
          // Below lg the preview panel is hidden — show the result in the drawer.
          if (isSingleColumnLayout()) setIsExpanded(true)
        }
      }

      // The server already persists the sandbox payload (with base64→minio: conversion)
      // in ExportExcelCommandHandler. Do NOT save from frontend here — the frontend
      // payload still has raw base64 which would overwrite the server's clean version
      // and cause DB errors on next template update. A pinned older version is not persisted.
      if (previewVersion == null) markTestDataSaved(uiState)
    } catch (err) {
      if (!showRenderErrors(err)) handleApiError(err, 'Generation failed. Please check your inputs.')
    } finally {
      setGenerating(false)
    }
  }

  const { isRendering: isLivePreviewRendering, error: livePreviewError } = useLivePreview({
    templateKey,
    uiState,
    enabled: liveMode,
    isLoading,
    render: async (state, signal) => {
      const payload = convertFromUiState(state)
      return api.render.excelTemplateCreate(toExcelRenderRequest({ ...payload, templateKey }), {
        signal
      })
    },
    onRender: res => {
      setGeneratedUrl(res.downloadUrl)
      setGeneratedPdfPreviewUrl(res.pdfPreviewUrl ?? null)
      setGeneratedSheetPdfUrlMap(res.sheetPdfUrlMap ?? null)
      setGeneratedSheetPageMap(res.sheetPageMap ?? null)
      setPreviewMode('after')
    }
  })

  // Auto-preview already stores the test values with every render, so autosave pauses while it is on.
  const {
    status: testDataStatus,
    markSaved: markTestDataSaved,
    retry: retryTestDataSave
  } = useTestDataAutosave({
    templateKey,
    state: uiState,
    serialize: convertFromUiState,
    enabled: !isLoading && !loadError && !(liveMode)
  })
  useEffect(() => {
    markTestDataSavedRef.current = markTestDataSaved
  }, [markTestDataSaved])

  const handleSaveDetails = async () => {
    setIsSaving(true)
    try {
      const projectId = searchParams.get('projectId')
      const trimmedKey = tempEditData.key.trim()
      const keyChanged = !!trimmedKey && trimmedKey !== templateKey
      const effectiveKey = keyChanged ? trimmedKey : templateKey

      const payload = convertFromUiState(uiState)
      ;(payload as Record<string, unknown>).templateKey = effectiveKey

      // Inline base64 images are too large for the query string — keep the stored file URLs instead.
      const sandboxPayload = await toStorablePayload(templateKey, payload)

      await api.templates.templatesUpdate(
        templateKey,
        {
          name: tempEditData.name,
          newTemplateKey: keyChanged ? trimmedKey : undefined,
          sandboxPayload,
          project_id: projectId ?? undefined,
          isAutoGeneratedVariable: false
        },
        {}
      )
      markTestDataSaved(uiState)
      setTemplateName(tempEditData.name)
      setIsEditOpen(false)
      addToast({ title: 'Success', description: 'Template saved successfully', color: 'success' })

      if (keyChanged) {
        // The key is the route identifier — move to the new URL and reload from there.
        setTemplateKey(trimmedKey)
        const query = projectId ? `?projectId=${projectId}` : ''
        router.replace(`/excel/templates/${trimmedKey}${query}`)
      } else {
        fetchTemplateDetails(templateKey)
      }
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
      setPreviewVersion(null)
      fetchTemplateDetails(templateKey)
    } catch (err) {
      handleApiError(err, 'Failed to switch version.')
    }
  }

  const handleUpdateFile = async (file: File) => {
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
        { file }
      )
      const before = fieldMarkers(uiState)
      setIsUpdateFileOpen(false)
      const after = await fetchTemplateDetails(templateKey)
      if (after) {
        const changes = diffFields(before, fieldMarkers(after))
        setFieldChanges(changes)
        addToast({
          title: 'File replaced',
          description:
            changes.added.length || changes.removed.length
              ? `${changes.added.length} field(s) added, ${changes.removed.length} removed.`
              : 'Same fields as before.',
          color: 'success'
        })
      }
    } catch (err) {
      handleApiError(err, 'Failed to update file.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className='flex h-[calc(100vh-210px)] items-center justify-center border border-divider bg-content1'>
        <Spinner
          size='lg'
          color='default'
          label='Loading template…'
          classNames={{ label: 'text-[13px] text-default-500' }}
        />
      </div>
    )
  }

  // Never show the empty default editor as if it were this template's data.
  if (loadError) {
    return (
      <div className='flex h-[calc(100vh-210px)] flex-col items-center justify-center gap-3 border border-divider bg-content1 p-8 text-center'>
        <p className='text-[15px] font-semibold text-foreground'>This template could not be loaded</p>
        <p className='max-w-sm text-[13px] text-default-500'>
          Nothing was changed. Check your connection and try again.
        </p>
        <button
          type='button'
          onClick={() => fetchTemplateDetails(templateKeyParam)}
          className='h-9 border border-default-300 px-4 text-[13px] font-medium text-foreground hover:border-foreground'>
          Try again
        </button>
      </div>
    )
  }

  const viewedVersion = previewVersion != null ? versions.find(v => Number(v.version) === previewVersion) : undefined
  const sourcePreview = viewedVersion?.previewFilePathPresigned || previewFilePath
  const previewSrc = previewMode === 'after' ? generatedUrl : sourcePreview
  const isResultPreview = previewMode === 'after' && (!!generatedUrl || !!generatedSheetPdfUrlMap || generatedIsZip)

  const handleDownloadSource = async () => {
    setIsDownloadingSource(true)
    try {
      const res = await api.templates.downloadTemplate(templateKey)
      if (res?.url) {
        await downloadFileFromUrl(res.url, `${templateName}_v${activeVersion || 'latest'}.xlsx`)
      } else {
        addToast({ title: 'Error', description: 'Download URL not found', color: 'danger' })
      }
    } catch (err) {
      handleApiError(err, 'Failed to download template.')
    } finally {
      setIsDownloadingSource(false)
    }
  }

  const handleDownloadResult = () => {
    const baseName = uiState.fileName || templateName || 'output'
    if (generatedIsZip && generatedZipUrl) {
      void downloadFileFromUrl(generatedZipUrl, `${baseName}.zip`)
    } else if (generatedUrl) {
      void downloadFileFromUrl(generatedUrl, `${baseName}.xlsx`)
    }
  }

  const projectId = searchParams.get('projectId')
  const templatesHref = projectId ? `/project/${projectId}/templates` : '/project'
  const hasResult = (generatedIsZip && !!generatedZipUrl) || !!generatedUrl
  const resultFileBase = uiState.fileName || templateName || 'output'

  const sheetTabs = (names: string[], active: string | null, onSelect: (name: string) => void) =>
    names.length > 1 ? (
      <div
        role='tablist'
        aria-label='Sheets'
        className='no-scrollbar flex overflow-x-auto border-b border-divider bg-content1'>
        {names.map(name => (
          <button
            key={name}
            type='button'
            role='tab'
            aria-selected={active === name}
            onClick={() => onSelect(name)}
            className={cn(
              'flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[13px] transition-colors',
              active === name
                ? 'border-b-foreground text-foreground'
                : 'border-b-transparent text-default-500 hover:text-foreground'
            )}>
            <Icon icon='lucide:table-2' className='h-3.5 w-3.5' />
            {name}
          </button>
        ))}
      </div>
    ) : null

  const framed = (children: React.ReactNode) => (
    <div className='flex h-[calc(100vh-250px)] min-h-[420px] flex-col'>{children}</div>
  )

  const renderPreviewBody = () => {
    if (previewMode === 'after') {
      if (generatedIsZip && generatedZipUrl) {
        return (
          <PreviewEmpty
            icon='lucide:archive'
            title='ZIP file ready'
            hint='ZIP files can’t be shown here. Download it to open the Excel file inside.'
            action={<DownloadResultButton onPress={handleDownloadResult} label='Download ZIP' />}
          />
        )
      }
      if (generatedUrl || generatedSheetPdfUrlMap) {
        return (
          <>
            {liveMode ? (
              livePreviewError ? (
                <PreviewNotice tone='error'>{livePreviewError}</PreviewNotice>
              ) : isLivePreviewRendering ? (
                <PreviewNotice tone='busy'>Updating the preview…</PreviewNotice>
              ) : (
                <PreviewNotice tone='ok'>Showing your latest values.</PreviewNotice>
              )
            ) : (
              <PreviewNotice tone='ok'>This is the generated Excel file, shown as pages.</PreviewNotice>
            )}
            {liveMode && isLivePreviewRendering && !generatedUrl ? (
              <Skeleton className='h-full min-h-[500px] w-full' />
            ) : generatedSheetPdfUrlMap ? (
              framed(
                <>
                  {sheetTabs(Object.keys(generatedSheetPdfUrlMap), activeSheetName, setActiveSheetName)}
                  <PdfPreview
                    key={`${activeSheetName ?? 'default'}-${generatedSheetPdfUrlMap[activeSheetName ?? ''] ?? ''}`}
                    file={
                      generatedSheetPdfUrlMap[activeSheetName ?? ''] ??
                      generatedSheetPdfUrlMap[Object.keys(generatedSheetPdfUrlMap)[0]]
                    }
                    fileName={`${resultFileBase}_preview.pdf`}
                    loading={<Skeleton className='h-full min-h-[500px] w-full' />}
                    className='flex min-h-0 flex-1 flex-col'
                    noBorder
                    minimal
                    initialPage={0}
                    hideDownload
                  />
                </>
              )
            ) : generatedPdfPreviewUrl ? (
              framed(
                <>
                  {sheetTabs(
                    generatedSheetPageMap ? Object.keys(generatedSheetPageMap) : [],
                    activeSheetName,
                    setActiveSheetName
                  )}
                  <PdfPreview
                    key={`${generatedPdfPreviewUrl}-${activeSheetName ?? ''}`}
                    file={generatedPdfPreviewUrl}
                    fileName={`${resultFileBase}_preview.pdf`}
                    loading={<Skeleton className='h-full min-h-[500px] w-full' />}
                    className='flex min-h-0 flex-1 flex-col'
                    noBorder
                    minimal
                    initialPage={
                      activeSheetName && generatedSheetPageMap ? (generatedSheetPageMap[activeSheetName] ?? 1) - 1 : 0
                    }
                    pageRange={(() => {
                      if (!generatedSheetPageMap || !activeSheetName) return undefined
                      const sorted = Object.entries(generatedSheetPageMap).sort((a, b) => a[1] - b[1])
                      const idx = sorted.findIndex(([n]) => n === activeSheetName)
                      if (idx === -1) return undefined
                      const start = sorted[idx][1]
                      const end = idx + 1 < sorted.length ? sorted[idx + 1][1] - 1 : 9999
                      return [start, end] as [number, number]
                    })()}
                    hideDownload
                  />
                </>
              )
            ) : (
              framed(
                <div className='relative min-h-0 flex-1 overflow-hidden border border-divider bg-content1'>
                  <button
                    type='button'
                    onClick={() => setIsExpanded(true)}
                    className='absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center border border-default-300 bg-content1 text-default-500 transition-colors hover:border-foreground hover:text-foreground'
                    title='Full screen'
                    aria-label='Open full screen preview'>
                    <Icon icon='lucide:maximize-2' className='h-3.5 w-3.5' />
                  </button>
                  <ExcelPreview url={generatedUrl} fileName={`${resultFileBase}.xlsx`} mode='result' />
                </div>
              )
            )}
          </>
        )
      }
      return (
        <PreviewEmpty
          icon='lucide:zap'
          title='Nothing generated yet'
          hint='Fill in your fields, then press Generate Excel to see the finished file here.'
        />
      )
    }

    if (previewSrc) {
      return (
        <>
          {liveMode ? (
            livePreviewError ? (
              <PreviewNotice tone='error'>{livePreviewError}</PreviewNotice>
            ) : isLivePreviewRendering ? (
              <PreviewNotice tone='busy'>Updating the preview…</PreviewNotice>
            ) : (
              <PreviewNotice tone='ok'>Auto-preview is on. Edit a field and the preview updates.</PreviewNotice>
            )
          ) : (
            <PreviewNotice>
              {viewedVersion
                ? `Template file — version ${previewVersion} (not the current version). Generate renders this version.`
                : 'Template file. Values appear after you press Generate Excel (or turn on Auto-preview).'}
            </PreviewNotice>
          )}
          {framed(
            <PdfPreview
              key={sourcePreview ?? ''}
              file={sourcePreview ?? ''}
              fileName={`${templateName}_template_v${activeVersion ?? 'latest'}.pdf`}
              loading={<Skeleton className='h-full min-h-[500px] w-full' />}
              className='flex min-h-0 flex-1 flex-col'
              noBorder
              minimal
              hideDownload
            />
          )}
        </>
      )
    }

    return (
      <PreviewEmpty
        icon='lucide:file-spreadsheet'
        title='No preview yet'
        hint='Upload the Excel file again with Replace file (top right) to rebuild the preview.'
      />
    )
  }

  const fieldsPanel = (
    <BuilderPanel>
      <PanelHead>
        <HeadTabs
          ariaLabel='Builder view'
          active={activeMainTab}
          onChange={setActiveMainTab}
          items={[
            { id: 'builder', label: 'Fields' },
            { id: 'code', label: 'Code' }
          ]}
        />
        <div className='ml-auto flex items-center'>
          <TestDataSaveIndicator status={testDataStatus} onRetry={() => void retryTestDataSave()} />
          <EndpointHint path='/render/excel/template' />
        </div>
      </PanelHead>

      {activeMainTab === 'builder' && (
        <div className='flex w-full flex-col gap-4 p-4 md:p-5'>
          <FieldsSourceNote fileLabel='Excel' onReplaceFile={() => setIsUpdateFileOpen(true)} />
          {fieldChanges && <FieldChangesNotice changes={fieldChanges} onDismiss={() => setFieldChanges(null)} />}
          <CategoryNav
            layout='horizontal'
            active={activeBuilderCategory}
            onChange={setActiveBuilderCategory}
            items={
              [
                {
                  id: 'text',
                  icon: 'lucide:type',
                  label: 'Text fields',
                  count: uiState.replace.length,
                  hasError: errorSummary.some(e => e.category === 'text')
                },
                {
                  id: 'tables',
                  icon: 'lucide:table',
                  label: 'Tables',
                  count: uiState.table.length,
                  hasError: errorSummary.some(e => e.category === 'tables')
                },
                {
                  id: 'image',
                  icon: 'lucide:image',
                  label: 'Images',
                  count: uiState.image.length,
                  hasError: errorSummary.some(e => e.category === 'image')
                },
                {
                  id: 'qrcode',
                  icon: 'lucide:qr-code',
                  label: 'QR codes',
                  count: uiState.qrcode.length,
                  hasError: errorSummary.some(e => e.category === 'qrcode')
                },
                {
                  id: 'barcode',
                  icon: 'lucide:barcode',
                  label: 'Barcodes',
                  count: uiState.barcode.length,
                  hasError: errorSummary.some(e => e.category === 'barcode')
                },
                {
                  id: 'settings',
                  icon: 'lucide:settings',
                  label: 'Output settings',
                  section: 'config',
                  note: uiState.zipOutput ? 'Set' : undefined,
                  hasError: errorSummary.some(e => e.category === 'settings')
                }
              ] as const
            }
          />

          <div className='min-w-0'>
            <ValidationSummary
              items={errorSummary.map(e => ({ ...e, onJump: () => jumpToError(e) }))}
              onDismiss={() => setErrorSummary([])}
            />
            {activeBuilderCategory === 'text' && (
              <BuilderSection
                title='Text fields'
                description='Each {{name}} in your Excel file is replaced with the value you type here.'>
                <ReplacementsSection
                  fileLabel='Excel'
                  items={uiState.replace}
                  onChange={d => setUiState(p => ({ ...p, replace: d }))}
                  errors={validationErrors}
                  onClearError={clearValidationError}
                />
              </BuilderSection>
            )}

            {activeBuilderCategory === 'tables' && (
              <BuilderSection
                title='Tables'
                description='Rows that repeat in your sheet — one row per item, with Excel options like totals and filters.'>
                <ExcelTablesSection
                  items={uiState.table}
                  onChange={d => setUiState(p => ({ ...p, table: d }))}
                  errors={validationErrors}
                />
              </BuilderSection>
            )}

            {activeBuilderCategory === 'image' && (
              <BuilderSection
                title='Images'
                description='Each {{image:name}} is replaced with the picture you upload or link.'>
                <ImagesSection
                  fileLabel='Excel'
                  items={uiState.image}
                  onChange={d => setUiState(p => ({ ...p, image: d }))}
                  errors={validationErrors}
                  onClearError={clearValidationError}
                />
              </BuilderSection>
            )}

            {activeBuilderCategory === 'qrcode' && (
              <BuilderSection
                title='QR codes'
                description='Each {{qrcode:name}} becomes a QR code made from your text.'>
                <QrCodesSection
                  fileLabel='Excel'
                  items={uiState.qrcode}
                  onChange={d => setUiState(p => ({ ...p, qrcode: d }))}
                  errors={validationErrors}
                  onClearError={clearValidationError}
                />
              </BuilderSection>
            )}

            {activeBuilderCategory === 'barcode' && (
              <BuilderSection title='Barcodes' description='Each {{barcode:name}} becomes a Code128 or EAN13 barcode.'>
                <BarcodesSection
                  fileLabel='Excel'
                  items={uiState.barcode}
                  onChange={d => setUiState(p => ({ ...p, barcode: d }))}
                  errors={validationErrors}
                  onClearError={clearValidationError}
                />
              </BuilderSection>
            )}

            {activeBuilderCategory === 'settings' && (
              <BuilderSection title='Output settings' description='File name and ZIP download.'>
                <div className='flex flex-col gap-3'>
                  <div className={settingsCard}>
                    <div className='flex items-center gap-2'>
                      <Icon icon='lucide:file-output' className='h-4 w-4 text-default-500' aria-hidden />
                      <span className='text-[14px] font-semibold text-foreground'>File name</span>
                    </div>
                    <Input
                      aria-label='Output file name'
                      value={uiState.fileName || ''}
                      onValueChange={v => setUiState(p => ({ ...p, fileName: v }))}
                      placeholder='My_Generated_Report'
                      variant='bordered'
                      classNames={fieldClasses}
                      description='Used when the file is downloaded.'
                      endContent={<span className='font-mono text-[12px] text-default-500'>.xlsx</span>}
                    />
                  </div>

                  <div className={settingsCard}>
                    <div className='flex items-center justify-between gap-4'>
                      <div>
                        <p className='text-[14px] font-semibold text-foreground'>Download as ZIP</p>
                        <p className='mt-0.5 text-[13px] text-default-500'>
                          Put the generated file inside a <code className='font-mono'>.zip</code> archive.
                        </p>
                      </div>
                      <Switch
                        color='default'
                        aria-label='Download as ZIP'
                        isSelected={!!uiState.zipOutput}
                        onValueChange={v => {
                          if (v && !requireFeature('downloadAsZip')) return
                          setUiState(p => ({ ...p, zipOutput: v }))
                        }}
                        size='sm'
                      />
                    </div>
                  </div>
                </div>
              </BuilderSection>
            )}
          </div>
        </div>
      )}

      {activeMainTab === 'code' && (
        <div className='flex flex-col gap-3 p-4 md:p-5'>
          <p className='text-[13px] text-default-500'>
            Uses your current test values. The request needs an API key —{' '}
            <Link
              href={projectId ? `/project/${projectId}/api-keys` : '/api-keys'}
              className='text-foreground underline underline-offset-4 hover:text-default-600'>
              create one on the API key page
            </Link>
            .
          </p>
          <CodeSwitcher examples={getExampleCode()} title='Code' defaultLanguage='api' isDisableMarginY={true} />
        </div>
      )}
    </BuilderPanel>
  )

  const previewPanel = (
    <BuilderPanel className='h-full'>
      {/* One row: view tabs | auto-preview | download + generate (labels collapse to icons on narrow panels). */}
      <PanelHead className='flex-nowrap gap-1 pr-2'>
        <HeadTabs
          compact
          ariaLabel='Preview view'
          active={previewMode}
          onChange={setPreviewMode}
          items={[
            { id: 'before', label: 'Template', hint: 'Your template file (.xlsx)' },
            { id: 'after', label: 'Result', hint: 'The last generated file (.xlsx)' }
          ]}
        />
        <div className='shrink-0 px-2'>
          <AutoPreviewSwitch isSelected={liveMode} onToggle={handleLiveModeToggle} />
        </div>
        <div className='ml-auto flex shrink-0 items-center gap-2 py-1.5'>
          {hasResult && (
            <DownloadResultButton
              compact
              onPress={handleDownloadResult}
              label={generatedIsZip ? 'Download result ZIP' : 'Download result .xlsx'}
            />
          )}
          <GenerateButton label='Generate Excel' isLoading={isGenerating} onPress={() => void handleGenerate()} />
        </div>
      </PanelHead>
      <PreviewCanvas>{renderPreviewBody()}</PreviewCanvas>
    </BuilderPanel>
  )

  const mobileBar = (
    <div className='flex items-center gap-2'>
      <PreviewOpenButton onPress={() => setIsExpanded(true)} />
      {hasResult && <DownloadResultButton onPress={handleDownloadResult} iconOnly label='Download result' />}
      <GenerateButton
        className='min-w-0 flex-1'
        label='Generate Excel'
        isLoading={isGenerating}
        onPress={() => void handleGenerate()}
      />
    </div>
  )

  return (
    <div className='flex flex-1 flex-col font-sans text-foreground'>
      <DeleteTemplateModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={() => router.push(templatesHref)}
        templateName={templateName}
        templateKey={templateKey}
      />

      <TemplateHeaderPortals
        templateType='excel'
        templateName={templateName}
        templateKey={templateKey}
        activeVersion={activeVersion}
        versions={versions}
        isDownloadingSource={isDownloadingSource}
        templatesHref={templatesHref}
        edit={{
          isOpen: isEditOpen,
          name: tempEditData.name,
          templateKey: tempEditData.key,
          isGeneratingKey,
          isSaving,
          onOpenChange: setIsEditOpen,
          onNameChange: v => setTempEditData(prev => ({ ...prev, name: v })),
          onKeyChange: v => setTempEditData(prev => ({ ...prev, key: v })),
          onGenerateKey: generateKey,
          onSave: handleSaveDetails
        }}
        onDelete={() => setIsDeleteModalOpen(true)}
        onDownloadSource={handleDownloadSource}
        onVersionChange={handleVersionChange}
        previewVersion={previewVersion}
        onPreviewVersion={v => {
          setPreviewVersion(v)
          setPreviewMode('before')
          // Auto-preview renders the current version only.
          if (v != null) setLiveMode(false)
        }}
        onUpdateFile={() => setIsUpdateFileOpen(true)}
      />

      <BuilderSplit
        panelWidth={panelWidth}
        minWidth={panelMinWidth}
        maxWidth={panelMaxWidth}
        onResizeStart={handlePanelResize}
        onResizeKeyDown={handlePanelResizeKey}
        fields={fieldsPanel}
        preview={previewPanel}
        mobileBar={mobileBar}
      />

      {/* Full-screen / mobile preview drawer */}
      <ExcelPreviewDrawer
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        file={
          isResultPreview && generatedSheetPdfUrlMap
            ? generatedSheetPdfUrlMap[activeSheetName ?? ''] ??
              generatedSheetPdfUrlMap[Object.keys(generatedSheetPdfUrlMap)[0]]
            : isResultPreview && generatedPdfPreviewUrl
              ? generatedPdfPreviewUrl
              : previewSrc ?? ''
        }
        fileName={
          isResultPreview
            ? `${resultFileBase}${generatedSheetPdfUrlMap || generatedPdfPreviewUrl ? '_preview.pdf' : '.xlsx'}`
            : `${templateName}_template_v${activeVersion ?? 'latest'}.pdf`
        }
        format={isResultPreview && !generatedSheetPdfUrlMap && !generatedPdfPreviewUrl ? 'xlsx' : 'pdf'}
        mode={isResultPreview ? 'result' : 'template'}
      />

      <UpdateFileModal
        isOpen={isUpdateFileOpen}
        onOpenChange={setIsUpdateFileOpen}
        templateType='excel'
        isSaving={isSaving}
        onSubmit={handleUpdateFile}
      />

      {gateModal}
    </div>
  )
}

export default function ExcelSandboxPageWrapper() {
  return (
    <Suspense>
      <ExcelSandboxPage />
    </Suspense>
  )
}
