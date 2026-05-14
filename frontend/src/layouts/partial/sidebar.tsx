'use client'

import Icon from '@/components/icon'
import { cn } from '@heroui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter, usePathname, useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useProject } from '@/providers/ProjectContext'
import { useAuth } from '@/providers/AuthContext'

const Sidebar = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const searchParams = useSearchParams()
  const { projects, currentProject, setCurrentProject } = useProject()
  const { user } = useAuth()

  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let projectId = searchParams.get('projectId')

    if (!projectId && pathname.startsWith('/project/')) {
      projectId = params.id as string
    }

    if (projectId && typeof projectId === 'string') {
      const projectFromQuery = projects.find(p => p.id === projectId)
      if (projectFromQuery && currentProject?.id !== projectFromQuery.id) {
        setCurrentProject(projectFromQuery)
      }
    }
  }, [searchParams, params.id, pathname, projects, currentProject, setCurrentProject])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    if (pickerOpen) {
      globalThis.addEventListener('mousedown', onClickOutside)
      return () => globalThis.removeEventListener('mousedown', onClickOutside)
    }
  }, [pickerOpen])

  const navigateTo = (targetProjectId: string, segment: string) => {
    const project = projects.find(p => p.id === targetProjectId)
    if (project) {
      setCurrentProject(project)
    }

    if (segment === '') {
      router.push(`/project/${targetProjectId}`)
    } else {
      router.push(`/project/${targetProjectId}/${segment}`)
    }
    setPickerOpen(false)
  }

  const isProjectDashboard = /^\/project\/[^/]+$/.exec(pathname)
  const isTemplates =
    pathname.includes('templates') || pathname.includes('pdf/templates') || pathname.includes('excel/templates')
  const isHistory = pathname.includes('history')
  const isFonts = pathname === '/fonts'
  const isApiKeys = pathname.includes('api-keys')
  const isSettings = pathname.includes('settings')

  const navItem = (active: boolean) =>
    `group relative flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-200 ${
      active
        ? 'bg-primary/10 text-primary font-semibold shadow-[inset_3px_0_0_var(--line-accent)] dark:bg-primary/15'
        : 'text-default-600 hover:bg-content2 hover:text-foreground'
    }`

  return (
    <motion.aside
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className='fixed inset-y-0 left-0 z-[70] flex h-screen w-[256px] flex-col border-r border-default-200/70 bg-content1 transition-transform duration-500 dark:border-white/10'>
      {/* Brand — stacked 2-line layout, balanced proportions */}
      <div className='px-4 pb-3 pt-5'>
        <button
          onClick={() =>
            currentProject?.id ? router.push(`/project/${currentProject.id}`) : router.push('/create-project')
          }
          className='flex w-full items-center gap-2.5'
          aria-label='Home'>
          <Image
            src='/images/logo/logo.png'
            alt='Qorstack Logo'
            width={28}
            height={28}
            className='shrink-0 rounded-md object-contain'
          />
          <div className='flex min-w-0 flex-col items-start leading-[1.2]'>
            <span className='text-[14px] font-black tracking-tight text-foreground'>Qorstack</span>
            <span className='text-[10.5px] font-medium tracking-normal text-default-500'>Report Engine</span>
          </div>
        </button>
      </div>

      {/* Workspace selector — subdued pill, clearly a control (not a brand repeat) */}
      <div className='relative mx-3 mb-3 mt-1' ref={pickerRef}>
        <button
          onClick={() => setPickerOpen(v => !v)}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-200',
            pickerOpen ? 'bg-content3 text-foreground' : 'bg-content2 text-foreground/90 ring-1 ring-default-200/70 hover:bg-content3 dark:ring-white/5'
          )}>
          <div className='flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-default-600/20 text-default-500'>
            <Icon icon='lucide:layers' className='h-3 w-3' strokeWidth={2.25} />
          </div>
          <span className='min-w-0 flex-1 truncate text-[12.5px] font-semibold'>
            {currentProject?.name || 'Select Project'}
          </span>
          <Icon icon='lucide:chevrons-up-down' className='h-3.5 w-3.5 shrink-0 text-default-500' />
        </button>

        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -6, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className='absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-default-200/80 bg-content1 shadow-lift dark:border-white/10'>
              <div className='max-h-72 overflow-y-auto p-1.5'>
                {projects.map(project => {
                  const isActive = currentProject?.id === project.id
                  return (
                    <div
                      key={project.id}
                      onClick={() => project.id && navigateTo(project.id, '')}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 transition-colors ${
                        isActive ? 'bg-content3 text-foreground' : 'text-default-700 hover:bg-content2'
                      }`}>
                      <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-black text-primary-foreground'>
                        {(project.name || 'P').charAt(0).toUpperCase()}
                      </div>
                      <span className='truncate text-[12.5px] font-medium'>{project.name || 'Untitled Project'}</span>
                      {isActive && <Icon icon='lucide:check' className='ml-auto h-3.5 w-3.5 text-primary' />}
                    </div>
                  )
                })}
              </div>
              <div className='border-t border-content3 p-1.5'>
                <div
                  onClick={() => {
                    router.push('/create-project')
                    setPickerOpen(false)
                  }}
                  className='flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-default-600 transition-colors hover:bg-content2 hover:text-foreground'>
                  <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-content3'>
                    <Icon icon='lucide:plus' className='h-3.5 w-3.5' />
                  </div>
                  <span className='text-[12.5px] font-medium'>Create Project</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Nav — workspace group flows from top */}
      <nav className='no-scrollbar flex-1 overflow-y-auto px-3'>
        {currentProject ? (
          <>
            {/* Workspace group — everything scoped to /project/{id}/... */}
            <div className='mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-default-500/60'>
              Workspace
            </div>
            <div className='flex flex-col gap-0.5'>
              <div
                className={navItem(!!isProjectDashboard)}
                onClick={() => currentProject.id && navigateTo(currentProject.id, '')}>
                <Icon icon='lucide:layout-dashboard' className='h-[18px] w-[18px]' />
                <span className='text-[13px] font-medium'>Dashboard</span>
              </div>
              <div
                className={navItem(isTemplates)}
                onClick={() => currentProject.id && navigateTo(currentProject.id, 'templates')}>
                <Icon icon='lucide:file-text' className='h-[18px] w-[18px]' />
                <span className='text-[13px] font-medium'>Templates</span>
              </div>
              <div
                className={navItem(isHistory)}
                onClick={() => currentProject.id && navigateTo(currentProject.id, 'history')}>
                <Icon icon='lucide:history' className='h-[18px] w-[18px]' />
                <span className='text-[13px] font-medium'>History</span>
              </div>
              <div
                className={navItem(isApiKeys)}
                onClick={() => currentProject.id && navigateTo(currentProject.id, 'api-keys')}>
                <Icon icon='lucide:key' className='h-[18px] w-[18px]' />
                <span className='text-[13px] font-medium'>API Keys</span>
              </div>
              <div
                className={navItem(isSettings)}
                onClick={() => currentProject.id && navigateTo(currentProject.id, 'settings')}>
                <Icon icon='lucide:settings' className='h-[18px] w-[18px]' />
                <span className='text-[13px] font-medium'>Settings</span>
              </div>
            </div>
          </>
        ) : (
          <div className='mt-6 px-2 py-8 text-center'>
            <div className='mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-content2 text-default-400'>
              <Icon icon='lucide:folder-open' className='h-5 w-5' />
            </div>
            <p className='text-sm font-medium text-foreground'>No Project Selected</p>
            <p className='mt-1 text-xs text-default-500'>Pick a workspace from the selector above.</p>
          </div>
        )}
      </nav>

      {/* System group — pinned above footer. Only truly global items (routes outside /project/*). */}
      {currentProject && (
        <div className='px-3 pb-2'>
          <div className='mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-default-500/60'>
            System
          </div>
          <div className='flex flex-col gap-0.5'>
            <div className={navItem(isFonts)} onClick={() => router.push('/fonts')}>
              <Icon icon='lucide:type' className='h-[18px] w-[18px]' />
              <span className='text-[13px] font-medium'>Fonts</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer / User — bg-tint zone, feels like a separate base bar (Linear-style) */}
      <div className='border-t border-default-200/70 bg-content2 px-3 py-2.5 dark:border-white/10'>
        {user ? (
          <button
            type='button'
            onClick={() => router.push('/settings')}
            className='group flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors duration-200 hover:bg-content1/80 dark:hover:bg-content2/60'>
            <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-content3 text-[11px] font-bold text-default-700 ring-1 ring-default-200/70 transition-colors duration-200 group-hover:text-foreground dark:bg-gradient-to-br dark:from-content4 dark:to-content3 dark:ring-white/5'>
              {user.firstName
                ? user.firstName.charAt(0).toUpperCase()
                : user.email
                  ? user.email.charAt(0).toUpperCase()
                  : 'U'}
            </div>
            <span className='min-w-0 flex-1 truncate text-left text-[12.5px] font-semibold text-foreground'>
              {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email?.split('@')[0]}
            </span>
            <span className='shrink-0 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[8.5px] font-bold tracking-wide text-primary'>
              PRO
            </span>
          </button>
        ) : (
          <div className='px-2 py-1.5 text-center text-xs text-default-400'>Guest</div>
        )}
      </div>
    </motion.aside>
  )
}

export default Sidebar
