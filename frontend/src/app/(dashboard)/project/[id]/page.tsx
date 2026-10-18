'use client'

import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { Button, Select, SelectItem } from '@heroui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRouteParams } from '@/hooks/use-route-params'
import { Area, ComposedChart, Line, ResponsiveContainer } from 'recharts'
import { eachDayOfInterval, endOfMonth, format, parse, startOfMonth } from 'date-fns'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Icon from '@/components/icon'
import { PageHeader, PanelHeader } from '@/components/ui/PageHeader'
import { useProject } from '@/providers/ProjectContext'
import { api } from '@/api/generated/main-service'
import {
  DashboardSummaryDto,
  GenerationDto,
  TemplateBreakdownDto,
  UsageDataDto,
  UsageDataPointDto
} from '@/api/generated/main-service/apiGenerated'
import { formatDuration } from '@/utils/formatters'
import { cn } from '@/utils/cn'

dayjs.extend(relativeTime)

// App mode is calm: charts stay neutral; colour only appears as small type dots.
// currentColor + a text token keeps the trend line readable in both themes.
const CHART_NEUTRAL = 'currentColor'
// The API reports template types as PDF/Excel; the app calls them Word/Excel (the source file type).
const typeLabel = (type?: string | null) => ((type || '').toLowerCase().includes('excel') ? 'Excel' : 'Word')

/** 0 · half · max with a "nice" max (1, 2, 5 × 10ⁿ) so the axis reads naturally. */
const niceMax = (value: number) => {
  if (value <= 4) return 4
  const pow = 10 ** Math.floor(Math.log10(value))
  const n = value / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}

const LABEL = 'text-[14px] font-medium text-default-500'

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

const useMonthOptions = () =>
  useMemo(() => {
    const today = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') }
    })
  }, [])

// --- Status chip ---
const StatusChip = ({ status }: { status?: string | null }) => {
  const ok = isSuccessStatus(status)
  return (
    <span className='inline-flex items-center gap-2 text-[13px] capitalize text-default-500'>
      <Icon
        icon={ok ? 'lucide:check-circle-2' : 'lucide:alert-circle'}
        className={cn('h-3.5 w-3.5', ok ? 'text-success' : 'text-danger')}
      />
      {status?.toLowerCase() || 'unknown'}
    </span>
  )
}

// --- Stat cell ---
const StatCell = ({
  label,
  value,
  hint,
  trend,
  trendColor = CHART_NEUTRAL,
  children
}: {
  label: string
  value: string | number
  hint?: string
  trend?: number[]
  trendColor?: string
  children?: React.ReactNode
}) => (
  <div className='flex min-h-[96px] flex-col justify-between gap-3 bg-content1 px-5 py-4'>
    <div className='flex items-start justify-between gap-3'>
      <div className='min-w-0'>
        <p className={LABEL}>{label}</p>
        <p className='mt-1 text-[24px] font-semibold leading-tight tabular-nums text-foreground'>{value}</p>
        {hint && <p className='mt-0.5 text-[13px] text-default-500'>{hint}</p>}
      </div>
      {trend && trend.length > 1 && (
        <div className='h-10 w-24 shrink-0 text-default-500' aria-hidden>
          <ResponsiveContainer width='100%' height='100%'>
            <ComposedChart data={trend.map(v => ({ v }))}>
              <defs>
                <linearGradient id={`grad-${label.replace(/\W/g, '')}`} x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor={trendColor} stopOpacity={0.2} />
                  <stop offset='100%' stopColor={trendColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type='linear'
                dataKey='v'
                stroke='none'
                fill={`url(#grad-${label.replace(/\W/g, '')})`}
                isAnimationActive={false}
              />
              <Line type='linear' dataKey='v' stroke={trendColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
    {children}
  </div>
)

// --- Volume chart ---
const VolumeChart = ({ data }: { data: { date: string; requests: number }[] }) => {
  const maxRequests = niceMax(Math.max(...data.map(d => d.requests), 1))
  const total = data.reduce((acc, d) => acc + d.requests, 0)
  const ticks = [maxRequests, maxRequests / 2, 0]

  return (
    <section className='border border-divider bg-content1'>
      <PanelHeader
        title='Requests per day'
        description='Every document generated through the API in the selected month.'
        actions={
          <span className='text-[14px] text-default-500'>
            Total <span className='font-mono tabular-nums text-foreground'>{total.toLocaleString()}</span>
          </span>
        }
      />
      <div className='flex h-[180px] gap-3 px-5 pb-8 pt-5' role='img' aria-label={`Bar chart: ${total} requests this month`}>
        <div className='flex h-full w-8 shrink-0 flex-col justify-between text-right font-mono text-[11px] tabular-nums text-default-500' aria-hidden>
          {ticks.map(t => (
            <span key={t} className='-translate-y-1/2 first:translate-y-0 last:translate-y-0'>
              {t.toLocaleString()}
            </span>
          ))}
        </div>
        <div className='relative flex h-full flex-1 items-end gap-[3px] border-b border-l border-default-300'>
          <div className='pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-divider' aria-hidden />
          {data.map((item, index) => {
            const height = Math.max((item.requests / maxRequests) * 100, item.requests > 0 ? 4 : 0)
            const showLabel = index % 5 === 0 || index === data.length - 1
            return (
              <div key={item.date} className='group relative flex h-full min-w-0 flex-1 items-end justify-center'>
                <div
                  className='w-full max-w-[20px] bg-default-400 transition-colors group-hover:bg-foreground'
                  style={{ height: `${height}%` }}
                />
                {item.requests === 0 && <div className='absolute bottom-0 h-px w-full max-w-[20px] bg-default-300' />}
                {showLabel && (
                  <span className='absolute top-full mt-2 font-mono text-[11px] text-default-500'>
                    {format(new Date(item.date), 'dd')}
                  </span>
                )}
                <div className='pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap border border-default-300 bg-content3 px-2 py-1 font-mono text-[12px] text-foreground group-hover:block'>
                  {format(new Date(item.date), 'dd MMM')} · {item.requests}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// --- Recent activity ---
const RecentActivity = ({
  items,
  historyHref,
  projectId
}: {
  items: GenerationDto[]
  historyHref: string
  projectId: string
}) => (
  <section className='border border-divider bg-content1'>
    <PanelHeader
      title='Recent activity'
      description='The last five documents generated.'
      actions={
        <Link
          href={historyHref}
          className='inline-flex min-h-10 items-center gap-2 text-[14px] font-medium text-default-500 underline-offset-4 transition-colors hover:text-foreground hover:underline'>
          View all history
          <Icon icon='lucide:arrow-right' className='h-4 w-4' />
        </Link>
      }
    />

    {items.length === 0 ? (
      <div className='flex flex-col items-center justify-center gap-2 px-6 py-14 text-center'>
        <Icon icon='lucide:inbox' className='h-8 w-8 text-default-400' />
        <p className='text-[14px] text-default-500'>No documents generated this month yet.</p>
      </div>
    ) : (
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[640px] text-left'>
          <thead>
            <tr className='border-b border-divider'>
              {['Template', 'Status', 'When', 'Duration', 'Size', ''].map(h => (
                <th key={h || 'actions'} scope='col' className='px-5 py-3 text-[13px] font-medium text-default-500'>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 5).map((item, index) => (
              <tr key={item.id || index} className='border-b border-divider last:border-0 hover:bg-content2'>
                <td className='max-w-[280px] px-5 py-3'>
                  <span className='block truncate text-[14px] font-medium text-foreground' title={item.templateName || ''}>
                    {item.templateName || 'Direct upload'}
                  </span>
                  <span className='block text-[12px] text-default-500'>{typeLabel(item.type)}</span>
                </td>
                <td className='px-5 py-3'>
                  <StatusChip status={item.status} />
                </td>
                <td className='whitespace-nowrap px-5 py-3 text-[13px] text-default-500'>
                  {item.createdDatetime ? dayjs(item.createdDatetime).fromNow() : 'Just now'}
                </td>
                <td className='whitespace-nowrap px-5 py-3 font-mono text-[13px] tabular-nums text-default-500'>
                  {formatDuration(item.durationMs != null ? Number(item.durationMs) : null)}
                </td>
                <td className='whitespace-nowrap px-5 py-3 font-mono text-[13px] tabular-nums text-default-500'>
                  {formatBytes(item.fileSizeBytes != null ? Number(item.fileSizeBytes) : null)}
                </td>
                <td className='whitespace-nowrap px-5 py-3 text-right'>
                  <div className='flex items-center justify-end gap-3 text-[13px] font-medium'>
                    {item.downloadUrl && isSuccessStatus(item.status) && (
                      <a href={item.downloadUrl} className='text-default-500 underline-offset-4 hover:text-foreground hover:underline'>
                        Download
                      </a>
                    )}
                    {item.templateKey && (
                      <Link
                        href={`/${typeLabel(item.type) === 'Excel' ? 'excel' : 'pdf'}/templates/${item.templateKey}?projectId=${projectId}`}
                        className='text-default-500 underline-offset-4 hover:text-foreground hover:underline'>
                        Open template
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
)

// --- Main Page ---
const ProjectDashboard = () => {
  const router = useRouter()
  const params = useRouteParams()
  const id = params.id as string
  const { currentProject } = useProject()
  const months = useMonthOptions()

  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
  const [loading, setLoading] = useState(true)

  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaryDto | null>(null)
  const [usageData, setUsageData] = useState<UsageDataDto | null>(null)
  const [recentGenerations, setRecentGenerations] = useState<GenerationDto[]>([])
  const [lastTemplate, setLastTemplate] = useState<{ name: string; href: string } | null>(null)

  // "Open last template": the most recently generated template, else the newest template.
  useEffect(() => {
    if (!id) return
    api.templates
      .templatesList({ projectId: id, pageNumber: 1, pageSize: 1 })
      .then(res => {
        const tpl = res?.items?.[0]
        if (!tpl) return
        const base = (tpl.activeVersion?.filePath || '').toLowerCase().endsWith('.xlsx') ? 'excel' : 'pdf'
        setLastTemplate(prev => prev ?? { name: tpl.name, href: `/${base}/templates/${tpl.templateKey}?projectId=${id}` })
      })
      .catch(() => {
        // optional shortcut
      })
  }, [id])

  useEffect(() => {
    const recent = recentGenerations.find(g => g.templateKey)
    if (recent?.templateKey)
      setLastTemplate({
        name: recent.templateName || recent.templateKey,
        href: `/${typeLabel(recent.type) === 'Excel' ? 'excel' : 'pdf'}/templates/${recent.templateKey}?projectId=${id}`
      })
  }, [recentGenerations, id])

  useEffect(() => {
    const fetchAll = async () => {
      if (!id || typeof id !== 'string') return
      setLoading(true)
      try {
        const selectedDate = parse(selectedMonth, 'yyyy-MM', new Date())
        const fromDate = startOfMonth(selectedDate).toISOString()
        const toDate = endOfMonth(selectedDate).toISOString()

        const [summaryRes, usageRes, generationsRes] = await Promise.all([
          api.analytics.dashboardSummaryList({ projectId: id, fromDate, toDate }),
          api.analytics.usageList({ groupBy: 'day', projectId: id, fromDate, toDate }),
          api.analytics.generationsList({
            projectId: id,
            fromDate,
            toDate,
            pageNumber: 1,
            pageSize: 5,
            sortBy: 'createdDatetime',
            sortDirection: 'desc'
          })
        ])

        setDashboardSummary(summaryRes)
        setUsageData(usageRes)
        setRecentGenerations(generationsRes?.items || [])
      } catch {
        // handled by API interceptor
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [id, selectedMonth])

  const volumeChartData = useMemo(() => {
    const selectedDate = parse(selectedMonth, 'yyyy-MM', new Date())
    const allDays = eachDayOfInterval({ start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) })
    const dataMap = new Map<string, number>()
    usageData?.data?.forEach((d: UsageDataPointDto) => {
      if (d.date) dataMap.set(format(new Date(d.date), 'yyyy-MM-dd'), Number(d.count) || 0)
    })
    return allDays.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd')
      return { date: dateKey, requests: dataMap.get(dateKey) || 0 }
    })
  }, [usageData, selectedMonth])

  const trendData = useMemo(() => (dashboardSummary?.totalGeneratedTrend || []).map(Number), [dashboardSummary])
  const successRateTrendData = useMemo(() => (dashboardSummary?.successRateTrend || []).map(Number), [dashboardSummary])

  const templateBreakdown = useMemo(
    () =>
      (dashboardSummary?.templateBreakdown || []).map((b: TemplateBreakdownDto) => ({
        name: typeLabel(b.type),
        value: Number(b.count) || 0
      })),
    [dashboardSummary]
  )
  const breakdownTotal = templateBreakdown.reduce((acc, b) => acc + b.value, 0) || 1
  const monthLabel = months.find(m => m.value === selectedMonth)?.label || selectedMonth

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        breadcrumb={[{ label: 'Project' }, { label: currentProject?.name || '…' }]}
        title='Project overview'
        description={`How this project is doing in ${monthLabel}.`}
        actions={
          <>
            <Select
              aria-label='Month'
              selectedKeys={[selectedMonth]}
              disallowEmptySelection
              variant='bordered'
              className='w-full sm:w-52'
              onChange={e => e.target.value && setSelectedMonth(e.target.value)}
              startContent={<Icon icon='lucide:calendar' className='h-4 w-4 text-default-500' />}
              classNames={{ trigger: 'h-10 min-h-10 border-transparent bg-content2 data-[hover=true]:border-default-300 data-[open=true]:border-foreground data-[focus=true]:border-foreground', value: 'text-[14px]' }}>
              {months.map(month => (
                <SelectItem key={month.value} textValue={month.label}>
                  {month.label}
                </SelectItem>
              ))}
            </Select>
            {lastTemplate ? (
              <>
                <Button
                  variant='bordered'
                  className='h-10 border-default-300 font-medium'
                  startContent={<Icon icon='lucide:plus' className='h-4 w-4' />}
                  onPress={() => router.push(`/pdf/templates/create?projectId=${id}`)}>
                  New template
                </Button>
                <Button
                  color='primary'
                  className='h-10 max-w-[280px] font-medium'
                  title={lastTemplate.name}
                  endContent={<Icon icon='lucide:arrow-right' className='h-4 w-4 shrink-0' />}
                  onPress={() => router.push(lastTemplate.href)}>
                  <span className='truncate'>Open {lastTemplate.name}</span>
                </Button>
              </>
            ) : (
              <Button
                color='primary'
                className='h-10 font-medium'
                startContent={<Icon icon='lucide:plus' className='h-4 w-4' />}
                onPress={() => router.push(`/pdf/templates/create?projectId=${id}`)}>
                New template
              </Button>
            )}
          </>
        }
      />

      {/* Stats — shared-border grid */}
      <div
        className={cn(
          'grid grid-cols-1 gap-px border border-divider bg-divider sm:grid-cols-3',
          loading && 'opacity-60 transition-opacity'
        )}
        aria-busy={loading}>
        <StatCell
          label='Requests'
          value={Number(dashboardSummary?.totalGenerated ?? 0).toLocaleString()}
          hint='Documents generated'
          trend={trendData}
        />
        <StatCell
          label='Success rate'
          value={
            Number(dashboardSummary?.totalGenerated ?? 0) > 0 && dashboardSummary?.successRate != null
              ? `${Number(dashboardSummary.successRate).toFixed(1)}%`
              : '—'
          }
          hint='Requests that completed'
          trend={successRateTrendData}
        />
        <StatCell label='Templates' value={Number(dashboardSummary?.totalTemplates ?? 0).toLocaleString()}>
          {templateBreakdown.length > 0 ? (
            <ul className='space-y-2'>
              {templateBreakdown.slice(0, 3).map(item => (
                <li key={item.name}>
                  <div className='flex items-center justify-between text-[14px]'>
                    <span className='text-default-500'>{item.name}</span>
                    <span className='font-mono tabular-nums text-foreground'>{item.value}</span>
                  </div>
                  <div className='mt-1 h-1 w-full bg-content3'>
                    <div className='h-full bg-default-400' style={{ width: `${(item.value / breakdownTotal) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-[14px] text-default-500'>No templates yet</p>
          )}
        </StatCell>
      </div>

      <RecentActivity items={recentGenerations} historyHref={`/project/${id}/history`} projectId={id} />

      <VolumeChart data={volumeChartData} />
    </div>
  )
}

export default function ProjectDashboardPage() {
  return (
    <Suspense>
      <ProjectDashboard />
    </Suspense>
  )
}
