'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { DeleteTemplateModal } from '@/components/pdf/DeleteTemplateModal'
import { Button, Spinner, addToast } from '@heroui/react'
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

const PdfTemplates = () => {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { projects } = useProject()

  const [templates, setTemplates] = useState<TemplateResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [projectName, setProjectName] = useState('Loading...')

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadedProjectIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (id && projects.length > 0) {
      const project = projects.find(p => p.id === id)
      setProjectName(project?.name || 'Unknown Project')
    }
  }, [id, projects])

  const fetchTemplates = useCallback(
    async (pageToFetch: number, isLoadMore = false) => {
      if (!id || typeof id !== 'string') return

      if (isLoadMore) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      try {
        const res = await api.templates.templatesList({
          pageNumber: pageToFetch,
          pageSize: 12,
          // @ts-ignore
          projectId: id
        })

        if (res && res.items) {
          if (isLoadMore) {
            setTemplates(prev => [...prev, ...res.items!])
          } else {
            setTemplates(res.items)
          }

          if (res.items.length < 12) {
            setHasMore(false)
          } else {
            setHasMore(true)
          }
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [id]
  )

  useEffect(() => {
    if (id && typeof id === 'string' && loadedProjectIdRef.current !== id) {
      loadedProjectIdRef.current = id
      // Reset state on new ID
      setPage(1)
      setTemplates([])
      setHasMore(true)
      fetchTemplates(1, false)
    }
  }, [id, fetchTemplates])

  // Infinite Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (isLoading || isLoadingMore || !hasMore) return

      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const docHeight = document.documentElement.scrollHeight

      // Load more when user is near the bottom (200px buffer)
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

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)

  const handleDelete = async (templateKey: string) => {
    // Open modal instead of confirm
    setTemplateToDelete(templateKey)
    setDeleteModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <Spinner size='lg' />
      </div>
    )
  }

  return (
    <div className='flex flex-col rounded-xl border border-default-200 bg-background'>
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-default-100 bg-background px-5 py-4'>
        <div>
          <h1 className='text-xl font-bold text-foreground'>PDF Templates</h1>
          <p className='text-sm text-default-500'>Manage your report templates and configurations</p>
        </div>
        <Button
          color='primary'
          size='sm'
          startContent={<Icon icon='lucide:plus' className='h-4 w-4' />}
          onPress={() => router.push(`/pdf/templates/create?projectId=${id}`)}
          className='rounded-md'>
          New Template
        </Button>
      </div>

      <div className='bg-background p-4 md:p-6'>
        {templates.length === 0 ? (
          <div className='flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-default-300 bg-content2 text-center'>
            <div className='mb-4 bg-content3 p-4'>
              <Icon icon='lucide:file-plus' className='h-8 w-8 text-default-400' />
            </div>
            <h3 className='text-lg font-medium text-foreground'>No templates yet</h3>
            <p className='mt-1 text-sm text-default-500'>Create your first PDF template to get started</p>
            <Button
              className='mt-4 rounded-md'
              color='primary'
              variant='flat'
              onPress={() => router.push(`/pdf/templates/create?projectId=${id}`)}>
              Create Template
            </Button>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {templates.map(tpl => (
              <div
                key={tpl.id}
                className='relative flex flex-col justify-between rounded-xl border border-default-100 bg-content2/50 p-4 shadow-none transition-colors hover:border-default-200 hover:bg-background'>
                {/* Version Badge - Absolute Position */}
                <div className='absolute right-3 top-3 z-10'>
                  <span className='rounded-md bg-content3 px-2 py-0.5 text-xs font-bold text-default-500'>
                    v{tpl.activeVersion?.version || '1'}
                  </span>
                </div>

                <div className='flex gap-4'>
                  {/* Left: Thumbnail */}
                  <div className='h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-default-100 bg-content2 shadow-inner'>
                    {tpl.activeVersion?.previewFilePathPresigned ? (
                      <PdfThumbnail url={tpl.activeVersion.previewFilePathPresigned} />
                    ) : (
                      <div className='flex h-full w-full items-center justify-center bg-content2 text-default-300'>
                        <FileIcon type='pdf' size='sm' />
                      </div>
                    )}
                  </div>

                  {/* Right: Content */}
                  <div className='flex min-w-0 flex-1 flex-col pt-0.5'>
                    {/* Title */}
                    <h3 className='mr-8 truncate text-base font-bold text-foreground' title={tpl.name || 'Untitled'}>
                      {tpl.name || 'Untitled'}
                    </h3>

                    <div className='mt-2 space-y-1.5'>
                      {/* Updated Time */}
                      <div className='flex items-center gap-1.5 text-xs text-default-500'>
                        <Icon icon='lucide:clock' className='h-3 w-3 text-default-400' />
                        <span className='truncate'>
                          Updated {tpl.updatedDatetime ? dayjs(new Date(tpl.updatedDatetime)).fromNow() : '-'}
                        </span>
                      </div>

                      {/* Created Time */}
                      <div className='flex items-center gap-1.5 text-xs text-default-500'>
                        <Icon icon='lucide:calendar-plus' className='h-3 w-3 text-default-400' />
                        <span className='truncate'>
                          Created{' '}
                          {tpl.createdDatetime ? dayjs(new Date(tpl.createdDatetime)).format('MMM D, YYYY') : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className='mt-3 flex items-center justify-between gap-3 border-t border-default-100 pt-3'>
                  {/* Key - Moved to bottom left */}
                  <div className='flex flex-1 items-center gap-2 rounded-lg border border-default-100 bg-background p-1.5 px-2 transition-colors hover:border-default-200'>
                    <Icon icon='lucide:key' className='h-3 w-3 text-default-400' />
                    <code
                      className='flex-1 truncate font-mono text-xs font-medium text-default-500'
                      title={tpl.templateKey || ''}>
                      {tpl.templateKey}
                    </code>
                    <CopyButton text={tpl.templateKey || ''} className='shrink-0' />
                  </div>

                  <Button
                    className='h-8 px-4 text-xs font-medium'
                    variant='solid'
                    color='primary'
                    size='sm'
                    radius='sm'
                    endContent={<Icon icon='lucide:arrow-right' className='h-3 w-3' />}
                    onPress={() => router.push(`/pdf/templates/${tpl.templateKey}?projectId=${id}`)}>
                    MANAGE
                  </Button>
                </div>
              </div>
            ))}
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
        templateName={templates.find(t => t.templateKey === templateToDelete)?.name || 'Unknown Template'}
        templateKey={templateToDelete || ''}
      />
    </div>
  )
}

export default PdfTemplates
