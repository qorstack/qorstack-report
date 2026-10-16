'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button, Spinner, Modal, ModalContent, ModalBody, ModalFooter, useDisclosure } from '@heroui/react'
import Icon from '@/components/icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { api } from '@/api/generated/main-service'
import { toast } from '@/utils/toast'
import { useProject } from '@/providers/ProjectContext'
import { cn } from '@/utils/cn'
import FileTypeBadge from '@/components/common/FileTypeBadge'
import { API_BASE_URL } from '@/api/base-url'

interface GalleryItem {
  id: string
  name: string
  description: string
  category: string
  fileType: string
  /** True when the server has a picture of page 1 rendered with the sample data. */
  hasThumbnail?: boolean
  /** Optional — newer backends include the placeholders and the sample payload. */
  fields?: string[]
  tables?: { name?: string; columns: string[]; rowCount?: number }[]
  sample?: Record<string, unknown>
}

/** Placeholders found in a v1-style sample (replace map) when the API doesn't list them. */
const sampleFields = (item: GalleryItem): string[] => {
  if (item.fields?.length) return item.fields
  const replace = item.sample?.replace
  if (Array.isArray(replace)) return replace.map(r => String((r as { key?: string }).key ?? '')).filter(Boolean)
  if (replace && typeof replace === 'object') return Object.keys(replace)
  return []
}

const BADGE = 'inline-flex items-center gap-1.5 border border-default-300 px-2 py-0.5 text-default-500'

const TypeBadge = ({ fileType }: { fileType: string }) => <FileTypeBadge type={fileType} />

const CategoryBadge = ({ category }: { category: string }) => (
  <span className={cn(BADGE, 'text-[12px]')}>{category}</span>
)

/** Paper-like placeholder page — same surface as the template thumbnails. */
const PaperPreview = ({ fileType, large = false }: { fileType: string; large?: boolean }) => (
  <div className={cn('flex items-center justify-center bg-[#FFFFFF]', large ? 'h-52' : 'h-44')} aria-hidden>
    <div
      className={cn(
        'flex flex-col gap-1.5 border border-black/10 bg-[#FFFFFF] p-3 shadow-[0_8px_20px_-12px_rgba(0,0,0,.6)]',
        large ? 'h-44 w-[124px]' : 'h-36 w-[104px]'
      )}>
      <div className='mb-1 h-1.5 w-8 bg-[#141414]/70' />
      {fileType === 'xlsx' ? (
        <div className='grid flex-1 grid-cols-3 gap-px bg-[#141414]/15'>
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className='bg-[#FFFFFF]' />
          ))}
        </div>
      ) : (
        <>
          <div className='h-1 w-full bg-[#141414]/70' />
          <div className='h-1 w-4/5 bg-[#141414]/30' />
          <div className='h-1 w-full bg-[#141414]/30' />
          <div className='h-1 w-3/5 bg-[#141414]/30' />
          <div className='mt-auto h-1 w-1/2 self-end bg-[#141414]/70' />
        </>
      )}
    </div>
  </div>
)

/** Page 1 of the real report (rendered with its sample data); falls back to the paper placeholder. */
const GalleryCover = ({ item, large = false }: { item: GalleryItem; large?: boolean }) => {
  const [failed, setFailed] = useState(false)
  if (!item.hasThumbnail || failed) return <PaperPreview fileType={item.fileType} large={large} />

  return (
    <div className={cn('relative overflow-hidden bg-content2', large ? 'h-80' : 'h-44')}>
      <Image
        src={`${API_BASE_URL}/templates/gallery/${encodeURIComponent(item.id)}/thumbnail`}
        alt={`${item.name} rendered with sample data`}
        width={480}
        height={622}
        unoptimized
        onError={() => setFailed(true)}
        className={cn(
          'absolute left-1/2 top-4 h-auto -translate-x-1/2 border border-black/10 bg-[#FFFFFF] shadow-[0_8px_20px_-12px_rgba(0,0,0,.6)]',
          large ? 'w-[300px]' : 'w-[200px]'
        )}
      />
    </div>
  )
}

export default function TemplateGalleryPage() {
  const router = useRouter()
  const { currentProject } = useProject()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<GalleryItem | null>(null)

  useEffect(() => {
    let active = true
    api.instance
      .get<GalleryItem[]>('/templates/gallery')
      .then(res => {
        if (active) setItems(res.data)
      })
      .catch(() => toast.error({ description: 'Failed to load the template gallery.' }))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const openPreview = (item: GalleryItem) => {
    setSelected(item)
    onOpen()
  }

  const handleImport = async (item: GalleryItem) => {
    if (!currentProject?.id) {
      toast.error({ description: 'Select a project first, then import.' })
      return
    }
    setImportingId(item.id)
    try {
      await api.instance.post(`/templates/gallery/${item.id}/import`, { projectId: currentProject.id })
      toast.success({ description: `"${item.name}" imported into ${currentProject.name ?? 'your project'}.` })
      onClose()
      router.push(`/project/${currentProject.id}/templates`)
    } catch {
      toast.error({ description: `Could not import "${item.name}".` })
    } finally {
      setImportingId(null)
    }
  }

  const projectLabel = currentProject?.name || 'your project'

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        breadcrumb={[{ label: 'Workspace' }, { label: 'Template gallery' }]}
        title='Template gallery'
        description={`Ready-made templates with sample data. Import one into ${projectLabel} and render it right away.`}
      />

      {loading ? (
        <div className='flex min-h-[320px] items-center justify-center border border-divider bg-content1'>
          <Spinner color='default' label='Loading gallery' classNames={{ label: 'text-[13px] text-default-500' }} />
        </div>
      ) : items.length === 0 ? (
        <div className='flex min-h-[280px] flex-col items-center justify-center border border-divider bg-content1 px-6 py-12 text-center'>
          <Icon icon='lucide:layout-grid' className='h-8 w-8 text-default-400' />
          <h2 className='mt-4 text-[16px] font-semibold text-foreground'>Gallery is empty</h2>
          <p className='mt-2 max-w-md text-[14px] text-default-500'>
            No gallery templates are available. The gallery source may not be configured on this server.
          </p>
        </div>
      ) : (
        <ul className='grid grid-cols-1 border-l border-t border-divider sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
          {items.map(item => (
            <li
              key={item.id}
              className='relative flex flex-col border-b border-r border-divider bg-content1 transition-colors hover:bg-content2/50'>
              <button
                type='button'
                onClick={() => openPreview(item)}
                aria-label={`Details for ${item.name}`}
                className='border-b border-divider text-left'>
                <GalleryCover item={item} />
              </button>
              <div className='flex flex-1 flex-col gap-2 p-4'>
                <div className='flex flex-wrap items-center gap-2'>
                  <TypeBadge fileType={item.fileType} />
                  <CategoryBadge category={item.category} />
                </div>
                <h3 className='text-[16px] font-semibold text-foreground'>{item.name}</h3>
                <p className='line-clamp-2 text-[14px] leading-snug text-default-500'>{item.description}</p>
                <div className='mt-auto flex items-center gap-2 pt-3'>
                  <Button variant='light' className='h-10 flex-1 font-medium' onPress={() => openPreview(item)}>
                    Details
                  </Button>
                  <Button
                    variant='bordered'
                    className='h-10 flex-1 border-default-300 font-medium'
                    isLoading={importingId === item.id}
                    startContent={
                      importingId === item.id ? undefined : <Icon icon='lucide:download' className='h-4 w-4' />
                    }
                    onPress={() => handleImport(item)}>
                    Import
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size='lg' classNames={{ base: 'border border-divider bg-content1' }}>
        <ModalContent>
          {selected && (
            <>
              <div className='border-b border-divider'>
                <GalleryCover key={selected.id} item={selected} large />
              </div>
              <ModalBody className='gap-3 py-5'>
                <div className='flex flex-wrap items-center gap-2'>
                  <TypeBadge fileType={selected.fileType} />
                  <CategoryBadge category={selected.category} />
                </div>
                <h2 className='text-[20px] font-semibold text-foreground'>{selected.name}</h2>
                <p className='text-[14px] text-default-500'>{selected.description}</p>

                {(() => {
                  const fields = sampleFields(selected)
                  return fields.length > 0 ? (
                    <div className='flex flex-col gap-2'>
                      <span className='text-[13px] font-medium text-foreground'>Fields ({fields.length})</span>
                      <div className='flex flex-wrap gap-1.5'>
                        {fields.map(f => (
                          <code key={f} className='bg-content2 px-1.5 py-0.5 font-mono text-[12px] text-default-600'>
                            {`{{${f}}}`}
                          </code>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}

                {selected.tables && selected.tables.length > 0 && (
                  <div className='flex flex-col gap-1'>
                    <span className='text-[13px] font-medium text-foreground'>Tables</span>
                    {selected.tables.map((t, i) => (
                      <p key={i} className='text-[13px] text-default-500'>
                        {t.name || `Table ${i + 1}`}: {t.columns.join(', ')}
                        {t.rowCount ? ` · ${t.rowCount} sample rows` : ''}
                      </p>
                    ))}
                  </div>
                )}

                {selected.sample && (
                  <details className='group'>
                    <summary className='flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-default-500 hover:text-foreground'>
                      <Icon
                        icon='lucide:chevron-right'
                        className='h-3.5 w-3.5 transition-transform group-open:rotate-90'
                      />
                      Sample data
                    </summary>
                    <pre className='mt-2 max-h-56 overflow-auto border border-divider bg-background p-3 font-mono text-[12px] text-default-600'>
                      {JSON.stringify(selected.sample, null, 2)}
                    </pre>
                  </details>
                )}

                <p className='text-[14px] text-default-500'>
                  Import copies this template, with sample data, into{' '}
                  <span className='font-semibold text-foreground'>{projectLabel}</span>. You can edit it afterwards.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant='light' className='h-10 font-medium' onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color='primary'
                  className='h-10 font-medium'
                  isLoading={importingId === selected.id}
                  startContent={
                    importingId === selected.id ? undefined : <Icon icon='lucide:download' className='h-4 w-4' />
                  }
                  onPress={() => handleImport(selected)}>
                  Import into project
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
