import React, { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '@/components/icon'

const Sidebar = () => {
  const router = useRouter()
  const pathname = usePathname()
  // Mock Project Buckets
  const [projects] = useState([
    { id: 'proj_1', name: 'Marketing Reports' },
    { id: 'proj_2', name: 'Invoices 2024' }
  ])

  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({
    proj_1: true,
    proj_2: false
  })

  // Basic Navigation
  const navItems = [
    { icon: 'lucide:layout-dashboard', label: 'Dashboard', path: '/' },
    { icon: 'lucide:key', label: 'API Keys', path: '/api-keys' },
    { icon: 'lucide:settings', label: 'Settings', path: '/settings' }
  ]

  const toggleProject = (id: string) => {
    setOpenProjects(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <aside className='fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-default-200 bg-content1'>
      {/* Brand */}
      <div className='flex h-16 items-center gap-3 border-b border-default-100 bg-content1 px-6'>
        <div className='flex h-8 w-8 items-center justify-center bg-primary text-sm font-bold text-white'>R</div>
        <span className='text-lg font-bold tracking-tight text-foreground'>Qorstack</span>
      </div>

      {/* Main Nav */}
      <div className='flex-1 overflow-y-auto px-4 py-6'>
        <div className='mb-8 flex flex-col gap-1'>
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === item.path
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-default-600 hover:bg-content2 hover:text-foreground'
              }`}>
              <Icon icon={item.icon} className='h-5 w-5' />
              {item.label}
            </button>
          ))}
        </div>

        {/* Project Buckets */}
        <div className='mb-4'>
          <div className='mb-2 flex items-center justify-between px-3'>
            <span className='text-xs font-semibold uppercase tracking-wider text-default-400'>Projects</span>
            <button className='text-default-400 hover:text-primary'>
              <Icon icon='lucide:plus' className='h-4 w-4' />
            </button>
          </div>

          <div className='flex flex-col gap-1'>
            {projects.map(proj => (
              <div key={proj.id} className='flex flex-col'>
                <button
                  onClick={() => toggleProject(proj.id)}
                  className='flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium text-default-700 hover:bg-content2'>
                  <div className='flex items-center gap-2'>
                    <Icon icon='lucide:folder' className='h-4 w-4 text-default-400' />
                    {proj.name}
                  </div>
                  <Icon
                    icon='lucide:chevron-right'
                    className={`h-4 w-4 text-default-400 transition-transform ${openProjects[proj.id] ? 'rotate-90' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {openProjects[proj.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className='overflow-hidden'>
                      <div className='ml-9 mt-1 flex flex-col gap-1 border-l border-default-200 pl-3'>
                        <button
                          onClick={() => router.push(`/project/${proj.id}/pdf-templates`)}
                          className='flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-default-500 hover:text-foreground'>
                          <Icon icon='lucide:file-text' className='h-3.5 w-3.5' />
                          PDF Templates
                        </button>
                        <button
                          className='flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm text-default-400 opacity-70'
                          title='Coming Soon'>
                          <Icon icon='lucide:file-spreadsheet' className='h-3.5 w-3.5' />
                          Excel (Soon)
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Boost Speed Promo */}
      {/* <div className='px-4 pb-2'>
        <div className='flex flex-col items-center gap-3 bg-gradient-to-br from-gray-900 to-black p-4 text-center text-white'>
          <div className='flex h-8 w-8 items-center justify-center bg-white/10'>
            <Icon icon='lucide:zap' className='h-4 w-4 text-yellow-400' />
          </div>
          <div>
            <h3 className='text-sm font-bold'>Boost Speed?</h3>
            <p className='text-xs text-default-400'>Upgrade your node cluster.</p>
          </div>
          <button className='w-full bg-content1 px-2 py-1.5 text-xs font-bold text-foreground hover:bg-content3'>
            Manage Nodes
          </button>
        </div>
      </div> */}

      {/* User Footer */}
      <div className='border-t border-default-100 p-4'>
        <button className='flex w-full items-center gap-3 rounded-lg border border-default-100 p-2 text-left hover:bg-content2'>
          <div className='h-8 w-8 rounded-md bg-gradient-to-br from-primary-500 to-primary-300'></div>
          <div className='flex-1 overflow-hidden'>
            <div className='truncate text-sm font-medium text-foreground'>John Doe</div>
            <div className='truncate text-xs text-default-500'>Free Plan</div>
          </div>
          <Icon icon='lucide:more-vertical' className='h-4 w-4 text-default-400' />
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
