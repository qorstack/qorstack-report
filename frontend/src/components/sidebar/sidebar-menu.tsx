import React from 'react'
import Icon from '@/components/icon'
import { useRouter, usePathname, useParams } from 'next/navigation'

// Mock projects same as in Rail (in a real app this would come from a shared store/context)
const projects = [
  { id: '1', name: 'My Awesome App', plan: 'Pro' },
  { id: '2', name: 'Marketing Reports', plan: 'Free' },
  { id: '3', name: 'Invoices 2024', plan: 'Enterprise' }
]

const SidebarMenu = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const projectId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null

  const activeProject = projects.find(p => p.id === projectId)

  const isActive = (path: string) => {
    if (projectId) {
      // Project Context Logic
      if (path === '' && pathname === `/project/${projectId}`) return true
      if (path && pathname.includes(path)) return true
    } else {
      // Global Context Logic
      if (pathname === path) return true
    }
    return false
  }

  const navigateTo = (segment: string) => {
    if (projectId) {
      if (segment === '') router.push(`/project/${projectId}`)
      else router.push(`/project/${projectId}/${segment}`)
    } else {
      router.push(segment)
    }
  }

  const activeClass = 'bg-primary-50 text-primary-700 shadow-sm font-medium'
  const inactiveClass = 'text-default-600 hover:bg-content2 hover:text-foreground'

  return (
    <div className='flex w-[220px] flex-col border-r border-default-200 bg-content1'>
      {/* Header */}
      <div className='flex h-16 shrink-0 flex-col justify-center border-b border-default-200 px-6'>
        <span className='truncate text-sm font-bold text-foreground'>
          {projectId ? activeProject?.name : 'Global Overview'}
        </span>
        <span className='text-xs text-default-500'>{projectId ? activeProject?.plan + ' Plan' : 'Workspace'}</span>
      </div>

      {/* Menu Items */}
      <div className='flex-1 overflow-y-auto px-3 py-4'>
        {projectId ? (
          <div className='space-y-6'>
            <div>
              <div className='mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-default-400'>Menu</div>
              <div className='space-y-1'>
                <button
                  onClick={() => navigateTo('')}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all ${isActive('') ? activeClass : inactiveClass}`}>
                  <Icon icon='lucide:layout-dashboard' className='h-4 w-4' />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => navigateTo('excel-templates')}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all ${isActive('excel-templates') ? activeClass : inactiveClass}`}>
                  <Icon icon='lucide:file-spreadsheet' className='h-4 w-4' />
                  <span>Excel Templates</span>
                </button>
                <button
                  onClick={() => navigateTo('pdf-templates')}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all ${isActive('pdf-templates') ? activeClass : inactiveClass}`}>
                  <Icon icon='lucide:file-text' className='h-4 w-4' />
                  <span>PDF Templates</span>
                </button>
              </div>
            </div>

            <div>
              <div className='mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-default-400'>
                Configuration
              </div>
              <div className='space-y-1'>
                <button
                  onClick={() => navigateTo('api-keys')}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all ${isActive('api-keys') ? activeClass : inactiveClass}`}>
                  <Icon icon='lucide:key' className='h-4 w-4' />
                  <span>API Keys</span>
                </button>
                <button
                  onClick={() => navigateTo('settings')}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all ${isActive('settings') ? activeClass : inactiveClass}`}>
                  <Icon icon='lucide:settings' className='h-4 w-4' />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className='space-y-1'>
            <div className='mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-default-400'>Menu</div>
            <button
              onClick={() => navigateTo('/')}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all ${isActive('/') ? activeClass : inactiveClass}`}>
              <Icon icon='lucide:layout-grid' className='h-4 w-4' />
              <span>Overview</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SidebarMenu
