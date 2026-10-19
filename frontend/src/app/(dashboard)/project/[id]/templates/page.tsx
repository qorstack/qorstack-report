'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Spinner, Tooltip } from '@heroui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRouteParams } from '@/hooks/use-route-params'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import Icon from '@/components/icon'
import FileIcon from '@/components/FileIcon'
import { DeleteTemplateModal } from '@/components/pdf/DeleteTemplateModal'
import { PdfThumbnail } from '@/components/pdf/PdfThumbnail'
import { CopyButton } from '@/components/common/CopyButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { api } from '@/api/generated/main-service'
import { TemplatePerformanceDto, TemplateResponse } from '@/api/generated/main-service/apiGenerated'
import { useProject } from '@/providers/ProjectContext'
import { formatDuration } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import FileTypeBadge from '@/components/common/FileTypeBadge'
import { RegeneratePreviewsModal } from '@/components/templates/RegeneratePreviewsModal'

dayjs.extend(relativeTime)

type FilterType = 'all' | 'pdf' | 'excel'

const PAGE_SIZE = 24
const SEARCH_DEBOUNCE_MS = 300

const getTemplateType = (tpl: TemplateResponse): 'pdf' | 'excel' => {
  const path = tpl.activeVersion?.filePath || ''
  return path.toLowerCase().endsWith('.xlsx') ? 'excel' : 'pdf'
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pdf', label: 'Word' },
  { key: 'excel', label: 'Excel' }
]

const TypeBadge = ({ type }: { type: 'pdf' | 'excel' }) => <FileTypeBadge type={type} />

const Templates = () => {
  const router = useRouter()
  const params = useRouteParams()
  const id = params.id as string
  const { projects } = useProject()

  const [templates, setTemplates] = useState<TemplateResponse[]>([])
  const [regenOpen, setRegenOpen] = useState(false)
  const searchParams = useSearchParams()
  // ?regenerate=1 (after an import that added fonts) opens the Regenerate previews dialog once.
  useEffect(() => {
    if (searchParams.get('regenerate') !== '1') return
    setRegenOpen(true)
    router.replace(`/project/${id}/templates`)
  }, [searchParams, router, id])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  // The search box is debounced into the server query (the API searches name and template key).
  const [query, setQuery] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [perfByKey, setPerfByKey] = useState<Record<string, TemplatePerformanceDto>>({})

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  // Bumped on every new query (project or search); responses for an older query are dropped.
  const querySeq = useRef(0)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')

  // Remember the chosen layout per browser (best effort — storage may be blocked).
  useEffect(() => {
    try {
      const saved = localStorage.getItem('templates-view')
      if (saved === 'grid' || saved === 'list') setView(saved)
    } catch {
      // ignore
    }
  }, [])
  const changeView = (next: 'grid' | 'list') => {
    setView(next)
    try {
      localStorage.setItem('templates-view', next)
    } catch {
      // ignore
    }
  }

  const projectName = projects.find(p => p.id === id)?.name || ''
  const statsRangeShort = format(new Date(), 'MMM yyyy')

  // The list response already carries each active version's preview URL (previewFilePathPresigned) when a
  // preview exists, so no per-template detail requests are needed here.
  const fetchTemplates = useCallback(
    async (pageToFetch: number, isLoadMore = false) => {
      if (!id || typeof id !== 'string') return
      const seq = querySeq.current
      if (isLoadMore) setIsLoadingMore(true)
      else setIsLoading(true)

      try {
        const res = await api.templates.templatesList({
          pageNumber: pageToFetch,
          pageSize: PAGE_SIZE,
          projectId: id,
          search: query || undefined
        })
        if (seq !== querySeq.current) return
        if (res?.items) {
          const items = res.items
          if (isLoadMore) {
            setTemplates(prev => {
              const ids = new Set(prev.map(t => t.id))
              return [...prev, ...items.filter(t => !ids.has(t.id))]
            })
          } else setTemplates(items)
          setTotalCount(Number(res.totalCount ?? items.length))
          setHasMore(res.hasNextPage ?? items.length >= PAGE_SIZE)
          setPage(pageToFetch)
        }
      } catch {
        // handled by API interceptor
      } finally {
        if (seq === querySeq.current) {
          setIsLoading(false)
          setIsLoadingMore(false)
        }
      }
    },
    [id, query]
  )

  useEffect(() => {
    const handle = setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [search])

  useEffect(() => {
    if (!id || typeof id !== 'string') return
    querySeq.current += 1
    setPage(1)
    setHasMore(true)
    setIsLoadingMore(false)
    fetchTemplates(1, false)
  }, [id, fetchTemplates])

  useEffect(() => {
    if (!id || typeof id !== 'string') return
    const now = new Date()
    const fromDate = startOfMonth(now).toISOString()
    const toDate = endOfMonth(now).toISOString()
    api.analytics
      .templatesList({ projectId: id, fromDate, toDate } as any)
      .then(res => {
        const map: Record<string, TemplatePerformanceDto> = {}
        ;(res || []).forEach(row => {
          if (row.templateKey) map[row.templateKey] = row
        })
        setPerfByKey(map)
      })
      .catch(error => console.error('Failed to fetch template performance:', error))
  }, [id])

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return
    fetchTemplates(page + 1, true)
  }, [isLoading, isLoadingMore, hasMore, page, fetchTemplates])

  // "All" is the server total. The API has no type filter, so the Word/Excel counts are exact only once every
  // page is loaded; until then they are hidden rather than shown as a misleading partial number.
  const counts = useMemo(
    (): Record<FilterType, number | null> => ({
      all: totalCount,
      pdf: hasMore ? null : templates.filter(t => getTemplateType(t) === 'pdf').length,
      excel: hasMore ? null : templates.filter(t => getTemplateType(t) === 'excel').length
    }),
    [templates, totalCount, hasMore]
  )

  const filtered = useMemo(
    () => (filter === 'all' ? templates : templates.filter(t => getTemplateType(t) === filter)),
    [templates, filter]
  )

  const openTemplate = (tpl: TemplateResponse) => {
    const base = getTemplateType(tpl) === 'excel' ? '/excel/templates' : '/pdf/templates'
    router.push(`${base}/${tpl.templateKey}?projectId=${id}`)
  }

  const handleNewTemplate = () => {
    router.push(`/pdf/templates/create?projectId=${id}${filter === 'excel' ? '&type=excel' : ''}`)
  }

  const requestDelete = (templateKey: string) => {
    setTemplateToDelete(templateKey)
    setDeleteModalOpen(true)
  }

  const newTemplateButton = (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        variant='bordered'
        className='h-10 border-default-300 font-medium'
        startContent={<Icon icon='lucide:refresh-cw' className='h-4 w-4' />}
        title='Re-render every preview with the fonts installed now (after uploading or importing fonts)'
        onPress={() => setRegenOpen(true)}>
        Regenerate previews
      </Button>
      <Button
        color='primary'
        className='h-10 font-medium'
        startContent={<Icon icon='lucide:plus' className='h-4 w-4' />}
        onPress={handleNewTemplate}>
        New template
      </Button>
    </div>
  )

  const isSearching = query.length > 0

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        breadcrumb={[{ label: projectName || 'Project', href: `/project/${id}` }, { label: 'Templates' }]}
        title='Your templates'
        description='Word and Excel files you fill with data to produce PDF, DOCX or XLSX documents.'
        actions={newTemplateButton}
      />
      {typeof id === 'string' && (
        <RegeneratePreviewsModal
          projectId={id}
          isOpen={regenOpen}
          onOpenChange={setRegenOpen}
          onFinished={() => void fetchTemplates(1, false)}
        />
      )}

      {/* Toolbar: filter segments + search */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div role='group' aria-label='Filter by file type' className='flex border border-default-300'>
          {FILTERS.map((f, index) => {
            const isActive = filter === f.key
            return (
              <button
                key={f.key}
                type='button'
                aria-pressed={isActive}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'flex min-h-10 flex-1 items-center justify-center gap-2 px-4 text-[13px] font-medium transition-colors sm:flex-none',
                  index > 0 && 'border-l border-default-300',
                  isActive ? 'bg-content3 text-foreground' : 'text-default-500 hover:bg-content2 hover:text-foreground'
                )}>
                {f.label}
                {counts[f.key] !== null && (
                  <span className={cn('font-mono text-[12px] tabular-nums', isActive ? 'text-default-500' : 'text-default-400')}>
                    {counts[f.key]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className='flex items-center gap-2'>
          <Input
            aria-label='Search templates'
            placeholder='Search by name or key'
            value={search}
            onValueChange={setSearch}
            isClearable
            onClear={() => setSearch('')}
            variant='bordered'
            className='w-full sm:w-72'
            classNames={{ inputWrapper: 'h-10 min-h-10 border-transparent bg-content2 data-[hover=true]:border-default-300 group-data-[focus=true]:border-foreground', input: 'text-[14px]' }}
            startContent={<Icon icon='lucide:search' className='h-4 w-4 text-default-500' />}
          />
          <div role='group' aria-label='Layout' className='flex shrink-0 border border-default-300'>
            {(
              [
                { key: 'grid', icon: 'lucide:layout-grid', label: 'Card view' },
                { key: 'list', icon: 'lucide:list', label: 'List view' }
              ] as const
            ).map((v, index) => (
              <button
                key={v.key}
                type='button'
                aria-label={v.label}
                title={v.label}
                aria-pressed={view === v.key}
                onClick={() => changeView(v.key)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center transition-colors',
                  index > 0 && 'border-l border-default-300',
                  view === v.key ? 'bg-content3 text-foreground' : 'text-default-500 hover:bg-content2 hover:text-foreground'
                )}>
                <Icon icon={v.icon} className='h-4 w-4' />
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className='flex min-h-[320px] items-center justify-center border border-divider bg-content1'>
          <Spinner color='default' label='Loading templates' classNames={{ label: 'text-[13px] text-default-500' }} />
        </div>
      ) : filtered.length === 0 && !hasMore ? (
        <div className='flex min-h-[300px] flex-col items-center justify-center border border-divider bg-content1 px-6 py-12 text-center'>

          <Icon icon={isSearching ? 'lucide:search-x' : 'lucide:file-plus-2'} className='h-8 w-8 text-default-400' />
          <h2 className='mt-4 text-[16px] font-semibold text-foreground'>
            {isSearching ? 'No matching templates' : filter === 'excel' ? 'No Excel templates yet' : filter === 'pdf' ? 'No Word templates yet' : 'No templates yet'}
          </h2>
          <p className='mt-2 max-w-md text-[14px] text-default-500'>
            {isSearching
              ? 'Try another name or template key.'
              : 'Upload a Word (.docx) or Excel (.xlsx) file with {{placeholders}} to start generating documents.'}
          </p>
          <div className='mt-6'>
            {isSearching ? (
              <Button variant='bordered' className='h-10 border-default-300 font-medium' onPress={() => setSearch('')}>
                Clear search
              </Button>
            ) : (
              newTemplateButton
            )}
          </div>
        </div>
      ) : (
        <>
          {filtered.length === 0 ? (
            <p className='border border-divider bg-content1 px-6 py-8 text-center text-[14px] text-default-500'>
              No {filter === 'excel' ? 'Excel' : 'Word'} templates in the loaded results yet. Load more to keep looking.
            </p>
          ) : view === 'list' ? (
            <div className='overflow-x-auto border border-divider bg-content1'>
              <table className='w-full min-w-[720px] text-left'>
                <thead>
                  <tr className='border-b border-divider'>
                    {['Name', 'Type', 'Version', 'Updated', 'Runs', ''].map(h => (
                      <th key={h || 'actions'} scope='col' className='px-4 py-3 text-[13px] font-medium text-default-500'>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(tpl => {
                    const type = getTemplateType(tpl)
                    const perf = tpl.templateKey ? perfByKey[tpl.templateKey] : undefined
                    const volume = perf ? Number(perf.totalGenerations) || 0 : 0
                    const name = tpl.name || 'Untitled'
                    return (
                      <tr key={tpl.id} className='border-b border-divider last:border-0 hover:bg-content2'>
                        <td className='max-w-[360px] px-4 py-3'>
                          <button
                            type='button'
                            onClick={() => openTemplate(tpl)}
                            className='line-clamp-2 text-left text-[14px] font-medium text-foreground underline-offset-4 hover:underline'>
                            {name}
                          </button>
                          <code className='block truncate font-mono text-[11px] text-default-400'>{tpl.templateKey}</code>
                        </td>
                        <td className='px-4 py-3'>
                          <TypeBadge type={type} />
                        </td>
                        <td className='px-4 py-3 font-mono text-[13px] tabular-nums text-default-500'>
                          {tpl.activeVersion?.version || '1'}
                        </td>
                        <td className='whitespace-nowrap px-4 py-3 text-[13px] text-default-500'>
                          {tpl.updatedDatetime ? dayjs(new Date(tpl.updatedDatetime)).fromNow() : '—'}
                        </td>
                        <td className='px-4 py-3 font-mono text-[13px] tabular-nums text-default-500'>
                          {volume > 0 ? volume.toLocaleString() : '—'}
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex items-center justify-end gap-1'>
                            <Button
                              size='sm'
                              variant='bordered'
                              className='h-9 border-default-300 font-medium'
                              onPress={() => openTemplate(tpl)}>
                              Open
                            </Button>
                            <CopyButton text={tpl.templateKey || ''} />
                            <Button
                              isIconOnly
                              size='sm'
                              variant='light'
                              aria-label={`Delete ${name}`}
                              className='h-9 w-9 min-w-9 text-default-500 hover:text-danger'
                              onPress={() => tpl.templateKey && requestDelete(tpl.templateKey)}>
                              <Icon icon='lucide:trash-2' className='h-4 w-4' />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
          <ul className='grid grid-cols-1 border-l border-t border-divider sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
            {filtered.map(tpl => {
              const type = getTemplateType(tpl)
              const perf = tpl.templateKey ? perfByKey[tpl.templateKey] : undefined
              const volume = perf ? Number(perf.totalGenerations) || 0 : 0
              const successRate = perf && volume > 0 ? Number(perf.successRate) : null
              const avgDurationMs = perf ? Number(perf.avgDurationMs) : 0
              const hasActivity = volume > 0
              const name = tpl.name || 'Untitled'

              return (
                <li
                  key={tpl.id}
                  className='group relative flex flex-col border-b border-r border-divider bg-content1 transition-colors hover:bg-content2/50'>
                  {/* Paper surface with document preview */}
                  <div className='flex h-44 items-center justify-center border-b border-divider bg-[#FFFFFF] p-4'>
                    <div className='h-36 w-[104px] overflow-hidden border border-black/10 bg-[#FFFFFF] shadow-[0_8px_20px_-12px_rgba(0,0,0,.6)]'>
                      {tpl.activeVersion?.previewFilePathPresigned ? (
                        <PdfThumbnail
                          url={tpl.activeVersion.previewFilePathPresigned}
                          templateKey={tpl.templateKey}
                          templateType={type}
                          templateName={tpl.name}
                        />
                      ) : (
                        <div className='flex h-full w-full items-center justify-center'>
                          <FileIcon type={type} size='sm' />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='flex flex-1 flex-col gap-3 p-4'>
                    <div className='flex items-start justify-between gap-3'>
                      <button
                        type='button'
                        onClick={() => openTemplate(tpl)}
                        className='min-w-0 text-left after:absolute after:inset-0 after:content-[""] focus-visible:outline-none'
                        title={name}>
                        <h3 className='line-clamp-2 break-words text-[16px] font-semibold leading-snug text-foreground'>{name}</h3>
                      </button>
                      <TypeBadge type={type} />
                    </div>

                    <p className='text-[13px] text-default-500'>
                      Version {tpl.activeVersion?.version || '1'} · Updated{' '}
                      {tpl.updatedDatetime ? dayjs(new Date(tpl.updatedDatetime)).fromNow() : '—'}
                    </p>

                    <dl className='grid grid-cols-3 gap-3'>
                      {[
                        { label: 'Runs', value: hasActivity ? volume.toLocaleString() : '—' },
                        { label: 'Success', value: successRate === null ? '—' : `${successRate.toFixed(0)}%` },
                        { label: 'Avg time', value: hasActivity ? formatDuration(avgDurationMs) : '—' }
                      ].map(stat => (
                        <div key={stat.label}>
                          <dt className='text-[13px] text-default-500'>{stat.label}</dt>
                          <dd
                            className={cn(
                              'mt-0.5 font-mono text-[14px] tabular-nums text-foreground',
                              stat.label === 'Success' && successRate !== null && successRate < 90 && 'text-warning'
                            )}>
                            {stat.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className='-mt-1 text-[12px] text-default-500'>
                      Stats for {statsRangeShort}
                    </p>

                    {/* Footer: key + actions (z-10 so they sit above the card-wide click target) */}
                    <div className='relative z-10 mt-auto flex items-center gap-2 border-t border-divider pt-3'>
                      <Button
                        variant='bordered'
                        className='h-10 border-default-300 font-medium'
                        endContent={<Icon icon='lucide:arrow-right' className='h-4 w-4' />}
                        onPress={() => openTemplate(tpl)}>
                        Open
                      </Button>
                      <div className='flex min-h-10 min-w-0 flex-1 items-center gap-1 pl-1'>
                        <span className='sr-only'>Template key</span>
                        <code className='min-w-0 flex-1 truncate font-mono text-[11px] text-default-400' title={tpl.templateKey || ''}>
                          {tpl.templateKey}
                        </code>
                        <CopyButton text={tpl.templateKey || ''} className='shrink-0' />
                      </div>
                      <Tooltip content='Delete template' placement='top'>
                        <Button
                          isIconOnly
                          variant='light'
                          aria-label={`Delete ${name}`}
                          className='h-10 w-10 min-w-10 text-default-500 hover:text-danger'
                          onPress={() => tpl.templateKey && requestDelete(tpl.templateKey)}>
                          <Icon icon='lucide:trash-2' className='h-4 w-4' />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          )}

          {hasMore && (
            <div className='flex justify-center'>
              <Button
                variant='bordered'
                className='h-10 border-default-300 font-medium'
                isLoading={isLoadingMore}
                onPress={loadMore}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      <DeleteTemplateModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onSuccess={() => {
          if (templateToDelete) {
            setTemplates(prev => prev.filter(t => t.templateKey !== templateToDelete))
            setTotalCount(n => Math.max(0, n - 1))
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
