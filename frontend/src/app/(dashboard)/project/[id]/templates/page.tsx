'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { DeleteTemplateModal } from '@/components/pdf/DeleteTemplateModal'
import { Button, Spinner } from '@heroui/react'
import Icon from '@/components/icon'
import FileIcon from '@/components/FileIcon'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/api/generated/main-service'
import { TemplateResponse } from '@/api/generated/main-service/apiGenerated'
import { useProject } from '@/providers/ProjectContext'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { PdfThumbnail } from '@/components/pdf/PdfThumbnail'
import { CopyButton } from '@/components/common/CopyButton'

dayjs.extend(relativeTime)

type FilterType = 'all' | 'pdf' | 'excel'

const getTemplateType = (tpl: TemplateResponse): 'pdf' | 'excel' => {
  const path = tpl.activeVersion?.filePath || ''
  return path.toLowerCase().endsWith('.xlsx') ? 'excel' : 'pdf'
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pdf', label: 'PDF' },
  { key: 'excel', label: 'Excel' }
]

const Templates = () => {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { projects } = useProject()

  const [templates, setTemplates] = useState<TemplateResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadedProjectIdRef = useRef<string | null>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)

  const projectName = projects.find(p => p.id === id)?.name || ''

  const hydrateTemplatePreviews = useCallback(async (items: TemplateResponse[]) => {
    const missingPreview = items.filter(tpl => tpl.templateKey && !tpl.activeVersion?.previewFilePathPresigned)
    if (missingPreview.length === 0) return items

    const details = await Promise.allSettled(
      missingPreview.map(tpl => api.templates.getTemplateById(tpl.templateKey))
    )
    const detailMap = new Map<string, TemplateResponse>()

    details.forEach(result => {
      if (result.status === 'fulfilled' && result.value?.templateKey) {
        detailMap.set(result.value.templateKey, result.value)
      }
    })

    return items.map(tpl => {
      const detail = detailMap.get(tpl.templateKey)
      if (!detail) return tpl

      return {
        ...tpl,
        sandboxPayload: tpl.sandboxPayload ?? detail.sandboxPayload,
        activeVersion: detail.activeVersion ?? tpl.activeVersion,
        allVersions: detail.allVersions ?? tpl.allVersions
      }
    })
  }, [])

  const fetchTemplates = useCallback(
    async (pageToFetch: number, isLoadMore = false) => {
      if (!id || typeof id !== 'string') return
      if (isLoadMore) setIsLoadingMore(true)
      else setIsLoading(true)

      try {
        const res = await api.templates.templatesList({
          pageNumber: pageToFetch,
          pageSize: 24,
          // @ts-ignore
          projectId: id
        })
        if (res?.items) {
          const hydratedItems = await hydrateTemplatePreviews(res.items)
          if (isLoadMore) setTemplates(prev => [...prev, ...hydratedItems])
          else setTemplates(hydratedItems)
          setHasMore(res.items.length >= 24)
        }
      } catch {
        // handled by API interceptor
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [hydrateTemplatePreviews, id]
  )

  useEffect(() => {
    if (id && typeof id === 'string' && loadedProjectIdRef.current !== id) {
      loadedProjectIdRef.current = id
      setPage(1)
      setTemplates([])
      setHasMore(true)
      fetchTemplates(1, false)
    }
  }, [id, fetchTemplates])

  useEffect(() => {
    const handleScroll = () => {
      if (isLoading || isLoadingMore || !hasMore) return
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const docHeight = document.documentElement.scrollHeight
      if (scrollTop + windowHeight >= docHeight - 200) {
        setPage(prev => {
          const nextPage = prev + 1
          fetchTemplates(nextPage, true)
          return nextPage
        })
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isLoading, isLoadingMore, hasMore, fetchTemplates])

  const filtered = filter === 'all' ? templates : templates.filter(t => getTemplateType(t) === filter)

  const handleManage = (tpl: TemplateResponse) => {
    const type = getTemplateType(tpl)
    if (type === 'excel') {
      router.push(`/excel/templates/${tpl.templateKey}?projectId=${id}`)
    } else {
      router.push(`/pdf/templates/${tpl.templateKey}?projectId=${id}`)
    }
  }

  const handleNewTemplate = () => {
    if (filter === 'excel') {
      router.push(`/pdf/templates/create?projectId=${id}&type=excel`)
    } else {
      router.push(`/pdf/templates/create?projectId=${id}`)
    }
  }

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <Spinner size='lg' />
      </div>
    )
  }

  return (
    <div className='dashboard-panel flex flex-col'>
      {/* Header */}
      <div className='dashboard-header'>
        <div>
          <h1 className='dashboard-title'>Templates</h1>
          <p className='dashboard-subtitle'>
            {projectName ? `${projectName} · ` : ''}PDF and Excel report templates
          </p>
        </div>
        <Button
          color='primary'
          size='sm'
          radius='md'
          startContent={<Icon icon='lucide:plus' className='h-3.5 w-3.5' />}
          onPress={handleNewTemplate}
          className='h-9 rounded-lg px-4 text-[12px] font-bold'>
          New Template
        </Button>
      </div>

      {/* Filter bar */}
      <div className='dashboard-toolbar'>
        {FILTERS.map(f => {
          const isActive = filter === f.key
          const count =
            f.key === 'all'
              ? templates.length
              : templates.filter(t => getTemplateType(t) === f.key).length
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                isActive
                  ? 'bg-content3 text-foreground shadow-[inset_0_0_0_1px_var(--hairline-soft)]'
                  : 'text-default-600 hover:bg-content2 hover:text-foreground'
              }`}>
              {f.label}
              <span
                className={`ml-1.5 text-[10.5px] ${
                  isActive ? 'opacity-70' : 'text-default-500'
                }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div className='p-4 md:p-5'>
        {filtered.length === 0 ? (
          <div className='dashboard-soft flex h-72 flex-col items-center justify-center px-6 text-center'>
            <div className='mb-4 rounded-lg bg-content3 p-4'>
              <Icon icon='lucide:file-plus' className='h-6 w-6 text-default-500' />
            </div>
            <h3 className='text-lg font-medium text-foreground'>
              {filter === 'all' ? 'No templates yet' : `No ${filter.toUpperCase()} templates yet`}
            </h3>
            <p className='mt-1 text-sm text-default-500'>
              {filter === 'excel'
                ? 'Upload your first .xlsx template to get started'
                : 'Create your first PDF template to get started'}
            </p>
            <Button
              className='mt-4 h-9 rounded-lg px-5 text-[12px] font-bold'
              color='primary'
              radius='md'
              onPress={handleNewTemplate}>
              {filter === 'excel' ? 'Upload Template' : 'Create Template'}
            </Button>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
            {filtered.map(tpl => {
              const type = getTemplateType(tpl)
              return (
                <div
                  key={tpl.id}
                  className='dashboard-card dashboard-card-hover relative flex min-h-[224px] flex-col justify-between p-4 2xl:min-h-[216px]'>
                  {/* Badges */}
                  <div className='absolute right-3 top-3 z-10 flex items-center gap-1.5'>
                    <span className={`qs-chip uppercase ${type === 'excel' ? 'qs-chip-excel' : 'qs-chip-pdf'}`}>
                      {type}
                    </span>
                    <span className='qs-chip qs-chip-neutral text-[11px]'>
                      v{tpl.activeVersion?.version || '1'}
                    </span>
                  </div>

                  <div className='flex gap-4'>
                    {/* Gotenberg stores template previews as PDF, including XLSX templates. */}
                    <div className='ring-hairline h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-content2'>
                      {tpl.activeVersion?.previewFilePathPresigned ? (
                        <PdfThumbnail url={tpl.activeVersion.previewFilePathPresigned} />
                      ) : (
                        <div className='flex h-full w-full items-center justify-center'>
                          <FileIcon type={type} size='sm' />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className='flex min-w-0 flex-1 flex-col pt-0.5'>
                      <h3 className='mr-16 truncate text-base font-bold text-foreground' title={tpl.name || 'Untitled'}>
                        {tpl.name || 'Untitled'}
                      </h3>
                      <div className='mt-2 space-y-1.5'>
                        <div className='flex items-center gap-1.5 text-xs text-default-500'>
                          <Icon icon='lucide:clock' className='h-3 w-3 text-default-400' />
                          <span className='truncate'>
                            Updated {tpl.updatedDatetime ? dayjs(new Date(tpl.updatedDatetime)).fromNow() : '-'}
                          </span>
                        </div>
                        <div className='flex items-center gap-1.5 text-xs text-default-500'>
                          <Icon icon='lucide:calendar-plus' className='h-3 w-3 text-default-400' />
                          <span className='truncate'>
                            Created {tpl.createdDatetime ? dayjs(new Date(tpl.createdDatetime)).format('MMM D, YYYY') : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className='mt-4 flex items-center justify-between gap-2 border-t border-default-200/60 pt-3 dark:border-white/10'>
                    <div className='ring-hairline flex flex-1 items-center gap-1.5 rounded-lg bg-content2 p-1.5 px-2'>
                      <Icon icon='lucide:key' className='h-3 w-3 text-default-500' />
                      <code className='flex-1 truncate font-mono text-[10.5px] font-medium text-default-600' title={tpl.templateKey || ''}>
                        {tpl.templateKey}
                      </code>
                      <CopyButton text={tpl.templateKey || ''} className='shrink-0' />
                    </div>
                    <Button
                      className='h-8 rounded-lg px-4 text-[11.5px] font-bold'
                      variant='solid'
                      color='primary'
                      size='sm'
                      radius='md'
                      endContent={<Icon icon='lucide:arrow-right' className='h-3 w-3' />}
                      onPress={() => handleManage(tpl)}>
                      Manage
                    </Button>
                  </div>
                </div>
              )
            })}
            {isLoadingMore && (
              <div className='col-span-full flex justify-center p-4'>
                <Spinner size='md' />
              </div>
            )}
          </div>
        )}
      </div>

      <DeleteTemplateModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onSuccess={() => {
          if (templateToDelete) {
            setTemplates(prev => prev.filter(t => t.templateKey !== templateToDelete))
            setTemplateToDelete(null)
          }
        }}
        templateName={templates.find(t => t.templateKey === templateToDelete)?.name || ''}
        templateKey={templateToDelete || ''}
      />
    </div>
  )
}

export default Templates
