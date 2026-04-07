import React from 'react'
import Icon from '@/components/icon'
import { useRouter, usePathname, useParams } from 'next/navigation'
import { motion } from 'framer-motion'

// Mock projects with initials and colors for the rail
const projects = [
  { id: '1', name: 'My Awesome App', initial: 'M', color: 'bg-primary-300' },
  { id: '2', name: 'Marketing Reports', initial: 'M', color: 'bg-emerald-600' },
  { id: '3', name: 'Invoices 2024', initial: 'I', color: 'bg-rose-600' }
]

const ProjectRail = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()

  const projectId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null
  const isGlobal = !projectId && pathname.startsWith('/project')

  const handleSelectProject = (id: string) => {
    router.push(`/project/${id}`)
  }

  return (
    <div className='flex w-[72px] flex-col items-center gap-4 border-r border-default-200 bg-content2 py-4'>
      {/* Brand / Home */}
      <div
        onClick={() => router.push('/')}
        className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-foreground text-white shadow-md transition-transform hover:scale-105 active:scale-95'>
        <span className='font-bold'>R</span>
      </div>

      <div className='h-px w-8 bg-default-200' />

      {/* Global Overview */}
      <div className='group relative'>
        {isGlobal && (
          <motion.div layoutId='active-indicator' className='absolute -left-3 top-2 h-6 w-1 rounded-r-lg bg-foreground' />
        )}
        <button
          onClick={() => router.push('/')}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${isGlobal ? 'bg-content1 text-primary-600 shadow-sm' : 'text-default-500 hover:bg-content1 hover:text-foreground hover:shadow-sm'}`}>
          <Icon icon='lucide:layout-grid' className='h-5 w-5' />
        </button>
      </div>

      <div className='h-px w-8 bg-default-200' />

      {/* Projects */}
      <div className='no-scrollbar flex flex-1 flex-col items-center gap-3 overflow-y-auto'>
        {projects.map(project => {
          const isActive = projectId === project.id
          return (
            <div key={project.id} className='group relative'>
              {isActive && (
                <motion.div
                  layoutId='active-indicator'
                  className='absolute -left-3 top-2 h-6 w-1 rounded-r-lg bg-foreground'
                />
              )}
              <button
                onClick={() => handleSelectProject(project.id)}
                className={`group relative flex h-10 w-10 items-center justify-center rounded-xl text-white transition-all hover:shadow-md active:scale-95 ${isActive ? 'shadow-sm' : 'opacity-80 grayscale transition-all hover:opacity-100 hover:grayscale-0'}`}>
                <div className={`flex h-full w-full items-center justify-center rounded-xl ${project.color}`}>
                  <span className='font-bold'>{project.initial}</span>
                </div>
              </button>
            </div>
          )
        })}

        {/* Add Project */}
        <button className='flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-default-300 text-default-400 transition-colors hover:border-primary-500 hover:text-primary-500'>
          <Icon icon='lucide:plus' className='h-5 w-5' />
        </button>
      </div>

      {/* User Profile (Bottom of Rail) */}
      <div className='mt-auto flex flex-col items-center gap-2'>
        <div className='h-8 w-8 rounded-full bg-default-200'>
          {/* Avatar Placeholder */}
          <div className='flex h-full w-full items-center justify-center text-[10px] font-bold text-default-500'>U</div>
        </div>
      </div>
    </div>
  )
}

export default ProjectRail
