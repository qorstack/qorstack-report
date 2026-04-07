import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '@/components/icon'
import { useRouter, usePathname, useParams } from 'next/navigation'

type Project = {
  id: string
  name: string
  plan?: string
}

const projects: Project[] = [
  { id: '1', name: 'My Awesome App', plan: 'Pro' },
  { id: '2', name: 'Marketing Reports', plan: 'Free' },
  { id: '3', name: 'Invoices 2024', plan: 'Enterprise' }
]

const ProjectSwitcher = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Determine active project or if we are in global view
  const projectId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null
  const isGlobal = !projectId && pathname.startsWith('/project')

  const activeProject = projects.find(p => p.id === projectId)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSelectProject = (id: string) => {
    setIsOpen(false)
    router.push(`/project/${id}`)
  }

  const handleSelectOverview = () => {
    setIsOpen(false)
    router.push('/')
  }

  return (
    <div ref={containerRef} className='relative px-4 pt-4'>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex w-full items-center justify-between border bg-content1 px-3 py-2 text-left transition-all hover:bg-content2
          ${isOpen ? 'border-primary-500 ring-1 ring-primary-500' : 'border-default-200 hover:border-default-300'}
          rounded-sm`}>
        <div className='flex items-center gap-3 overflow-hidden'>
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-white ${isGlobal ? 'bg-foreground' : 'bg-primary-600'}`}>
            <Icon icon={isGlobal ? 'lucide:layout-grid' : 'lucide:box'} className='h-4 w-4' />
          </div>
          <div className='flex flex-col overflow-hidden'>
            <span className='truncate text-sm font-semibold text-foreground'>
              {isGlobal ? 'Global Overview' : activeProject?.name || 'Select Project'}
            </span>
            <span className='truncate text-xs text-default-500'>
              {isGlobal ? 'All Projects' : activeProject?.plan || 'Personal'}
            </span>
          </div>
        </div>
        <Icon
          icon='lucide:chevrons-up-down'
          className={`h-4 w-4 text-default-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className='absolute left-4 right-4 top-[calc(100%+8px)] z-50 flex flex-col gap-1 rounded-sm border border-default-200 bg-content1 p-1 shadow-lg ring-1 ring-black/5'>
            {/* Global Option */}
            <button
              onClick={handleSelectOverview}
              className={`flex items-center gap-3 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-content2 ${isGlobal ? 'bg-content2' : ''}`}>
              <div className='flex h-6 w-6 items-center justify-center rounded-sm bg-content3 text-default-600'>
                <Icon icon='lucide:layout-grid' className='h-3.5 w-3.5' />
              </div>
              <div className='flex flex-col'>
                <span className='font-medium text-foreground'>Global Overview</span>
              </div>
              {isGlobal && <Icon icon='lucide:available' className='ml-auto h-4 w-4 text-primary-600' />}
            </button>

            <div className='my-1 h-px bg-content3' />

            <div className='px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-default-400'>Projects</div>

            <div className='max-h-[200px] overflow-y-auto'>
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  className={`flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-content2 ${projectId === project.id ? 'bg-content2' : ''}`}>
                  <div className='flex h-6 w-6 items-center justify-center rounded-sm bg-primary-50 text-primary-600'>
                    <span className='text-xs font-bold'>{project.name.charAt(0)}</span>
                  </div>
                  <div className='flex flex-1 flex-col overflow-hidden'>
                    <span className='truncate font-medium text-foreground'>{project.name}</span>
                  </div>
                  {projectId === project.id && (
                    <Icon icon='lucide:check' className='ml-auto h-4 w-4 text-primary-600' />
                  )}
                </button>
              ))}
            </div>

            <div className='mt-1 border-t border-default-100 pt-1'>
              <button className='flex w-full items-center gap-2 rounded-sm px-2 py-2 text-xs font-medium text-default-500 hover:bg-content2 hover:text-foreground'>
                <Icon icon='lucide:plus' className='h-3.5 w-3.5' />
                Create Project
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProjectSwitcher
