'use client'

import React, { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/api/generated/main-service'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRouteParams } from '@/hooks/use-route-params'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Spinner, Skeleton, addToast } from '@heroui/react'
import {
  TemplateVersionResponse,
  PdfWatermarkRequest,
  PdfPasswordRequest,
  FontSummaryDto
} from '@/api/generated/main-service/apiGenerated'
import { PdfFromTemplateRequest } from '@/types/pdf-sandbox'
import { toWordRenderRequest } from '@/utils/keyed-request'
import { DeleteTemplateModal } from '@/components/pdf/DeleteTemplateModal'
import { useUpgradeGate } from '@/hooks/use-upgrade-gate'
import { useLivePreview } from '@/hooks/use-live-preview'
import { useResizablePanel } from '@/hooks/use-resizable-panel'
import { TemplateHeaderPortals, UpdateFileModal } from '@/components/templates'

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
import { CategoryNav } from '@/components/ui'
import {
  AutoPreviewSwitch,
  BuilderPanel,
  BuilderSection,
  BuilderSplit,
  DownloadResultButton,
  EndpointHint,
  GenerateSplitButton,
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
import { getSdkCodeExamples } from '@/utils/code-gen'
import type { CodeExamples } from '@/utils/code-gen'
import PdfPreviewDrawer from '@/components/pdf/PdfPreviewDrawer'
import { handleApiError } from '@/hooks/useApiError'
import { downloadFileFromUrl } from '@/utils/download-file'
import { getDownloadLinkExpiry } from '@/utils/download-link'

// --- Dynamic Components ---
const PdfPreview = dynamic(() => import('@/components/pdf/PdfPreview'), {
  ssr: false,
  loading: () => (
    <div className='flex items-center gap-2 p-4'>
      <Spinner size='sm' color='default' />
      <span className='text-[14px] text-default-500'>Loading preview…</span>
    </div>
  )
})

// --- UI State Interface (Arrays for Ordering) ---
interface UiState {
  templateKey: string
  fileName: string
  pdfPassword?: PdfPasswordRequest
  watermark?: PdfWatermarkRequest
  zipOutput?: boolean
  replace: ReplaceItem[]
  table: TableItem[]
  image: ImageItem[]
  qrcode: QrCodeItem[]
  barcode: BarcodeItem[]
}

const DEFAULT_UI_STATE: UiState = {
  templateKey: '',
  fileName: 'My_Generated_Report',
  pdfPassword: undefined,
  watermark: undefined,
  zipOutput: false,
  replace: [],
  table: [],
  image: [],
  qrcode: [],
  barcode: []
}

// --- Converters ---
// Image watermarks are deprecated — UI supports text-only.
// Strip legacy fields (type/imageSrc/width/height) so stale data from old sandbox payloads
// or cached types doesn't end up in the request.
const sanitizeWatermark = (w: PdfWatermarkRequest | undefined): PdfWatermarkRequest | undefined => {
  if (!w) return undefined
  const legacy = w as PdfWatermarkRequest & { type?: string; imageSrc?: string; width?: number; height?: number }
  const { type: _t, imageSrc: _i, width: _w, height: _h, ...rest } = legacy
  return rest as PdfWatermarkRequest
}

const convertToUiState = (data: PdfFromTemplateRequest): UiState => {
  return {
    templateKey: data.templateKey || '',
    fileName: data.fileName || 'My_Generated_Report',
    pdfPassword: data.pdfPassword || undefined,
    watermark: sanitizeWatermark(data.watermark),
    zipOutput: (data as PdfFromTemplateRequest & { zipOutput?: boolean }).zipOutput || false,
    replace: savedEntries(data.replace).map(([key, value]) => ({
      id: generateId(),
      key: formatKey(key, 'replace'),
      value: value === null || value === undefined || value === 'null' ? '' : String(value)
    })),
    table: savedTables<NonNullable<PdfFromTemplateRequest['table']>[number]>(data.table).map(t => ({
      id: generateId(),
      columns: Array.isArray(t.rows) && t.rows.length > 0 && t.rows[0] ? Object.keys(t.rows[0]) : [],
      rows: (Array.isArray(t.rows) ? t.rows : []).filter(Boolean).map(row => {
        const newRow: Record<string, string> = {}
        Object.entries(row as Record<string, unknown>).forEach(([k, v]) => {
          newRow[k] = v === null || v === undefined || v === 'null' ? '' : String(v)
        })
        return newRow
      }),
      sort: t.sort || [],
      verticalMerge: (t.verticalMerge as string[] | undefined) || [],
      collapse: (t.collapse as string[] | undefined) || [],
      repeatHeader: t.repeatHeader ?? false
    })),
    image: savedEntries<NonNullable<PdfFromTemplateRequest['image']>[string]>(data.image, true).map(([key, val]) => ({
      id: generateId(),
      key: formatKey(key, 'image'),
      data: val
    })),
    qrcode: savedEntries<NonNullable<PdfFromTemplateRequest['qrcode']>[string]>(data.qrcode, true).map(([key, val]) => ({
      id: generateId(),
      key: formatKey(key, 'qrcode'),
      data: val
    })),
    barcode: savedEntries<NonNullable<PdfFromTemplateRequest['barcode']>[string]>(data.barcode, true).map(([key, val]) => ({
      id: generateId(),
      key: formatKey(key, 'barcode'),
      data: val
    }))
  }
}

const convertFromUiState = (state: UiState): PdfFromTemplateRequest => {
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

  return {
    templateKey: state.templateKey,
    fileName: state.fileName,
    pdfPassword: state.pdfPassword || undefined,
    watermark: sanitizeWatermark(state.watermark),
    zipOutput: state.zipOutput || false,
    replace: state.replace.reduce((acc, item) => ({ ...acc, [stripKey(item.key, 'replace')]: item.value }), {}),
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
        rows,
        sort: item.sort || [],
        verticalMerge: item.verticalMerge,
        collapse: item.collapse,
        repeatHeader: item.repeatHeader ?? false
      }
    }),
    image: state.image.reduce((acc, item) => ({ ...acc, [stripKey(item.key, 'image')]: item.data }), {}),
    qrcode: state.qrcode.reduce((acc, item) => ({ ...acc, [stripKey(item.key, 'qrcode')]: item.data }), {}),
    barcode: state.barcode.reduce((acc, item) => ({ ...acc, [stripKey(item.key, 'barcode')]: item.data }), {})
  }
}

const TemplateSandboxPage = () => {
  const router = useRouter()
  const params = useRouteParams()
  const searchParams = useSearchParams()
  const templateKeyParam = params.id as string

  const [uiState, setUiState] = useState<UiState>(DEFAULT_UI_STATE)
  const [activeMainTab, setActiveMainTab] = useState<'builder' | 'code'>('builder')
  const [activeBuilderCategory, setActiveBuilderCategory] = useState<
    'text' | 'tables' | 'image' | 'qrcode' | 'barcode' | 'settings'
  >('text')

  const [isGenerating, setGenerating] = useState(false)
  const [isGeneratingWord, setIsGeneratingWord] = useState(false)
  const [generateFormat, setGenerateFormat] = useState<'pdf' | 'word'>('pdf')
  const [isDownloadingProtected, setIsDownloadingProtected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloadingSource, setIsDownloadingSource] = useState(false)

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [errorSummary, setErrorSummary] = useState<MappedError[]>([])
  /** What the last Replace file changed in the field list. */
  const [fieldChanges, setFieldChanges] = useState<FieldChanges | null>(null)
  const [loadError, setLoadError] = useState(false)
  /** Version shown in the preview / rendered by Generate. null = the current version. */
  const [previewVersion, setPreviewVersion] = useState<number | null>(null)

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
  const [generatedIsZip, setGeneratedIsZip] = useState(false)
  const [generatedZipUrl, setGeneratedZipUrl] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'before' | 'after'>('before')
  const [isExpanded, setIsExpanded] = useState(false)
  const [previewFilePath, setPreviewFilePath] = useState<string | null>(null)
  const [liveMode, setLiveMode] = useState(false)
  const { requireFeature, gateModal } = useUpgradeGate()
  const {
    width: panelWidth,
    handleMouseDown: handlePanelResize,
    handleKeyDown: handlePanelResizeKey,
    minWidth: panelMinWidth,
    maxWidth: panelMaxWidth
  } = useResizablePanel('builder-panel-width-pdf', 640)

  const handleLiveModeToggle = () => {
    setLiveMode(v => {
      const next = !v
      if (!next) setPreviewMode('before')
      return next
    })
  }

  const [isPreviewReloading, setIsPreviewReloading] = useState(false)
  const lastPreviewRefreshRef = useRef(0)
  const previewRefreshFailCountRef = useRef(0)

  // Read the link's expiry (API /files token or legacy presigned URL) and schedule a proactive
  // refresh ~5 minutes before it expires. Reactive refresh (on error) still acts as a safety net
  // if the timer didn't fire (tab sleeping, server clock skew, etc.).
  useEffect(() => {
    if (!previewFilePath) return
    const expireAt = getDownloadLinkExpiry(previewFilePath)
    if (!expireAt) return
    const ms = expireAt - 5 * 60 * 1000 - Date.now()
    if (ms <= 0) {
      refreshPreviewUrl()
      return
    }
    const t = setTimeout(() => {
      refreshPreviewUrl()
    }, ms)
    return () => clearTimeout(t)
  }, [previewFilePath])

  const refreshPreviewUrl = useCallback(async () => {
    // Throttle: skip if the last refresh was less than 5s ago (prevents error-loop storms).
    const now = Date.now()
    if (now - lastPreviewRefreshRef.current < 5000) return
    // Bail after 3 consecutive failures so the user sees the error card instead of a reload loop.
    if (previewRefreshFailCountRef.current >= 3) return
    if (!templateKeyParam) return

    lastPreviewRefreshRef.current = now
    setIsPreviewReloading(true)
    try {
      const template = await api.templates.getTemplateById(templateKeyParam)
      const fresh = template.activeVersion?.previewFilePathPresigned || null
      if (fresh) {
        previewRefreshFailCountRef.current = 0
        setPreviewFilePath(fresh)
      } else {
        previewRefreshFailCountRef.current += 1
      }
      if (template.fileSandboxLastTestPresigned) {
        setGeneratedUrl(template.fileSandboxLastTestPresigned)
      }
    } catch {
      previewRefreshFailCountRef.current += 1
    } finally {
      setIsPreviewReloading(false)
    }
  }, [templateKeyParam])

  const [templateName, setTemplateName] = useState('')
  const [templateKey, setTemplateKey] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [tempEditData, setTempEditData] = useState({ name: '', key: '' })
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)

  const [isUpdateFileOpen, setIsUpdateFileOpen] = useState(false)

  // Version State
  const [versions, setVersions] = useState<TemplateVersionResponse[]>([])
  const [activeVersion, setActiveVersion] = useState<number | null>(null)

  // Fonts for watermark font family picker
  const [fonts, setFonts] = useState<FontSummaryDto[]>([])

  useEffect(() => {
    if (templateKeyParam) {
      fetchTemplateDetails(templateKeyParam)
    }
    api.fonts
      .fontsList()
      .then(setFonts)
      .catch(() => {})
  }, [templateKeyParam])

  const fetchTemplateDetails = async (key: string): Promise<UiState | null> => {
    let loaded: UiState | null = null
    setIsLoading(true)
    setLoadError(false)
    try {
      const template = await api.templates.getTemplateById(key)
      setTemplateName(template.name || '')
      setTemplateKey(template.templateKey || '')
      setLastUpdated(template.updatedDatetime ?? template.createdDatetime ?? null)
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
          loaded = convertToUiState(fullRequest)
        } catch (e) {
          console.error('Failed to parse sandbox payload', e)
          loaded = { ...DEFAULT_UI_STATE, templateKey: template.templateKey || '' }
        }
      } else {
        loaded = { ...DEFAULT_UI_STATE, templateKey: template.templateKey || '' }
      }
      setUiState(loaded)
      markTestDataSaved(loaded)
    } catch (err) {
      setLoadError(true)
      handleApiError(err, 'Failed to load template.')
    } finally {
      setIsLoading(false)
    }
    return loaded
  }

  const clearRenderErrors = () => {
    setValidationErrors({})
    setErrorSummary([])
  }

  /** API validation errors → highlighted fields + a short summary. Returns false when it isn't one. */
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

  /** Renders an older stored version through the public API (templateVersion). */
  const renderVersion = async (version: number, fileType: 'pdf' | 'docx') => {
    const payload = convertFromUiState(uiState)
    payload.templateKey = templateKey
    payload.fileType = fileType
    return api.render.wordTemplateCreate({ ...toWordRenderRequest(payload), templateVersion: version })
  }

  const handleGenerate = async () => {
    clearRenderErrors()
    setGenerating(true)
    try {
      const renderPayload = JSON.parse(JSON.stringify(convertFromUiState(uiState)))
      renderPayload.templateKey = templateKey
      const res =
        previewVersion != null
          ? await renderVersion(previewVersion, 'pdf')
          : await api.render.wordTemplateSandboxCreate(templateKey, renderPayload, {
              fileName: uiState.fileName || undefined
            })
      // The sandbox render stores these test values on the server (a pinned older version does not).
      if (previewVersion == null) markTestDataSaved(uiState)
      if (res?.downloadUrl) {
        setPreviewMode('after')
        if (res.isZipped || res.fileType === 'zip') {
          setGeneratedIsZip(true)
          setGeneratedZipUrl(res.downloadUrl)
          setGeneratedUrl(null)
        } else {
          setGeneratedIsZip(false)
          setGeneratedZipUrl(null)
          setGeneratedUrl(res.downloadUrl)
          // Below lg the preview panel is hidden — show the result in the drawer.
          if (isSingleColumnLayout()) setIsExpanded(true)
        }
      }
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
      const renderPayload = JSON.parse(JSON.stringify(convertFromUiState(state)))
      renderPayload.templateKey = templateKey
      return api.render.wordTemplateSandboxCreate(
        templateKey,
        renderPayload,
        { fileName: state.fileName || undefined },
        { signal }
      )
    },
    onRender: res => {
      setGeneratedUrl(res.downloadUrl)
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

  const handleDownloadProtected = async () => {
    if (!previewSrc) return
    setIsDownloadingProtected(true)
    try {
      await downloadFileFromUrl(previewSrc, `${templateName}_v${activeVersion || 'latest'}.pdf`)
    } catch (err) {
      handleApiError(err, 'Download failed. Please try again.')
    } finally {
      setIsDownloadingProtected(false)
    }
  }

  const handleGenerateWord = async () => {
    clearRenderErrors()
    setIsGeneratingWord(true)
    try {
      const payload = convertFromUiState(uiState)
      payload.templateKey = templateKey
      payload.fileType = 'docx'
      const res =
        previewVersion != null
          ? await renderVersion(previewVersion, 'docx')
          : await api.render.wordTemplateCreate(toWordRenderRequest(payload))
      if (res?.downloadUrl) {
        await downloadFileFromUrl(res.downloadUrl, `${uiState.fileName || templateName}.docx`)
        addToast({ title: 'Downloaded', description: 'Word file downloaded successfully.', color: 'success' })
      }
    } catch (err) {
      if (!showRenderErrors(err)) handleApiError(err, 'Generation failed. Please check your inputs.')
    } finally {
      setIsGeneratingWord(false)
    }
  }

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const handleSaveDetails = async () => {
    setIsSaving(true)
    try {
      const projectId = searchParams.get('projectId')
      const trimmedKey = tempEditData.key.trim()
      const keyChanged = !!trimmedKey && trimmedKey !== templateKey
      const effectiveKey = keyChanged ? trimmedKey : templateKey

      const payload = convertFromUiState(uiState)
      payload.templateKey = effectiveKey

      await api.templates.templatesUpdate(
        templateKey,
        {
          name: tempEditData.name,
          newTemplateKey: keyChanged ? trimmedKey : undefined,
          // Inline base64 images are too large for the query string — keep the stored file URLs instead.
          sandboxPayload: await toStorablePayload(templateKey, payload),
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
        router.replace(`/pdf/templates/${trimmedKey}${query}`)
      } else {
        fetchTemplateDetails(templateKey)
      }
    } catch (err) {
      handleApiError(err, 'Failed to save changes.')
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (isEditOpen) {
      setTempEditData({ name: templateName, key: templateKey })
    }
  }, [isEditOpen, templateName, templateKey])

  const getExampleCode = (): CodeExamples => {
    const requestData = convertFromUiState(uiState)
    requestData.templateKey = templateKey

    // Fallback if no specific data exists (e.g. clean template mode)
    if (!requestData.fileName) requestData.fileName = 'generated_document'

    return getSdkCodeExamples(requestData, { documentType: 'pdf' })
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

  const handleUpdateFile = async (file: File) => {
    setIsSaving(true)
    try {
      const projectId = searchParams.get('projectId')
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
      setPreviewMode('before')
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

  const handleVersionChange = async (version: number) => {
    try {
      await api.templates.switchVersionUpdate(templateKey, { version })
      setPreviewVersion(null)
      setPreviewMode('before')
      setGeneratedUrl(null)
      fetchTemplateDetails(templateKey)
    } catch (err) {
      handleApiError(err, 'Failed to switch version.')
    }
  }

  if (isLoading) {
    return (
      <div className='flex h-[calc(100vh-210px)] items-center justify-center border border-divider bg-content1'>
        <Spinner size='lg' color='default' label='Loading template…' classNames={{ label: 'text-[13px] text-default-500' }} />
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
  const previewSrc = liveMode
    ? generatedUrl || sourcePreview || ''
    : previewMode === 'before'
      ? sourcePreview || ''
      : generatedUrl
  const isLivePreviewResult = liveMode && !!generatedUrl && previewSrc === generatedUrl

  const handleDownloadSource = async () => {
    setIsDownloadingSource(true)
    try {
      const res = await api.templates.downloadTemplate(templateKey)
      if (res && res.url) {
        await downloadFileFromUrl(res.url, `${templateName}_v${activeVersion || 'latest'}.docx`)
      } else {
        addToast({ title: 'Error', description: 'Download URL not found', color: 'danger' })
      }
    } catch (e) {
      handleApiError(e, 'Failed to download template.')
    } finally {
      setIsDownloadingSource(false)
    }
  }

  const projectId = searchParams.get('projectId')
  const templatesHref = projectId ? `/project/${projectId}/templates` : '/project'
  const hasResult = (generatedIsZip && !!generatedZipUrl) || !!generatedUrl
  const isBusy = isGenerating || isGeneratingWord
  const resultFileBase = uiState.fileName || templateName

  const handleDownloadResult = () => {
    if (generatedIsZip && generatedZipUrl) {
      void downloadFileFromUrl(generatedZipUrl, `${resultFileBase}.zip`)
      return
    }
    if (generatedUrl) void downloadFileFromUrl(generatedUrl, `${resultFileBase}.pdf`)
  }

  const runGenerate = () => (generateFormat === 'pdf' ? handleGenerate() : handleGenerateWord())

  const liveNotice = (resultShown: boolean) => {
    if (livePreviewError) return <PreviewNotice tone='error'>{livePreviewError}</PreviewNotice>
    if (isLivePreviewRendering) return <PreviewNotice tone='busy'>Updating the preview…</PreviewNotice>
    return (
      <PreviewNotice tone='ok'>
        {resultShown
          ? 'Showing your latest values.'
          : 'Auto-preview is on. Edit a field and the preview updates.'}
      </PreviewNotice>
    )
  }

  const pdfViewer = (file: string, fileName: string) => (
    <div className='h-[calc(100vh-250px)] min-h-[420px]'>
      <PdfPreview
        key={file}
        file={file}
        fileName={fileName}
        loading={<Skeleton className='h-full min-h-[500px] w-full' />}
        className='flex flex-col'
        onLoadError={refreshPreviewUrl}
        isReloading={isPreviewReloading}
        hideDownload
      />
    </div>
  )

  const renderPreviewBody = () => {
    if (previewMode === 'after') {
      if (generatedIsZip && generatedZipUrl) {
        return (
          <PreviewEmpty
            icon='lucide:archive'
            title='ZIP file ready'
            hint='ZIP files can’t be shown here. Download it to open the PDF inside.'
            action={<DownloadResultButton onPress={handleDownloadResult} label='Download ZIP' />}
          />
        )
      }
      if (generatedUrl) {
        return (
          <>
            {liveMode && liveNotice(true)}
            {liveMode && isLivePreviewRendering && !generatedUrl ? (
              <Skeleton className='h-full min-h-[500px] w-full' />
            ) : (
              pdfViewer(generatedUrl, `${resultFileBase}.pdf`)
            )}
          </>
        )
      }
      return (
        <PreviewEmpty
          icon='lucide:zap'
          title='Nothing generated yet'
          hint='Fill in your fields, then press Generate to see the finished document here.'
        />
      )
    }

    if (previewSrc) {
      return (
        <>
          {liveMode ? (
            liveNotice(isLivePreviewResult)
          ) : (
            <PreviewNotice>
              {viewedVersion
                ? `Template file — version ${previewVersion} (not the current version). Generate renders this version.`
                : 'Template file. Values appear after you press Generate (or turn on Auto-preview).'}
            </PreviewNotice>
          )}
          {liveMode && isLivePreviewRendering && !generatedUrl ? (
            <Skeleton className='h-full min-h-[500px] w-full' />
          ) : (
            pdfViewer(
              previewSrc,
              isLivePreviewResult ? `${templateName}_live_preview.pdf` : `${templateName}_template_source.pdf`
            )
          )}
        </>
      )
    }

    return (
      <PreviewEmpty
        icon='lucide:file-text'
        title='No preview yet'
        hint='Upload a Word (.docx) file with Replace file (top right) to see it here.'
      />
    )
  }

  const generateOptions = [
    { key: 'pdf', label: 'PDF', description: 'Shows here and downloads as .pdf', icon: 'lucide:file-text' },
    { key: 'word', label: 'Word document', description: 'Downloads a filled .docx', icon: 'lucide:file-down' }
  ] as const

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
          <EndpointHint path='/render/word/template' />
        </div>
      </PanelHead>

      {activeMainTab === 'builder' && (
        <div className='flex w-full flex-col gap-4 p-4 md:p-5'>
          <FieldsSourceNote fileLabel='Word' onReplaceFile={() => setIsUpdateFileOpen(true)} />
          {fieldChanges && <FieldChangesNotice changes={fieldChanges} onDismiss={() => setFieldChanges(null)} />}
          <CategoryNav
            layout='horizontal'
            active={activeBuilderCategory}
            onChange={setActiveBuilderCategory}
            items={
              [
                { id: 'text', icon: 'lucide:type', label: 'Text fields', count: uiState.replace.length, hasError: errorSummary.some(e => e.category === 'text') },
                { id: 'tables', icon: 'lucide:table', label: 'Tables', count: uiState.table.length, hasError: errorSummary.some(e => e.category === 'tables') },
                { id: 'image', icon: 'lucide:image', label: 'Images', count: uiState.image.length, hasError: errorSummary.some(e => e.category === 'image') },
                { id: 'qrcode', icon: 'lucide:qr-code', label: 'QR codes', count: uiState.qrcode.length, hasError: errorSummary.some(e => e.category === 'qrcode') },
                { id: 'barcode', icon: 'lucide:barcode', label: 'Barcodes', count: uiState.barcode.length, hasError: errorSummary.some(e => e.category === 'barcode') },
                {
                  id: 'settings',
                  icon: 'lucide:settings',
                  label: 'Output settings',
                  section: 'config',
                  note: uiState.pdfPassword || uiState.watermark || uiState.zipOutput ? 'Set' : undefined,
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
                description='Each {{name}} in your Word file is replaced with the value you type here.'>
                <ReplacementsSection
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
                description='Rows that repeat in a Word table — one row per item.'>
                <TablesSection
                  items={uiState.table}
                  onChange={d => setUiState(p => ({ ...p, table: d }))}
                  errors={validationErrors}
                  onClearError={clearValidationError}
                />
              </BuilderSection>
            )}

            {activeBuilderCategory === 'image' && (
              <BuilderSection
                title='Images'
                description='Each {{image:name}} is replaced with the picture you upload or link.'>
                <ImagesSection
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
                  items={uiState.qrcode}
                  onChange={d => setUiState(p => ({ ...p, qrcode: d }))}
                  errors={validationErrors}
                  onClearError={clearValidationError}
                />
              </BuilderSection>
            )}

            {activeBuilderCategory === 'barcode' && (
              <BuilderSection
                title='Barcodes'
                description='Each {{barcode:name}} becomes a Code128 or EAN13 barcode.'>
                <BarcodesSection
                  items={uiState.barcode}
                  onChange={d => setUiState(p => ({ ...p, barcode: d }))}
                  errors={validationErrors}
                  onClearError={clearValidationError}
                />
              </BuilderSection>
            )}

            {activeBuilderCategory === 'settings' && (
              <BuilderSection
                title='Output settings'
                description={
                  generateFormat === 'pdf'
                    ? 'File name, PDF password, watermark and ZIP download.'
                    : 'File name and ZIP download. Password and watermark apply to PDF output only.'
                }>
                <FileSettingsSection
                  showPdfOptions={generateFormat === 'pdf'}
                  requireFeature={requireFeature}
                  fileName={uiState.fileName}
                  pdfPassword={uiState.pdfPassword}
                  watermark={uiState.watermark}
                  zipOutput={uiState.zipOutput}
                  fonts={fonts}
                  onChange={updates =>
                    setUiState(p => ({
                      ...p,
                      ...(Object.prototype.hasOwnProperty.call(updates, 'fileName') && {
                        fileName: updates.fileName ?? ''
                      }),
                      ...(Object.prototype.hasOwnProperty.call(updates, 'pdfPassword') && {
                        pdfPassword: updates.pdfPassword
                      }),
                      ...(Object.prototype.hasOwnProperty.call(updates, 'watermark') && {
                        watermark: updates.watermark
                      }),
                      ...(Object.prototype.hasOwnProperty.call(updates, 'zipOutput') && {
                        zipOutput: updates.zipOutput
                      })
                    }))
                  }
                />
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
      {/* One row: view tabs | auto-preview | download + generate. Labels collapse by the panel's own width;
          on a very narrow panel the actions wrap to a second row instead of overlapping. */}
      <PanelHead className='preview-head gap-1 pr-2'>
        <HeadTabs
          compact
          ariaLabel='Preview view'
          active={previewMode}
          onChange={setPreviewMode}
          items={[
            { id: 'before', label: 'Template', hint: 'Your template file (.docx)' },
            { id: 'after', label: 'Result', hint: 'The last generated file (PDF)' }
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
              label={generatedIsZip ? 'Download result ZIP' : 'Download result PDF'}
            />
          )}
          <GenerateSplitButton
            options={generateOptions}
            selected={generateFormat}
            onSelect={setGenerateFormat}
            onGenerate={() => void runGenerate()}
            isLoading={isBusy}
          />
        </div>
      </PanelHead>
      <PreviewCanvas>{renderPreviewBody()}</PreviewCanvas>
    </BuilderPanel>
  )

  const mobileBar = (
    <div className='flex items-center gap-2'>
      <PreviewOpenButton onPress={() => setIsExpanded(true)} />
      {hasResult && (
        <DownloadResultButton
          onPress={handleDownloadResult}
          iconOnly
          label={generatedIsZip ? 'Download result ZIP' : 'Download result PDF'}
        />
      )}
      <GenerateSplitButton
        className='min-w-0 flex-1'
        options={generateOptions}
        selected={generateFormat}
        onSelect={setGenerateFormat}
        onGenerate={() => void runGenerate()}
        isLoading={isBusy}
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
        templateType='pdf'
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
        onUpdateFile={() => setIsUpdateFileOpen(true)}
        previewVersion={previewVersion}
        onPreviewVersion={v => {
          setPreviewVersion(v)
          setPreviewMode('before')
          // Auto-preview renders the current version only.
          if (v != null) setLiveMode(false)
        }}
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

      {/* Preview drawer — opened from the mobile action bar and after Generate below lg.
          Shows the last result when there is one, with the template file one tap away. */}
      <PdfPreviewDrawer
        key={generatedUrl ?? 'no-result'}
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        file={sourcePreview || ''}
        views={[
          ...(generatedUrl ? [{ id: 'result', label: 'Last result', file: generatedUrl, fileName: `${resultFileBase}.pdf` }] : []),
          ...(sourcePreview
            ? [{ id: 'template', label: 'Template file', file: sourcePreview, fileName: `${templateName}_template_source.pdf` }]
            : [])
        ]}
      />

      <UpdateFileModal
        isOpen={isUpdateFileOpen}
        onOpenChange={setIsUpdateFileOpen}
        templateType='pdf'
        isSaving={isSaving}
        onSubmit={handleUpdateFile}
      />

      {gateModal}
    </div>
  )
}

export default function TemplateSandboxPageWrapper() {
  return (
    <Suspense>
      <TemplateSandboxPage />
    </Suspense>
  )
}
