'use client'

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Button, Chip, Select, SelectItem, Skeleton } from '@heroui/react'
import Icon from '@/components/icon'
import FileIcon from '@/components/FileIcon'
import { useRouter, useParams } from 'next/navigation'
import { useProject } from '@/providers/ProjectContext'
import { api } from '@/api/generated/main-service'
import type { GenerationDto, PaginatedListOfGenerationDto } from '@/api/generated/main-service/apiGenerated'
import { format, startOfMonth, endOfMonth, parse } from 'date-fns'
import clsx from 'clsx'

import { formatDuration, formatFileSize } from '@/utils/formatters'

const POLL_INTERVAL = 4000
const PAGE_SIZE = 15

// --- Toolbar ---
const HistoryToolbar = ({
  projectName,
  selectedMonth,
  onMonthChange,
  onRefresh,
  isPolling,
  totalCount
}: {
  projectName: string
  selectedMonth: string
  onMonthChange: (month: string) => void
  onRefresh: () => void
  isPolling: boolean
  totalCount: number
}) => {
  const months = useMemo(() => {
    const today = new Date()
    const result = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      result.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy'),
        month: format(d, 'MMMM'),
        year: format(d, 'yyyy')
      })
    }
    return result
  }, [])

  return (
    <div className='flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between'>
      {/* Title */}
      <div className='flex items-center gap-2.5'>
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10'>
          <Icon icon='lucide:history' className='h-4 w-4 text-primary' />
        </div>
        <h1 className='text-base font-bold text-foreground'>History</h1>
      </div>

      {/* Controls */}
      <div className='flex items-center gap-2'>
        <Select
          aria-label='Select Month'
          placeholder='Select Month'
          selectedKeys={[selectedMonth]}
          className='flex-1 sm:w-48 sm:flex-none'
          size='sm'
          onChange={e => onMonthChange(e.target.value)}
          startContent={<Icon icon='lucide:calendar' className='h-4 w-4 text-default-400' />}
          classNames={{
            value: 'text-sm font-medium',
            trigger: 'bg-content2 hover:bg-content3 data-[hover=true]:bg-content3'
          }}
          renderValue={items =>
            items.map(item => {
              const m = months.find(m => m.value === item.key)
              return (
                <div key={item.key} className='flex items-center gap-1.5'>
                  <span className='font-semibold text-foreground'>{m?.month}</span>
                  <span className='text-default-500'>{m?.year}</span>
                </div>
              )
            })
          }>
          {months.map(month => (
            <SelectItem key={month.value} textValue={month.label}>
              <div className='flex w-full items-center justify-between gap-8'>
                <span className='font-medium text-default-700'>{month.month}</span>
                <span className='rounded-full bg-content3 px-2 py-0.5 text-xs font-bold text-default-400'>
                  {month.year}
                </span>
              </div>
            </SelectItem>
          ))}
        </Select>

        {/* Live indicator */}
        <div className='flex shrink-0 items-center gap-1.5'>
          <div className={clsx('h-2 w-2 rounded-full', isPolling ? 'animate-pulse bg-success' : 'bg-default-300')} />
          <span className='hidden text-xs font-medium text-default-400 sm:inline'>{isPolling ? 'Live' : 'Paused'}</span>
        </div>

        {/* Refresh */}
        <Button
          size='sm'
          variant='flat'
          className='h-8 shrink-0 gap-1 rounded-md bg-content2 px-3 text-xs font-bold text-default-600 hover:bg-content3'
          onPress={onRefresh}
          startContent={<Icon icon='lucide:refresh-cw' className='h-3.5 w-3.5' />}>
          <span className='hidden sm:inline'>Now</span>
        </Button>
      </div>
    </div>
  )
}

// --- Skeleton ---
const HistorySkeleton = () => (
  <div className='flex w-full flex-col divide-y divide-default-100'>
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className='flex items-center gap-3 px-5 py-4'>
        <Skeleton className='h-8 w-8 shrink-0 rounded-lg' />
        <div className='flex flex-1 flex-col gap-1.5'>
          <Skeleton className='h-3.5 w-32 rounded-md' />
          <Skeleton className='h-2.5 w-20 rounded-md' />
        </div>
        <Skeleton className='h-5 w-16 rounded-full' />
      </div>
    ))}
  </div>
)

// --- Main ---
const ProjectHistory = () => {
  const router = useRouter()
  const params = useParams()
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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const getQueryDates = useCallback(() => {
    const selectedDate = parse(selectedMonth, 'yyyy-MM', new Date())
    return {
      fromDate: startOfMonth(selectedDate).toISOString(),
      toDate: endOfMonth(selectedDate).toISOString()
    }
  }, [selectedMonth])

  const fetchPage = useCallback(
    async (page: number, silent = false) => {
      if (!id || typeof id !== 'string') return
      if (!silent) setLoading(true)
      try {
        const { fromDate, toDate } = getQueryDates()
        const res: PaginatedListOfGenerationDto = await api.analytics.generationsList({
          projectId: id,
          fromDate,
          toDate,
          pageNumber: page,
          pageSize: PAGE_SIZE
        })
        if (page === 1) {
          setActivityData(res.items ?? [])
        } else {
          setActivityData(prev => [...prev, ...(res.items ?? [])])
        }
        setTotalCount(Number(res.totalCount ?? 0))
        setHasMore(res.hasNextPage ?? false)
        setCurrentPage(page)
      } catch (err) {
        console.error('Failed to fetch history', err)
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [id, getQueryDates]
  )

  const pollData = useCallback(async () => {
    if (!id || typeof id !== 'string') return
    try {
      const { fromDate, toDate } = getQueryDates()
      const res: PaginatedListOfGenerationDto = await api.analytics.generationsList({
        projectId: id,
        fromDate,
        toDate,
        pageNumber: 1,
        pageSize: PAGE_SIZE
      })
      setTotalCount(Number(res.totalCount ?? 0))
      const newItems = res.items ?? []
      setActivityData(prev => {
        if (currentPage === 1) return newItems
        return [...newItems, ...prev.slice(PAGE_SIZE)]
      })
    } catch (err) {
      console.error('Polling failed', err)
    }
  }, [id, getQueryDates, currentPage])

  useEffect(() => {
    setActivityData([])
    setCurrentPage(1)
    setHasMore(true)
    fetchPage(1)
  }, [fetchPage])

  useEffect(() => {
    if (!isPolling) return
    pollingRef.current = setInterval(() => { pollData() }, POLL_INTERVAL)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [isPolling, pollData])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    fetchPage(currentPage + 1, true).finally(() => setLoadingMore(false))
  }, [loadingMore, hasMore, currentPage, fetchPage])

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const docHeight = document.documentElement.scrollHeight
      if (scrollTop + windowHeight >= docHeight - 200) loadMore()
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadingMore, hasMore, currentPage, loadMore])

  const handleRefresh = useCallback(() => {
    setLoading(true)
    setActivityData([])
    setCurrentPage(1)
    setHasMore(true)
    setTimeout(() => fetchPage(1), 800)
  }, [fetchPage])

  return (
    <div className='flex flex-col rounded-xl border border-default-200 bg-background'>
      {/* Toolbar */}
      <div className='border-b border-default-100'>
        <HistoryToolbar
          projectName={currentProject?.name || 'Loading...'}
          selectedMonth={selectedMonth}
          onMonthChange={month => { setSelectedMonth(month); setActivityData([]); setCurrentPage(1); setHasMore(true) }}
          onRefresh={handleRefresh}
          isPolling={isPolling}
          totalCount={totalCount}
        />
      </div>

      {/* Sub-header */}
      <div className='flex items-center justify-between border-b border-default-100 px-5 py-3'>
        <h3 className='text-xs font-bold uppercase tracking-wider text-default-400'>Generation Logs</h3>
        <Chip size='sm' variant='flat' className='bg-content2 text-xs font-bold text-default-600'>
          {totalCount} Records
        </Chip>
      </div>

      {/* Desktop table header — hidden on mobile */}
      <div className='hidden grid-cols-12 gap-4 border-b border-default-100 bg-content2/50 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-default-400 md:grid'>
        <div className='col-span-4'>Template</div>
        <div className='col-span-1'>Type</div>
        <div className='col-span-3'>Date & Time</div>
        <div className='col-span-1'>Duration</div>
        <div className='col-span-1'>Size</div>
        <div className='col-span-2 text-right'>Status</div>
      </div>

      {/* Content */}
      <div className='w-full'>
        {loading && activityData.length === 0 ? (
          <HistorySkeleton />
        ) : (
          <>
            {activityData.map((item: GenerationDto) => (
              <div key={item.id} className='border-b border-default-100 last:border-0'>
                {/* Desktop row */}
                <div className='hidden grid-cols-12 items-center gap-4 px-6 py-4 transition-colors hover:bg-content2/50 md:grid'>
                  <div className='col-span-4 flex items-center gap-3'>
                    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-content2'>
                      <FileIcon type={(item.type?.toLowerCase() ?? 'pdf') as 'pdf' | 'excel'} size='sm' />
                    </div>
                    <div className='flex min-w-0 flex-col'>
                      <span className='truncate text-sm font-semibold text-foreground'>
                        {item.templateName || 'Untitled'}
                      </span>
                      <span className='truncate text-[10px] text-default-400'>{item.templateKey || item.id}</span>
                    </div>
                  </div>
                  <div className='col-span-1'>
                    <span className='rounded border border-default-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-default-400'>
                      {item.type || 'PDF'}
                    </span>
                  </div>
                  <div className='col-span-3 flex flex-col'>
                    <span className='text-xs font-medium text-foreground'>
                      {item.createdDatetime ? format(new Date(item.createdDatetime), 'dd MMM yyyy') : '-'}
                    </span>
                    <span className='text-[10px] text-default-400'>
                      {item.createdDatetime ? format(new Date(item.createdDatetime), 'HH:mm:ss') : '-'}
                    </span>
                  </div>
                  <div className='col-span-1'>
                    <span className='text-xs font-medium text-default-600'>
                      {formatDuration(item.durationMs != null ? Number(item.durationMs) : null)}
                    </span>
                  </div>
                  <div className='col-span-1'>
                    <span className='text-xs font-medium text-default-600'>
                      {formatFileSize(item.fileSizeBytes != null ? Number(item.fileSizeBytes) : null)}
                    </span>
                  </div>
                  <div className='col-span-2 text-right'>
                    <Chip
                      size='sm'
                      variant='flat'
                      color={
                        item.status?.toLowerCase() === 'success' || item.status?.toLowerCase() === 'completed'
                          ? 'success'
                          : 'danger'
                      }
                      className='h-5 px-2 text-[9px] font-bold uppercase'>
                      {item.status}
                    </Chip>
                  </div>
                </div>

                {/* Mobile card */}
                <div className='flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-content2/50 md:hidden'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-content2'>
                    <FileIcon type={(item.type?.toLowerCase() ?? 'pdf') as 'pdf' | 'excel'} size='sm' />
                  </div>
                  <div className='flex min-w-0 flex-1 flex-col gap-1'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold text-foreground'>
                          {item.templateName || 'Untitled'}
                        </p>
                        <p className='truncate text-[10px] text-default-400'>{item.templateKey || item.id}</p>
                      </div>
                      <Chip
                        size='sm'
                        variant='flat'
                        color={
                          item.status?.toLowerCase() === 'success' || item.status?.toLowerCase() === 'completed'
                            ? 'success'
                            : 'danger'
                        }
                        className='h-5 shrink-0 px-2 text-[9px] font-bold uppercase'>
                        {item.status}
                      </Chip>
                    </div>
                    <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-default-400'>
                      <span>{item.createdDatetime ? format(new Date(item.createdDatetime), 'dd MMM yyyy, HH:mm') : '-'}</span>
                      <span>·</span>
                      <span>{formatDuration(item.durationMs != null ? Number(item.durationMs) : null)}</span>
                      <span>·</span>
                      <span>{formatFileSize(item.fileSizeBytes != null ? Number(item.fileSizeBytes) : null)}</span>
                      <span className='rounded border border-default-200 px-1 text-[9px] font-bold uppercase'>
                        {item.type || 'PDF'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {loadingMore && (
          <div className='flex justify-center py-4'>
            <Icon icon='lucide:loader-2' className='h-5 w-5 animate-spin text-default-400' />
          </div>
        )}

        {!loading && !loadingMore && activityData.length === 0 && (
          <div className='flex flex-col items-center justify-center gap-2 py-16 text-default-400'>
            <Icon icon='lucide:inbox' className='h-10 w-10 opacity-40' />
            <span className='text-sm font-medium'>No history found</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectHistory
