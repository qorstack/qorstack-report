'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardBody, Button, Chip, Progress, Select, SelectItem, Spinner } from '@heroui/react'
import Icon from '@/components/icon'
import FileIcon from '@/components/FileIcon'
import { useRouter, useParams } from 'next/navigation'
import {
  Area,
  ResponsiveContainer,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  Bar,
  BarChart
} from 'recharts'
import { useProject } from '@/providers/ProjectContext'
import { api } from '@/api/generated/main-service'
import {
  DashboardSummaryDto,
  UsageDataDto,
  UsageDataPointDto,
  TemplatePerformanceDto,
  GenerationDto,
  TemplateBreakdownDto
} from '@/api/generated/main-service/apiGenerated'
import clsx from 'clsx'
import { format, startOfMonth, endOfMonth, parse, eachDayOfInterval } from 'date-fns'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

import { formatDuration, formatFileSize } from '@/utils/formatters'

// --- Types ---
interface MetricDataPoint {
  name: string
  value: number
  color?: string
}
type MetricData = number[] | MetricDataPoint[]

// --- Toolbar ---
const ProjectToolbar = ({
  projectName,
  onSettingsClick,
  selectedMonth,
  onMonthChange
}: {
  projectName: string
  onSettingsClick: () => void
  selectedMonth: string
  onMonthChange: (month: string) => void
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
    <div className='flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
      {/* Project name */}
      <div className='flex items-center gap-2.5'>
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10'>
          <Icon icon='lucide:box' className='h-4 w-4 text-primary' />
        </div>
        <h1 className='truncate text-base font-bold text-foreground'>{projectName}</h1>
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

        <Button
          startContent={<Icon icon='lucide:settings' className='h-3.5 w-3.5' />}
          size='sm'
          variant='flat'
          className='shrink-0 bg-content2 text-xs font-bold text-default-600 hover:bg-content3'
          onPress={onSettingsClick}>
          Settings
        </Button>
      </div>
    </div>
  )
}

// --- Metric Card ---
const ICON_MAP: Record<string, string> = {
  'Total Requests': 'lucide:activity',
  'Success Rate': 'lucide:check-circle-2',
  'Total Templates': 'lucide:layout-template',
  'Avg Latency': 'lucide:timer'
}

const MetricCard = ({
  title,
  value,
  type,
  data,
  chartColor = '#dc2626',
  badgeValue,
  badgeColor = 'text-success-500',
  limit
}: {
  title: string
  value: string | number
  type: 'sparkline' | 'donut' | 'pie' | 'bar' | 'breakdown'
  data: MetricData
  chartColor?: string
  badgeValue?: string
  badgeColor?: string
  limit?: string
}) => {
  const icon = ICON_MAP[title] || 'lucide:bar-chart-2'

  return (
    <Card className='dashboard-card shadow-none'>
      <CardBody className='p-5'>
        <div className='flex items-start justify-between gap-3'>
          {/* Left: icon + value + title */}
          <div className='flex min-w-0 flex-1 flex-col gap-3'>
            <div className='flex items-center gap-2'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-default-100 text-default-500'>
                <Icon icon={icon} className='h-4 w-4' />
              </div>
              {badgeValue && (
                <span className={clsx('text-[10px] font-bold', badgeColor)}>
                  {badgeValue}
                  <Icon icon='lucide:arrow-up-right' className='ml-0.5 inline h-3 w-3' />
                </span>
              )}
            </div>

            <div>
              <div className='flex items-baseline gap-1.5'>
                <span className='text-2xl font-extrabold tracking-tight text-foreground'>{value}</span>
                {limit && <span className='text-xs font-medium text-default-400'>{limit}</span>}
              </div>
              <span className='mt-1 block text-[10px] font-bold uppercase tracking-wider text-default-400'>{title}</span>
            </div>
          </div>

          {/* Right: chart (only non-breakdown types) */}
          {type !== 'breakdown' && (
            <div className='h-14 w-24 shrink-0'>
              <ResponsiveContainer width='100%' height='100%'>
                {type === 'sparkline' ? (
                  <ComposedChart data={(data as number[]).map(v => ({ v }))}>
                    <defs>
                      <linearGradient id={`grad-${title.replace(/\W/g, '')}`} x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='0%' stopColor={chartColor} stopOpacity={0.18} />
                        <stop offset='100%' stopColor={chartColor} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <Area
                      type='basis'
                      dataKey='v'
                      stroke='none'
                      fill={`url(#grad-${title.replace(/\W/g, '')})`}
                      isAnimationActive={false}
                    />
                    <Line
                      type='basis'
                      dataKey='v'
                      stroke={chartColor}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                ) : type === 'bar' ? (
                  <BarChart data={(data as number[]).map(v => ({ v }))}>
                    <Bar dataKey='v' fill={chartColor} radius={[2, 2, 0, 0]} />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={data as MetricDataPoint[]}
                      cx='50%'
                      cy='50%'
                      innerRadius={type === 'donut' ? 20 : 0}
                      outerRadius={28}
                      paddingAngle={0}
                      dataKey='value'
                      stroke='none'>
                      {(data as MetricDataPoint[]).map(entry => (
                        <Cell key={`cell-${entry.name}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Breakdown rows (below, full width) */}
        {type === 'breakdown' && (data as MetricDataPoint[]).length > 0 && (
          <div className='mt-4 space-y-2.5'>
            {(data as MetricDataPoint[]).slice(0, 3).map(item => {
              const total = (data as MetricDataPoint[]).reduce((acc, curr) => acc + curr.value, 0) || 1
              const percent = (item.value / total) * 100
              return (
                <div key={item.name} className='space-y-1'>
                  <div className='flex items-center justify-between text-[11px] font-bold'>
                    <div className='flex items-center gap-1.5'>
                      <Icon icon='solar:file-text-bold-duotone' className='h-3.5 w-3.5' style={{ color: item.color }} />
                      <span className='text-default-600'>{item.name}</span>
                    </div>
                    <span className='text-foreground'>{item.value}</span>
                  </div>
                  <div className='h-1.5 w-full overflow-hidden rounded-full bg-content3'>
                    <div className='h-full rounded-full' style={{ width: `${percent}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

// --- Analytics Section ---
const ProjectAnalyticsSection = ({
  volumeData,
  recentActivity,
  onViewAllHistory
}: {
  volumeData: { date: string; requests: number }[]
  recentActivity: GenerationDto[]
  onViewAllHistory: () => void
}) => {
  const maxRequests = Math.max(...volumeData.map(d => d.requests), 1)

  return (
    <div className='grid w-full grid-cols-1 gap-4 lg:grid-cols-10'>
      {/* Volume Chart */}
      <div className='lg:col-span-7'>
        <Card className='dashboard-card h-full min-h-[420px] overflow-hidden shadow-none'>
          <CardBody className='flex h-full flex-col p-0'>
            <div className='flex flex-col items-start justify-between gap-3 border-b border-default-200/50 px-6 py-5 sm:flex-row sm:items-center'>
              <div>
                <h3 className='text-sm font-bold text-foreground'>Project Volume</h3>
                <p className='mt-0.5 text-xs text-default-400'>Request traffic over time</p>
              </div>
              <Chip size='sm' variant='flat' color='primary' className='h-5 text-[10px] font-bold uppercase'>
                Requests
              </Chip>
            </div>
            <div className='h-[320px] px-5 pb-5 pt-4'>
              <div className='flex h-full items-end gap-1.5 border-b border-l border-default-200/50 px-2 pt-3'>
                {volumeData.map((item, index) => {
                  const height = Math.max((item.requests / maxRequests) * 100, item.requests > 0 ? 8 : 2)
                  const showLabel = index % 5 === 0 || index === volumeData.length - 1

                  return (
                    <div key={item.date} className='group relative flex h-full min-w-0 flex-1 items-end justify-center'>
                      <div
                        className='w-full max-w-[18px] rounded-t-[3px] bg-danger-600/85 transition-colors group-hover:bg-danger-500'
                        style={{ height: `${height}%` }}
                      />
                      {showLabel && (
                        <span className='absolute top-full mt-2 text-[9px] font-bold text-default-400'>
                          {format(new Date(item.date), 'dd')}
                        </span>
                      )}
                      <div className='pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-md border border-default-200 bg-content1 px-2 py-1 text-[10px] font-bold text-foreground shadow-lg group-hover:block'>
                        {item.requests} requests
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className='lg:col-span-3'>
        <Card className='dashboard-card h-full overflow-hidden shadow-none'>
          <CardBody className='flex h-full flex-col p-0'>
            <div className='flex items-center justify-between border-b border-default-200/50 px-5 py-4'>
              <h3 className='flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-default-400'>
                <Icon icon='lucide:activity' className='h-3 w-3' />
                Recent Activity
              </h3>
            </div>
            <div className='flex flex-1 flex-col'>
              {recentActivity.length > 0 ? (
                recentActivity.slice(0, 5).map((item, index) => (
                  <div
                    key={item.id || index}
                    className='flex items-start gap-3 border-b border-default-200/50 px-5 py-3 transition-colors last:border-0 hover:bg-content2/50'>
                    <div className='shrink-0 pt-0.5'>
                      {item.type === 'Excel' ? <FileIcon type='excel' size='sm' /> : <FileIcon type='pdf' size='sm' />}
                    </div>
                    <div className='flex min-w-0 flex-1 flex-col gap-1'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='truncate text-sm font-semibold text-foreground' title={item.templateName || ''}>
                          {item.templateName || 'Direct Upload'}
                        </span>
                        <span
                          className={clsx(
                            'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase',
                            item.status?.toLowerCase() === 'success' || item.status?.toLowerCase() === 'completed'
                              ? 'bg-success-50 text-success-600'
                              : 'bg-danger-50 text-danger-600'
                          )}>
                          {item.status}
                        </span>
                      </div>
                      <div className='flex items-center gap-1.5 text-[10px] text-default-400'>
                        <span>{item.createdDatetime ? dayjs(item.createdDatetime).fromNow() : 'Just now'}</span>
                        <span>·</span>
                        <span>{formatDuration(item.durationMs != null ? Number(item.durationMs) : null)}</span>
                        <span>·</span>
                        <span>{formatFileSize(item.fileSizeBytes != null ? Number(item.fileSizeBytes) : null)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className='flex flex-1 flex-col items-center justify-center gap-2 p-8 text-default-400'>
                  <Icon icon='lucide:inbox' className='h-8 w-8 opacity-40' />
                  <span className='text-xs'>No recent activity</span>
                </div>
              )}
            </div>
            <div className='border-t border-default-200/50 p-4'>
              <Button
                fullWidth
                variant='flat'
                size='sm'
                className='bg-content2 font-semibold text-default-600 hover:bg-content3'
                onPress={onViewAllHistory}>
                View All History
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

// --- Template Performance Matrix ---
const ProjectTemplateMatrix = ({ data, loading }: { data: TemplatePerformanceDto[]; loading: boolean }) => {
  return (
    <Card className='dashboard-card overflow-hidden shadow-none'>
      <div className='border-b border-default-200/50 px-6 py-4'>
        <h3 className='text-sm font-bold text-foreground'>Template Performance</h3>
        <p className='mt-0.5 text-xs text-default-400'>Generation stats per template this period</p>
      </div>

      {/* Desktop table */}
      <div className='hidden overflow-x-auto md:block'>
        <table className='w-full text-left'>
          <thead>
            <tr className='border-b border-default-200/50'>
              {['Template', 'Type', 'Volume', 'Avg Speed', 'Avg Size', 'Success Rate', 'Err Rate'].map(h => (
                <th
                  key={h}
                  className='px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-default-400'>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-default-100'>
            {data.map((row, i) => {
              const maxVolume = Math.max(...data.map(d => Number(d.totalGenerations) || 0), 1)
              return (
                <tr key={row.templateKey || i} className='transition-colors hover:bg-content2/50'>
                  <td className='px-6 py-4'>
                    <div className='flex items-center gap-3'>
                      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-content2'>
                        <FileIcon type='pdf' size='sm' />
                      </div>
                      <div>
                        <p className='text-sm font-semibold text-foreground'>{row.templateName || row.templateKey}</p>
                        <p className='text-[10px] font-medium text-default-400'>{row.templateKey}</p>
                      </div>
                    </div>
                  </td>
                  <td className='px-6 py-4'>
                    <span className='rounded bg-content2 px-1.5 py-0.5 text-[10px] font-bold uppercase text-default-500'>
                      {row.type || 'PDF'}
                    </span>
                  </td>
                  <td className='px-6 py-4'>
                    <div className='flex items-center gap-2'>
                      <span className='min-w-[28px] text-xs font-bold text-default-700'>
                        {row.totalGenerations?.toLocaleString()}
                      </span>
                      <Progress
                        value={Math.min(((Number(row.totalGenerations) || 0) / maxVolume) * 100, 100)}
                        size='sm'
                        classNames={{ indicator: 'bg-foreground', track: 'bg-content3' }}
                        className='h-1.5 max-w-[80px]'
                        aria-label='Volume'
                      />
                    </div>
                  </td>
                  <td className='px-6 py-4'>
                    <span className='rounded bg-content2 px-2 py-1 text-xs font-semibold text-default-600'>
                      {formatDuration(row.avgDurationMs != null ? Number(row.avgDurationMs) : null)}
                    </span>
                  </td>
                  <td className='px-6 py-4 text-xs font-semibold text-default-500'>
                    {formatFileSize(row.avgFileSizeBytes != null ? Number(row.avgFileSizeBytes) : null)}
                  </td>
                  <td className='px-6 py-4'>
                    <div className='flex items-center gap-2'>
                      <span className='min-w-[40px] text-xs font-bold text-foreground'>
                        {Number(row.successRate ?? 0).toFixed(1)}%
                      </span>
                      <Progress
                        value={Number(row.successRate ?? 0)}
                        size='sm'
                        color='success'
                        className='h-1.5 w-14'
                        aria-label='Success Rate'
                      />
                    </div>
                  </td>
                  <td className='px-6 py-4'>
                    <span
                      className={clsx(
                        'rounded px-2 py-1 text-[10px] font-bold',
                        Number(row.errorRate ?? 0) > 0 ? 'bg-danger-50 text-danger-500' : 'bg-content2 text-default-400'
                      )}>
                      {Number(row.errorRate ?? 0).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className='divide-y divide-default-100 md:hidden'>
        {data.map((row, i) => (
          <div key={row.templateKey || i} className='px-5 py-4'>
            <div className='flex items-start justify-between gap-3'>
              <div className='flex items-center gap-3'>
                <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-content2'>
                  <FileIcon type='pdf' size='sm' />
                </div>
                <div>
                  <p className='text-sm font-semibold text-foreground'>{row.templateName || row.templateKey}</p>
                  <p className='text-[10px] text-default-400'>{row.templateKey}</p>
                </div>
              </div>
              <span
                className={clsx(
                  'shrink-0 rounded px-2 py-1 text-[10px] font-bold',
                  Number(row.errorRate ?? 0) > 0 ? 'bg-danger-50 text-danger-500' : 'bg-content2 text-default-400'
                )}>
                {Number(row.errorRate ?? 0).toFixed(1)}% err
              </span>
            </div>
            <div className='mt-3 grid grid-cols-3 gap-3'>
              <div>
                <p className='text-[9px] font-bold uppercase tracking-wider text-default-400'>Volume</p>
                <p className='text-sm font-bold text-foreground'>{row.totalGenerations?.toLocaleString() ?? 0}</p>
              </div>
              <div>
                <p className='text-[9px] font-bold uppercase tracking-wider text-default-400'>Speed</p>
                <p className='text-sm font-bold text-foreground'>
                  {formatDuration(row.avgDurationMs != null ? Number(row.avgDurationMs) : null)}
                </p>
              </div>
              <div>
                <p className='text-[9px] font-bold uppercase tracking-wider text-default-400'>Success</p>
                <p className='text-sm font-bold text-success-600'>{Number(row.successRate ?? 0).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className='flex justify-center py-8'>
          <Spinner size='sm' color='default' />
        </div>
      )}
      {!loading && data.length === 0 && (
        <div className='flex flex-col items-center justify-center gap-2 py-12 text-default-400'>
          <Icon icon='lucide:inbox' className='h-8 w-8 opacity-40' />
          <span className='text-xs'>No template data available</span>
        </div>
      )}
    </Card>
  )
}

// --- Main Page ---
const ProjectDashboard = () => {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { currentProject } = useProject()

  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
  const [loading, setLoading] = useState(true)

  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaryDto | null>(null)
  const [usageData, setUsageData] = useState<UsageDataDto | null>(null)
  const [recentGenerations, setRecentGenerations] = useState<GenerationDto[]>([])
  const [templatePerformance, setTemplatePerformance] = useState<TemplatePerformanceDto[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)

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

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!id || typeof id !== 'string') return
      setLoadingTemplates(true)
      try {
        const selectedDate = parse(selectedMonth, 'yyyy-MM', new Date())
        const fromDate = startOfMonth(selectedDate).toISOString()
        const toDate = endOfMonth(selectedDate).toISOString()
        const res = await api.analytics.templatesList({ projectId: id, fromDate, toDate } as any)
        setTemplatePerformance(res || [])
      } catch (error) {
        console.error('Failed to fetch template performance:', error)
      } finally {
        setLoadingTemplates(false)
      }
    }
    fetchTemplates()
  }, [id, selectedMonth])

  const volumeChartData = useMemo(() => {
    const selectedDate = parse(selectedMonth, 'yyyy-MM', new Date())
    const start = startOfMonth(selectedDate)
    const end = endOfMonth(selectedDate)
    const allDays = eachDayOfInterval({ start, end })
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

  const templateBreakdown = useMemo(() => {
    const colors: Record<string, string> = { PDF: '#dc2626', Excel: '#10B981', Word: '#F59E0B', HTML: '#EC4899' }
    return (dashboardSummary?.templateBreakdown || []).map((b: TemplateBreakdownDto) => ({
      name: b.type || 'Unknown',
      value: Number(b.count) || 0,
      color: colors[b.type || ''] || '#6B7280'
    }))
  }, [dashboardSummary])

  return (
    <div className='dashboard-panel flex flex-col'>
      {/* Toolbar */}
      <div className='border-b border-default-200/50'>
        <ProjectToolbar
          projectName={currentProject?.name || 'Loading...'}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          onSettingsClick={() => router.push(`/project/${id}/settings`)}
        />
      </div>

      {/* Content */}
      <div className='space-y-4 p-4 md:p-6'>
        {/* Metric Cards */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <MetricCard
            title='Total Requests'
            value={(dashboardSummary?.totalGenerated ?? 0).toLocaleString()}
            type='sparkline'
            data={trendData}
            chartColor='#dc2626'
          />
          <MetricCard
            title='Success Rate'
            value={`${Number(dashboardSummary?.successRate ?? 100).toFixed(1)}%`}
            type='sparkline'
            data={successRateTrendData}
            chartColor='#10B981'
          />
          <MetricCard
            title='Total Templates'
            value={dashboardSummary?.totalTemplates ?? 0}
            limit=''
            type='breakdown'
            data={templateBreakdown}
          />
        </div>

        {/* Analytics */}
        <ProjectAnalyticsSection
          volumeData={volumeChartData}
          recentActivity={recentGenerations}
          onViewAllHistory={() => router.push(`/project/${id}/history`)}
        />

        {/* Template Performance */}
        <ProjectTemplateMatrix data={templatePerformance} loading={loadingTemplates} />
      </div>
    </div>
  )
}

export default ProjectDashboard
