'use client'

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Select, SelectItem, Skeleton } from '@heroui/react'
import { useRouteParams } from '@/hooks/use-route-params'
import { useMediaQuery } from 'usehooks-ts'
import { endOfMonth, format, parse, startOfMonth } from 'date-fns'
import Icon from '@/components/icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { useProject } from '@/providers/ProjectContext'
import { api } from '@/api/generated/main-service'
import type { GenerationDto, PaginatedListOfGenerationDto, ReportJobDto } from '@/api/generated/main-service/apiGenerated'
import { formatDuration } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import FileTypeBadge from '@/components/common/FileTypeBadge'

const POLL_INTERVAL = 4000
const PAGE_SIZE = 15

type StatusFilter = 'all' | 'success' | 'failed'

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'success', label: 'Success' },
  { key: 'failed', label: 'Failed' }
]

/** Merges a fresh first page into the loaded rows: updates rows it already has, prepends new ones, keeps the rest. */
const mergeById = (fresh: GenerationDto[], loaded: GenerationDto[]): GenerationDto[] => {
  const freshById = new Map(fresh.map(item => [item.id, item]))
  const loadedIds = new Set(loaded.map(item => item.id))
  const added = fresh.filter(item => !loadedIds.has(item.id))
  return [...added, ...loaded.map(item => freshById.get(item.id) ?? item)]
}

/** Appends a page, skipping rows already loaded (new jobs shift the server's pages). */
const appendUnique = (loaded: GenerationDto[], page: GenerationDto[]): GenerationDto[] => {
  const ids = new Set(loaded.map(item => item.id))
  return [...loaded, ...page.filter(item => !ids.has(item.id))]
}

const formatBytes = (bytes: number | null | undefined): string => {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const isSuccessStatus = (status?: string | null): boolean => {
  const s = status?.toLowerCase()
  return s === 'success' || s === 'completed'
}

const isRunningStatus = (status?: string | null): boolean => {
  const s = status?.toLowerCase()
  return s === 'pending' || s === 'processing' || s === 'queued'
}

// Async jobs (Pro) go pending → processing → success | failed; sync renders are success | failed.
const STATUS_LABEL: Record<string, string> = {
  pending: 'Queued',
  queued: 'Queued',
  processing: 'Rendering',
  success: 'Success',
  completed: 'Success',
  failed: 'Failed',
  error: 'Failed'
}

const StatusChip = ({ status }: { status?: string | null }) => {
  const s = status?.toLowerCase() || ''
  const ok = isSuccessStatus(s)
  const running = isRunningStatus(s)
  return (
    <span className='inline-flex items-center gap-2 text-[13px] text-default-500'>
      <Icon
        icon={ok ? 'lucide:check-circle-2' : running ? 'lucide:loader-circle' : 'lucide:alert-circle'}
        className={cn('h-3.5 w-3.5', ok ? 'text-success' : running ? 'animate-spin text-default-500' : 'text-danger')}
      />
      {STATUS_LABEL[s] || s || 'Unknown'}
    </span>
  )
}

// Times are shown in the viewer's zone; say which one.
const getTimezoneLabel = (): string => {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const offset = -new Date().getTimezoneOffset() / 60
    return `${zone} (UTC${offset >= 0 ? '+' : ''}${offset})`
  } catch {
    return 'local time'
  }
}

/** Pretty-prints the stored request (base64 already stripped by the server), capped for the page. */
const formatRequest = (raw?: string | null): string => {
  if (!raw) return ''
  try {
    const text = JSON.stringify(JSON.parse(raw), null, 2)
    return text.length > 6000 ? `${text.slice(0, 6000)}\n…` : text
  } catch {
    return raw.slice(0, 6000)
  }
}

const DownloadOrExpired = ({ item }: { item: GenerationDto }) => {
  if (!isSuccessStatus(item.status)) return null
  return item.downloadUrl ? (
    <a
      href={item.downloadUrl}
      className='inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground underline-offset-4 hover:underline'>
      <Icon icon='lucide:download' className='h-3.5 w-3.5' />
      Download
    </a>
  ) : (
    <span className='text-[13px] text-default-500' title='Generated files are kept for a limited time, then deleted.'>
      File expired
    </span>
  )
}

/** Expanded row: fetched on demand from GET /render/jobs/{id}. */
const JobDetails = ({ item }: { item: GenerationDto }) => {
  const [job, setJob] = useState<ReportJobDto | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let alive = true
    api.render
      .getRenderJobById(item.id)
      .then(res => {
        if (!alive) return
        setJob(res)
        setState('ready')
      })
      .catch(() => alive && setState('error'))
    return () => {
      alive = false
    }
  }, [item.id])

  const request = formatRequest(job?.requestData)
  const error = job?.errorMessage || item.errorMessage

  return (
    <div className='flex flex-col gap-4 bg-content2 px-5 py-4'>
      <dl className='grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4'>
        <div>
          <dt className='text-default-500'>Job ID</dt>
          <dd className='break-all font-mono text-[12px] text-foreground'>{item.id}</dd>
        </div>
        <div>
          <dt className='text-default-500'>Source</dt>
          <dd className='text-foreground'>{job?.apiKeyId ? 'API key' : job ? 'Web app' : '—'}</dd>
        </div>
        <div>
          <dt className='text-default-500'>Started</dt>
          <dd className='font-mono text-[12px] text-foreground'>
            {job?.startedAt ? format(new Date(job.startedAt), 'dd MMM yyyy, HH:mm:ss') : '—'}
          </dd>
        </div>
        <div>
          <dt className='text-default-500'>Finished</dt>
          <dd className='font-mono text-[12px] text-foreground'>
            {job?.finishedAt ? format(new Date(job.finishedAt), 'dd MMM yyyy, HH:mm:ss') : '—'}
          </dd>
        </div>
      </dl>

      {isRunningStatus(item.status) && (
        <p className='text-[13px] text-default-500'>
          This async job is still {item.status?.toLowerCase() === 'processing' ? 'rendering' : 'waiting in the queue'}. Failed
          network or storage steps are retried automatically (up to 3 tries).
        </p>
      )}

      {error && !isSuccessStatus(item.status) && (
        <div className='flex flex-col gap-1'>
          <span className='text-[13px] font-medium text-foreground'>Error</span>
          <p className='whitespace-pre-wrap break-words border-l-2 border-danger pl-3 text-[13px] text-default-600'>{error}</p>
        </div>
      )}

      <div className='flex flex-col gap-1'>
        <span className='text-[13px] font-medium text-foreground'>Request</span>
        {state === 'loading' ? (
          <Skeleton className='h-16 w-full' />
        ) : state === 'error' ? (
          <p className='text-[13px] text-default-500'>Request details are not available for this job.</p>
        ) : request ? (
          <pre className='max-h-72 overflow-auto border border-divider bg-background p-3 font-mono text-[12px] leading-relaxed text-default-600'>
            {request}
          </pre>
        ) : (
          <p className='text-[13px] text-default-500'>
            The request body was not stored (request logging is off for this project).
          </p>
        )}
      </div>
    </div>
  )
}

const TypeBadge = ({ type }: { type?: string | null }) => <FileTypeBadge type={type} />

const HistorySkeleton = () => (
  <div className='flex w-full flex-col divide-y divide-divider'>
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className='flex items-center gap-4 px-5 py-4'>
        <div className='flex flex-1 flex-col gap-2'>
          <Skeleton className='h-3.5 w-40' />
          <Skeleton className='h-3 w-24' />
        </div>
        <Skeleton className='h-5 w-20' />
      </div>
    ))}
  </div>
)


// --- Main ---
const ProjectHistory = () => {
  const params = useRouteParams()
  const id = params.id as string
  const { currentProject } = useProject()

  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
  const [activityData, setActivityData] = useState<GenerationDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isPolling, setIsPolling] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [openRow, setOpenRow] = useState<string | null>(null)
  // Resolved after mount so server and browser render the same first frame.
  const [timezoneLabel, setTimezoneLabel] = useState('local time')
  useEffect(() => setTimezoneLabel(getTimezoneLabel()), [])
  const HEADERS = ['Template', 'Type', 'Date & time', 'Duration', 'Size', 'Status', '']
  const toggleRow = (rowId: string) => setOpenRow(prev => (prev === rowId ? null : rowId))
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const months = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') }
    })
  }, [])

  const getQueryDates = useCallback(() => {
    const selectedDate = parse(selectedMonth, 'yyyy-MM', new Date())
    return {
      fromDate: startOfMonth(selectedDate).toISOString(),
      toDate: endOfMonth(selectedDate).toISOString()
    }
  }, [selectedMonth])

  // Only the current month can receive new rows, so only it is polled.
  const isCurrentMonth = selectedMonth === format(new Date(), 'yyyy-MM')

  // Bumped whenever the query (project, month, status) changes; responses for an older query are dropped.
  const querySeq = useRef(0)

  const queryFor = useCallback(
    (page: number) => {
      const { fromDate, toDate } = getQueryDates()
      return {
        projectId: id,
        status: statusFilter === 'all' ? undefined : statusFilter,
        fromDate,
        toDate,
        pageNumber: page,
        pageSize: PAGE_SIZE
      }
    },
    [id, getQueryDates, statusFilter]
  )

  const fetchPage = useCallback(
    async (page: number, silent = false) => {
      if (!id || typeof id !== 'string') return
      const seq = querySeq.current
      if (!silent) setLoading(true)
      try {
        const res: PaginatedListOfGenerationDto = await api.analytics.generationsList(queryFor(page))
        if (seq !== querySeq.current) return
        const items = res.items ?? []
        setActivityData(prev => (page === 1 ? items : appendUnique(prev, items)))
        setTotalCount(Number(res.totalCount ?? 0))
        setHasMore(res.hasNextPage ?? false)
        setCurrentPage(page)
      } catch (err) {
        console.error('Failed to fetch history', err)
      } finally {
        if (!silent && seq === querySeq.current) setLoading(false)
      }
    },
    [id, queryFor]
  )

  const pollData = useCallback(async () => {
    if (!id || typeof id !== 'string') return
    const seq = querySeq.current
    try {
      const res: PaginatedListOfGenerationDto = await api.analytics.generationsList(queryFor(1))
      if (seq !== querySeq.current) return
      setTotalCount(Number(res.totalCount ?? 0))
      setActivityData(prev => mergeById(res.items ?? [], prev))
    } catch (err) {
      console.error('Polling failed', err)
    }
  }, [id, queryFor])

  useEffect(() => {
    querySeq.current += 1
    setActivityData([])
    setCurrentPage(1)
    setHasMore(true)
    setOpenRow(null)
    fetchPage(1)
  }, [fetchPage])

  useEffect(() => {
    if (!isPolling || !isCurrentMonth) return
    pollingRef.current = setInterval(() => {
      pollData()
    }, POLL_INTERVAL)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [isPolling, isCurrentMonth, pollData])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    fetchPage(currentPage + 1, true).finally(() => setLoadingMore(false))
  }, [loadingMore, hasMore, currentPage, fetchPage])

  const handleRefresh = useCallback(() => {
    querySeq.current += 1
    setLoading(true)
    setActivityData([])
    setCurrentPage(1)
    setHasMore(true)
    setTimeout(() => fetchPage(1), 800)
  }, [fetchPage])

  const handleMonthChange = (month: string) => {
    if (!month) return
    setSelectedMonth(month)
    setActivityData([])
    setCurrentPage(1)
    setHasMore(true)
  }

  // The status filter is applied by the server; this only hides rows whose status changed since (polling).
  const visibleRows = useMemo(() => {
    if (statusFilter === 'all') return activityData
    return activityData.filter(item => (statusFilter === 'success') === isSuccessStatus(item.status))
  }, [activityData, statusFilter])

  // Render one layout only, so an expanded row mounts (and fetches) its details once.
  const isDesktop = useMediaQuery('(min-width: 768px)')

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        breadcrumb={[
          { label: currentProject?.name || 'Project', href: id ? `/project/${id}` : undefined },
          { label: 'History' }
        ]}
        title='Generation history'
        description={`Every document this project generated, newest first. Times are in ${timezoneLabel}. The list refreshes itself while Live is on.`}
      />

      <section className='border border-divider bg-content1'>
        {/* Toolbar — all filters in one row */}
        <div className='flex flex-col gap-3 border-b border-divider p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
            <Select
              aria-label='Month'
              selectedKeys={[selectedMonth]}
              disallowEmptySelection
              variant='bordered'
              className='w-full sm:w-52'
              onChange={e => handleMonthChange(e.target.value)}
              startContent={<Icon icon='lucide:calendar' className='h-4 w-4 text-default-500' />}
              classNames={{ trigger: 'h-10 min-h-10 border-default-300 bg-content2', value: 'text-[14px]' }}>
              {months.map(month => (
                <SelectItem key={month.value} textValue={month.label}>
                  {month.label}
                </SelectItem>
              ))}
            </Select>

            <div role='group' aria-label='Filter by status' className='flex border border-default-300'>
              {STATUS_FILTERS.map((f, index) => {
                const isActive = statusFilter === f.key
                return (
                  <button
                    key={f.key}
                    type='button'
                    aria-pressed={isActive}
                    onClick={() => setStatusFilter(f.key)}
                    className={cn(
                      'flex min-h-10 flex-1 items-center justify-center px-4 text-[13px] font-medium transition-colors sm:flex-none',
                      index > 0 && 'border-l border-default-300',
                      isActive ? 'bg-content3 text-foreground' : 'text-default-500 hover:bg-content2 hover:text-foreground'
                    )}>
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <span className='mr-auto text-[14px] text-default-500 lg:mr-2'>
              <span className='font-mono tabular-nums text-foreground'>{totalCount.toLocaleString()}</span> total
            </span>
            <Button
              variant='bordered'
              aria-pressed={isPolling && isCurrentMonth}
              isDisabled={!isCurrentMonth}
              title={isCurrentMonth ? undefined : 'Only the current month updates live'}
              onPress={() => setIsPolling(v => !v)}
              className='h-10 border-default-300 px-3 text-[13px] font-medium'
              startContent={
                <span
                  className={cn('h-2 w-2 rounded-full', isPolling && isCurrentMonth ? 'animate-pulse bg-success' : 'bg-default-400')}
                  aria-hidden
                />
              }>
              {isPolling && isCurrentMonth ? 'Live' : 'Paused'}
            </Button>
            <Button
              variant='bordered'
              onPress={handleRefresh}
              className='h-10 border-default-300 px-3 text-[13px] font-medium'
              startContent={<Icon icon='lucide:refresh-cw' className='h-4 w-4' />}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Table */}
        {loading && activityData.length === 0 ? (
          <HistorySkeleton />
        ) : visibleRows.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-2 px-6 py-16 text-center'>
            <Icon icon='lucide:inbox' className='h-8 w-8 text-default-400' />
            <p className='text-[15px] font-medium text-foreground'>
              {statusFilter !== 'all'
                ? `No ${statusFilter === 'success' ? 'successful' : 'failed'} documents in this month`
                : 'No documents generated in this month'}
            </p>
            <p className='text-[13px] text-default-500'>
              {statusFilter !== 'all'
                ? 'Choose “All” to see every request.'
                : 'Pick another month, or render a template through the API.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            {isDesktop ? (
              <div className='overflow-x-auto'>
                <table className='w-full text-left'>
                  <thead>
                    <tr className='border-b border-divider'>
                      {HEADERS.map(h => (
                        <th
                          key={h || 'actions'}
                          scope='col'
                          className={cn(
                            'px-5 py-3 text-[13px] font-medium text-default-500',
                            h === 'Status' && 'text-right'
                          )}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map(item => (
                      <React.Fragment key={item.id}>
                      <tr className={cn('border-b border-divider align-top hover:bg-content2', openRow === item.id && 'bg-content2')}>
                        <td className='max-w-[320px] px-5 py-3'>
                          <span className='block truncate text-[14px] font-medium text-foreground'>
                            {item.templateName || 'Untitled'}
                          </span>
                          <span className='block truncate font-mono text-[12px] text-default-500'>
                            {item.templateKey || item.id}
                          </span>
                        </td>
                        <td className='px-5 py-3'>
                          <TypeBadge type={item.type} />
                        </td>
                        <td className='whitespace-nowrap px-5 py-3'>
                          <span className='block text-[14px] text-foreground'>
                            {item.createdDatetime ? format(new Date(item.createdDatetime), 'dd MMM yyyy') : '—'}
                          </span>
                          <span className='block font-mono text-[12px] text-default-500'>
                            {item.createdDatetime ? format(new Date(item.createdDatetime), 'HH:mm:ss') : ''}
                          </span>
                        </td>
                        <td className='whitespace-nowrap px-5 py-3 font-mono text-[13px] tabular-nums text-default-500'>
                          {formatDuration(item.durationMs != null ? Number(item.durationMs) : null)}
                        </td>
                        <td className='whitespace-nowrap px-5 py-3 font-mono text-[13px] tabular-nums text-default-500'>
                          {formatBytes(item.fileSizeBytes != null ? Number(item.fileSizeBytes) : null)}
                        </td>
                        <td className='px-5 py-3 text-right'>
                          <StatusChip status={item.status} />
                          {item.errorMessage && !isSuccessStatus(item.status) && (
                            <p className='ml-auto mt-1 max-w-[260px] text-[12px] text-default-500' title={item.errorMessage}>
                              <span className='line-clamp-2'>{item.errorMessage}</span>
                            </p>
                          )}
                        </td>
                        <td className='whitespace-nowrap px-5 py-3'>
                          <div className='flex items-center justify-end gap-4'>
                            <DownloadOrExpired item={item} />
                            <button
                              type='button'
                              aria-expanded={openRow === item.id}
                              onClick={() => toggleRow(item.id)}
                              className='inline-flex items-center gap-1 text-[13px] font-medium text-default-500 hover:text-foreground'>
                              Details
                              <Icon
                                icon='lucide:chevron-down'
                                className={cn('h-3.5 w-3.5 transition-transform', openRow === item.id && 'rotate-180')}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {openRow === item.id && (
                        <tr className='border-b border-divider'>
                          <td colSpan={HEADERS.length} className='p-0'>
                            <JobDetails item={item} />
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Mobile */
              <ul className='divide-y divide-divider'>
                {visibleRows.map(item => (
                  <li key={item.id} className='flex flex-col gap-2 px-4 py-3.5'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='truncate text-[14px] font-medium text-foreground'>{item.templateName || 'Untitled'}</p>
                        <p className='truncate font-mono text-[12px] text-default-500'>{item.templateKey || item.id}</p>
                      </div>
                      <StatusChip status={item.status} />
                    </div>
                    <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-default-500'>
                      <TypeBadge type={item.type} />
                      <span title={timezoneLabel}>
                        {item.createdDatetime ? format(new Date(item.createdDatetime), 'dd MMM yyyy, HH:mm') : '—'}
                      </span>
                      <span className='font-mono tabular-nums'>
                        {formatDuration(item.durationMs != null ? Number(item.durationMs) : null)}
                      </span>
                      <span className='font-mono tabular-nums'>
                        {formatBytes(item.fileSizeBytes != null ? Number(item.fileSizeBytes) : null)}
                      </span>
                    </div>
                    {item.errorMessage && !isSuccessStatus(item.status) && (
                      <p className='text-[12px] text-default-500'>{item.errorMessage}</p>
                    )}
                    <div className='flex items-center gap-4'>
                      <DownloadOrExpired item={item} />
                      <button
                        type='button'
                        aria-expanded={openRow === item.id}
                        onClick={() => toggleRow(item.id)}
                        className='inline-flex min-h-9 items-center gap-1 text-[13px] font-medium text-default-500 hover:text-foreground'>
                        Details
                        <Icon icon='lucide:chevron-down' className={cn('h-3.5 w-3.5', openRow === item.id && 'rotate-180')} />
                      </button>
                    </div>
                    {openRow === item.id && <JobDetails item={item} />}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {hasMore && activityData.length > 0 && (
          <div className='flex justify-center border-t border-divider p-4'>
            <Button
              variant='bordered'
              isLoading={loadingMore}
              onPress={loadMore}
              className='h-10 border-default-300 font-medium'>
              Load more
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

export default function ProjectHistoryPage() {
  return (
    <Suspense>
      <ProjectHistory />
    </Suspense>
  )
}
