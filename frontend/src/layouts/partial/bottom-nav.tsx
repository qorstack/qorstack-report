'use client'

import Icon from '@/components/icon'
import { useRouter, usePathname, useParams } from 'next/navigation'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProject } from '@/providers/ProjectContext'

const BottomNav = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const { projects } = useProject()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  // Initialize selected project from URL or first available
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id || null)
    }
  }, [projects, selectedProjectId])

  // Determine if we're on a project page (for highlighting Row 2)
  const urlProjectId = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null
  const isOnProjectPage = urlProjectId !== null

  // Update selectedProjectId when navigating to a project page
  useEffect(() => {
    if (urlProjectId) {
      setSelectedProjectId(urlProjectId)
    }
  }, [urlProjectId])

  // The "selected" project for display purposes (persists even on Overview)
  const selectedProject = projects.find(p => p.id === selectedProjectId)

  // Navigation Handlers
  const handleSwitchProject = (pid: string) => {
    setSelectedProjectId(pid)
    router.push(`/project/${pid}`)
    setIsProjectPickerOpen(false)
    setIsMenuOpen(false)
  }

  const navigateTo = (path: string) => {
    router.push(path)
    setIsMenuOpen(false)
  }

  // Active State Helpers - Only highlight when on a project page, not on Overview
  const isActiveProjectRoute = (path: string, exact = false) => {
    if (!isOnProjectPage) return false
    if (exact) return pathname === path
    return pathname.startsWith(path)
  }

  return (
    <>
      {/* --- Context Menu Drawer (The "More" Menu) --- */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className='fixed inset-0 z-40 bg-black/60 backdrop-blur-sm'
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className='fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-default-100 bg-content1 shadow-2xl'>
              <div className='pb-safe-bottom p-6'>
                {/* Header */}
                <div className='mb-6 flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground'>
                      {selectedProject?.name ? selectedProject.name[0] : 'G'}
                    </div>
                    <div>
                      <div className='text-sm font-bold text-foreground'>
                        {selectedProject ? selectedProject.name : 'Global View'}
                      </div>
                      <span className='text-xs text-default-500'>Extended Menu</span>
                    </div>
                  </div>
                  <button onClick={() => setIsMenuOpen(false)} className='rounded-full p-1 hover:bg-content3'>
                    <Icon icon='lucide:x' className='h-6 w-6 text-default-500' />
                  </button>
                </div>

                {/* Menu Actions */}
                <div className='grid grid-cols-1 gap-2'>
                  <button
                    onClick={() => navigateTo('/settings')}
                    className='flex items-center gap-4 rounded-xl border border-default-100 bg-content2 p-4 hover:bg-content3'>
                    <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-content1 text-default-600'>
                      <Icon icon='lucide:user' className='h-5 w-5' />
                    </div>
                    <div className='flex flex-col items-start'>
                      <span className='text-sm font-bold text-foreground'>My Account</span>
                      <span className='text-[10px] text-default-500'>Profile & Preferences</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false)
                    }}
                    className='mt-4 w-full rounded-xl bg-red-50 p-4 text-center text-xs font-bold text-red-500 hover:bg-red-100'>
                    Log out
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- Project Picker Modal --- */}
      <AnimatePresence>
        {isProjectPickerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProjectPickerOpen(false)}
              className='fixed inset-0 z-[60] bg-black/60 backdrop-blur-md'
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className='fixed inset-x-0 bottom-0 top-0 z-[70] flex flex-col bg-content1 md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:h-auto md:w-96 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl'>
              <div className='flex items-center justify-between border-b border-default-100 p-6'>
                <h3 className='text-xl font-bold text-foreground'>Select Workspace</h3>
                <button onClick={() => setIsProjectPickerOpen(false)} className='rounded-full p-1 hover:bg-content3'>
                  <Icon icon='lucide:x' className='h-6 w-6 text-default-500' />
                </button>
              </div>
              <div className='flex-1 overflow-y-auto p-6'>
                <div className='space-y-2'>
                  {projects.map((p, idx) => (
                    <button
                      key={p.id || idx}
                      onClick={() => p.id && handleSwitchProject(p.id)}
                      className={`flex w-full items-center gap-4 rounded-xl p-4 transition-colors ${selectedProjectId === p.id ? 'bg-primary text-primary-foreground' : 'bg-content2 hover:bg-content3'}`}>
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold ${selectedProjectId === p.id ? 'bg-content1 text-primary' : 'bg-content3 text-default-600'}`}>
                        {p.name ? p.name[0] : 'P'}
                      </div>
                      <span className='font-bold'>{p.name || 'Untitled'}</span>
                      {selectedProjectId === p.id && <Icon icon='lucide:check' className='ml-auto h-5 w-5' />}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => router.push('/create-project')}
                  className='mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-default-200 py-4 font-bold text-default-400 hover:border-primary hover:text-primary'>
                  <Icon icon='lucide:plus' className='h-5 w-5' />
                  <span>Create New Project</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- Main Stacked Navigation Bar --- */}
      <nav className='fixed bottom-0 left-0 right-0 z-30 flex flex-col bg-content1 pb-safe-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.05)] lg:hidden'>
        {/* Row 1: Context Bar (Project | Menu) */}
        <div className='flex h-12 items-stretch border-t border-default-200'>
          <button
            onClick={() => setIsProjectPickerOpen(true)}
            className='flex flex-1 items-center justify-between bg-content1 px-4 text-foreground hover:bg-content2'>
            <div className='flex items-center gap-3 overflow-hidden'>
              <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground'>
                {selectedProject && selectedProject.name ? selectedProject.name[0] : 'G'}
              </div>
              <span className='truncate text-sm font-bold text-primary'>
                {selectedProject ? selectedProject.name : 'Select Project'}
              </span>
            </div>
            <Icon icon='lucide:chevron-down' className='h-4 w-4 text-default-400' />
          </button>

          <button
            onClick={() => setIsMenuOpen(true)}
            className={`flex w-14 items-center justify-center border-l border-default-100 transition-colors ${isMenuOpen ? 'bg-content2 text-primary' : 'bg-content1 text-default-400 hover:bg-content2 hover:text-primary'}`}>
            <Icon icon='lucide:menu' className='h-5 w-5' />
          </button>
        </div>

        {/* Row 2: Actions Bar */}
        <div className='grid grid-cols-4 border-t border-default-100'>
          {(() => {
            const pid = selectedProject?.id
            const navBtnClass = 'flex h-16 flex-col items-center justify-center gap-1 transition-colors'
            const activeClass = 'text-primary'
            const inactiveClass = 'text-default-400 hover:bg-content2 hover:text-default-600 disabled:opacity-50'
            return (
              <>
                <button
                  onClick={() => selectedProject && navigateTo('/project/' + selectedProject.id)}
                  disabled={!selectedProject}
                  className={`${navBtnClass} ${isActiveProjectRoute('/project/' + pid, true) ? activeClass : inactiveClass}`}>
                  <Icon icon='lucide:layout-dashboard' className='h-6 w-6' />
                  <span className='text-[10px] font-medium'>Dashboard</span>
                </button>

                <button
                  onClick={() => selectedProject && navigateTo('/project/' + selectedProject.id + '/pdf-templates')}
                  disabled={!selectedProject}
                  className={`${navBtnClass} ${isActiveProjectRoute('/project/' + pid + '/pdf-templates') ? activeClass : inactiveClass}`}>
                  <Icon icon='lucide:file-text' className='h-6 w-6' />
                  <span className='text-[10px] font-medium'>PDF</span>
                </button>

                <button
                  onClick={() => selectedProject && navigateTo('/project/' + selectedProject.id + '/fonts')}
                  disabled={!selectedProject}
                  className={`${navBtnClass} ${isActiveProjectRoute('/project/' + pid + '/fonts') ? activeClass : inactiveClass}`}>
                  <Icon icon='lucide:type' className='h-6 w-6' />
                  <span className='text-[10px] font-medium'>Fonts</span>
                </button>

                <button
                  onClick={() => selectedProject && navigateTo('/project/' + selectedProject.id + '/api-keys')}
                  disabled={!selectedProject}
                  className={`${navBtnClass} ${isActiveProjectRoute('/project/' + pid + '/api-keys') ? activeClass : inactiveClass}`}>
                  <Icon icon='lucide:key' className='h-6 w-6' />
                  <span className='text-[10px] font-medium'>API Keys</span>
                </button>
              </>
            )
          })()}
        </div>
      </nav>
    </>
  )
}

export default BottomNav
