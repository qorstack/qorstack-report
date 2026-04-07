'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'
import { useRouter, usePathname, useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import React, { useEffect } from 'react'
import { useProject } from '@/providers/ProjectContext'
import { useAuth } from '@/providers/AuthContext'
import { Tooltip } from '@heroui/react'
import { VersionChip } from '@/components/docs/DocComponents'

const Sidebar = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const searchParams = useSearchParams()
  const { projects, currentProject, setCurrentProject } = useProject()
  const { user } = useAuth()

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
  }

  const activeBlockClass = 'bg-primary text-primary-foreground'
  const inactiveBlockClass = 'text-default-600 hover:bg-content3'

  // Check if current path matches a project sub-route
  const isProjectDashboard = /^\/project\/[^/]+$/.exec(pathname)
  const isPdfTemplates = pathname.includes('pdf-templates') || pathname.includes('pdf/templates')
  const isHistory = pathname.includes('history')
  const isFonts = pathname.includes('/fonts')
  const isApiKeys = pathname.includes('api-keys')
  const isSettings = pathname.includes('settings')

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className='fixed inset-y-0 left-0 z-20 flex h-screen w-72 flex-col bg-content1 border-r border-default-200/70 transition-all duration-300'>
      <div className='px-5'>
        <div className='flex h-16 w-fit shrink-0 cursor-pointer items-center gap-2.5' onClick={() => router.push('/')}>
          <Image src='/images/logo/logo.png' alt='Qorstack Report' width={26} height={26} className='object-contain' />
          <span className='text-sm font-bold text-foreground'>Qorstack Report</span>
          <span className='text-sm font-semibold text-primary'>
            <VersionChip />
          </span>
        </div>
      </div>

      {/* 2. Middle Row */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Sidebar Nav Rail */}
        <div className='no-scrollbar flex w-[64px] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-content1/60 py-4'>
          {projects.map(project => {
            const isActive = currentProject?.id === project.id
            return (
              <Tooltip
                key={project.id}
                content={project.name || 'Untitled Project'}
                placement='right'
                color='foreground'
                radius='sm'
                closeDelay={0}>
                <div
                  onClick={() => project.id && navigateTo(project.id, '')}
                  className={`flex h-[36px] w-[36px] cursor-pointer items-center justify-center rounded-md text-[13px] font-bold transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-ambient-sm'
                      : 'bg-default-100 text-default-700 hover:bg-default-200 hover:text-default-800'
                  }`}>
                  {(project.name || '').charAt(0).toUpperCase()}
                </div>
              </Tooltip>
            )
          })}

          <div className='my-2 h-px w-8 bg-content3'></div>

          <Tooltip content='Create Project' placement='right' color='foreground' radius='sm' closeDelay={0}>
            <div
              onClick={() => router.push('/create-project')}
              className='flex h-[36px] w-[36px] cursor-pointer items-center justify-center rounded-md border border-dashed border-default-300 bg-content1 text-default-400 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600'>
              <Icon icon='lucide:plus' className='h-4 w-4' />
            </div>
          </Tooltip>
        </div>

        {/* Project Menu */}
        <div className='no-scrollbar flex-1 overflow-y-auto px-3 py-4'>
          {currentProject ? (
            <div className='flex flex-col gap-0.5'>
              {/* Section: Workspace */}
              <div className='mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-default-400'>
                Workspace
              </div>

              <div
                className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all ${isProjectDashboard ? activeBlockClass : inactiveBlockClass}`}
                onClick={() => currentProject.id && navigateTo(currentProject.id, '')}>
                <Icon icon='lucide:layout-dashboard' className='h-4 w-4' />
                <span className='font-medium'>Dashboard</span>
              </div>

              <div
                className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all ${isPdfTemplates ? activeBlockClass : inactiveBlockClass}`}
                onClick={() => currentProject.id && navigateTo(currentProject.id, 'pdf-templates')}>
                <Icon icon='lucide:file-text' className='h-4 w-4' />
                <span className='font-medium'>Templates</span>
              </div>

              <div
                className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all ${isHistory ? activeBlockClass : inactiveBlockClass}`}
                onClick={() => currentProject.id && navigateTo(currentProject.id, 'history')}>
                <Icon icon='lucide:history' className='h-4 w-4' />
                <span className='font-medium'>History</span>
              </div>

              <div
                className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all ${isFonts ? activeBlockClass : inactiveBlockClass}`}
                onClick={() => currentProject.id && navigateTo(currentProject.id, 'fonts')}>
                <Icon icon='lucide:type' className='h-4 w-4' />
                <span className='font-medium'>Fonts</span>
              </div>

              {/* Divider */}
              <div className='my-3 h-px bg-default-200/70' />

              {/* Section: Configure */}
              <div className='mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-default-400'>
                Configure
              </div>

              <div
                className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all ${isApiKeys ? activeBlockClass : inactiveBlockClass}`}
                onClick={() => currentProject.id && navigateTo(currentProject.id, 'api-keys')}>
                <Icon icon='lucide:key' className='h-4 w-4' />
                <span className='font-medium'>API Keys</span>
              </div>

              <div
                className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-all ${isSettings ? activeBlockClass : inactiveBlockClass}`}
                onClick={() => currentProject.id && navigateTo(currentProject.id, 'settings')}>
                <Icon icon='lucide:settings' className='h-4 w-4' />
                <span className='font-medium'>Settings</span>
              </div>
            </div>
          ) : (
            <div className='px-2 py-8 text-center'>
              <div className='mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-content2 text-default-400'>
                <Icon icon='lucide:folder-open' className='h-5 w-5' />
              </div>
              <p className='text-sm font-medium text-foreground'>No Project Selected</p>
              <p className='mt-1 text-xs text-default-500'>Select a project from the left rail.</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Footer Row */}
      <div className='bg-content1 p-4'>
        {user ? (
          <div className='flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-content2'>
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground'>
              {user.firstName
                ? user.firstName.charAt(0).toUpperCase()
                : user.email
                  ? user.email.charAt(0).toUpperCase()
                  : 'U'}
            </div>
            <div className='overflow-hidden text-xs'>
              <div className='truncate font-bold text-foreground'>
                {user.firstName} {user.lastName}
              </div>
              <div className='text-default-500'>Credits: unlimited</div>
            </div>
          </div>
        ) : (
          <div className='text-center text-xs text-default-400'>Guest</div>
        )}
      </div>
    </motion.aside>
  )
}

export default Sidebar
