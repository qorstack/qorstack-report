'use client'

import Icon from '@/components/icon'
import RectButton from '@/components/rect-button'
import SwitchTheme from '@/components/switch-theme'
import { useAuth } from '@/providers/AuthContext'
import { useProject } from '@/providers/ProjectContext'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type MobileNavItem = {
  icon: string
  label: string
  segment: string
  match: (path: string) => boolean
}

const Header = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const { logout, user } = useAuth()
  const { projects, currentProject, setCurrentProject } = useProject()

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false)

  // Sync currentProject from URL param
  const urlProjectId = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null
  useEffect(() => {
    if (urlProjectId && currentProject?.id !== urlProjectId) {
      const p = projects.find(x => x.id === urlProjectId)
      if (p) setCurrentProject(p)
    }
  }, [urlProjectId, projects, currentProject, setCurrentProject])

  const closeAll = () => {
    setIsDrawerOpen(false)
    setIsProjectPickerOpen(false)
  }

  const navigateTo = (segment: string) => {
    if (!currentProject?.id) return
    router.push(segment ? `/project/${currentProject.id}/${segment}` : `/project/${currentProject.id}`)
    closeAll()
  }

  const switchProject = (pid: string) => {
    const p = projects.find(x => x.id === pid)
    if (p) {
      setCurrentProject(p)
      router.push(`/project/${pid}`)
    }
    closeAll()
  }

  const navItems: MobileNavItem[] = [
    {
      icon: 'lucide:layout-dashboard',
      label: 'Dashboard',
      segment: '',
      match: p => /^\/project\/[^/]+$/.test(p)
    },
    {
      icon: 'lucide:file-text',
      label: 'Templates',
      segment: 'pdf-templates',
      match: p => p.includes('pdf-templates') || p.includes('pdf/templates')
    },
    {
      icon: 'lucide:history',
      label: 'History',
      segment: 'history',
      match: p => p.includes('/history')
    },
    {
      icon: 'lucide:type',
      label: 'Fonts',
      segment: 'fonts',
      match: p => p.includes('/fonts')
    },
    {
      icon: 'lucide:key',
      label: 'API Keys',
      segment: 'api-keys',
      match: p => p.includes('api-keys')
    },
    {
      icon: 'lucide:settings',
      label: 'Settings',
      segment: 'settings',
      match: p => p.includes('/settings')
    }
  ]

  return (
    <>
      <header className='sticky top-0 z-30 flex h-16 items-center justify-between bg-content1 px-4 lg:px-6'>
        {/* ── Mobile: Brand + Project Picker ── */}
        <div className='flex min-w-0 flex-1 items-center gap-3 lg:hidden'>
          <button
            className='flex shrink-0 items-center gap-2'
            onClick={() => router.push('/')}
            aria-label='Home'>
            <Image src='/images/logo/logo.png' alt='Qorstack Report' width={24} height={24} className='object-contain' />
          </button>

          {/* Project picker pill */}
          {projects.length > 0 && (
            <button
              onClick={() => setIsProjectPickerOpen(true)}
              className='flex min-w-0 flex-1 items-center gap-2 rounded-md bg-content2 px-3 py-1.5 transition-colors hover:bg-content3'>
              <div className='flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground'>
                {currentProject?.name ? currentProject.name[0].toUpperCase() : 'G'}
              </div>
              <span className='truncate text-xs font-semibold text-foreground'>
                {currentProject?.name || 'Select Project'}
              </span>
              <Icon icon='lucide:chevron-down' className='ml-auto h-3.5 w-3.5 shrink-0 text-default-500' />
            </button>
          )}
        </div>

        {/* ── Desktop: Empty left (sidebar has brand) ── */}
        <div className='hidden lg:block' />

        {/* ── Right side ── */}
        <div className='flex shrink-0 items-center gap-2'>
          <SwitchTheme />

          {/* Desktop: logout button */}
          <div className='hidden lg:block'>
            <RectButton variant='ghost' className='!px-3 !py-1 text-xs' onClick={logout}>
              Log out
            </RectButton>
          </div>

          {/* Mobile: hamburger drawer trigger */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className='flex h-9 w-9 items-center justify-center rounded-md text-default-600 transition-colors hover:bg-content2 hover:text-foreground lg:hidden'
            aria-label='Open menu'>
            <Icon icon='lucide:menu' className='h-5 w-5' />
          </button>
        </div>
      </header>

      {/* ═══ Mobile Drawer ═══ */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className='fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden'
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className='fixed inset-y-0 right-0 z-50 flex w-[280px] flex-col bg-content1 lg:hidden'>
              {/* Drawer header */}
              <div className='flex h-16 shrink-0 items-center justify-between px-5'>
                <div className='flex items-center gap-2'>
                  <Image src='/images/logo/logo.png' alt='Qorstack Report' width={22} height={22} />
                  <span className='text-sm font-bold text-foreground'>Menu</span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className='flex h-8 w-8 items-center justify-center rounded-md text-default-600 hover:bg-content2'
                  aria-label='Close menu'>
                  <Icon icon='lucide:x' className='h-5 w-5' />
                </button>
              </div>

              {/* Project context */}
              {currentProject && (
                <div className='mx-4 mb-2 rounded-md bg-content2 p-3'>
                  <div className='mb-0.5 font-label text-[9px] font-bold uppercase tracking-wider text-default-600'>
                    Current Project
                  </div>
                  <div className='flex items-center gap-2'>
                    <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground'>
                      {currentProject.name?.[0]?.toUpperCase() || 'P'}
                    </div>
                    <span className='truncate text-sm font-semibold text-foreground'>{currentProject.name}</span>
                  </div>
                </div>
              )}

              {/* Nav items */}
              <nav className='flex-1 overflow-y-auto px-3 py-2'>
                <div className='mb-2 px-3 font-label text-[9px] font-bold uppercase tracking-wider text-default-600'>
                  Project Menu
                </div>
                <ul className='flex flex-col gap-0.5'>
                  {navItems.map(item => {
                    const active = item.match(pathname)
                    return (
                      <li key={item.segment || 'dashboard'}>
                        <button
                          onClick={() => navigateTo(item.segment)}
                          disabled={!currentProject}
                          className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            active
                              ? 'bg-primary text-primary-foreground'
                              : 'text-default-700 hover:bg-content2'
                          }`}>
                          <Icon icon={item.icon} className='h-4 w-4' />
                          {item.label}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </nav>

              {/* Drawer footer */}
              <div className='shrink-0 bg-content2 p-4'>
                {user && (
                  <div className='mb-3 flex items-center gap-2.5'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground'>
                      {user.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-xs font-semibold text-foreground'>
                        {user.firstName || user.email?.split('@')[0]}
                      </div>
                      <div className='truncate text-[10px] text-default-600'>{user.email}</div>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    logout()
                    closeAll()
                  }}
                  className='flex w-full items-center justify-center gap-2 rounded-md bg-danger/10 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/15'>
                  <Icon icon='lucide:log-out' className='h-3.5 w-3.5' />
                  Log out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ═══ Project Picker Modal ═══ */}
      <AnimatePresence>
        {isProjectPickerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProjectPickerOpen(false)}
              className='fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden'
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className='fixed left-4 right-4 top-20 z-[70] max-h-[70vh] overflow-hidden rounded-xl bg-content1 lg:hidden'>
              <div className='flex items-center justify-between px-5 py-4'>
                <h3 className='text-base font-bold text-foreground'>Select Project</h3>
                <button
                  onClick={() => setIsProjectPickerOpen(false)}
                  className='flex h-7 w-7 items-center justify-center rounded-md text-default-600 hover:bg-content2'>
                  <Icon icon='lucide:x' className='h-4 w-4' />
                </button>
              </div>
              <div className='max-h-[50vh] overflow-y-auto px-3 pb-3'>
                <ul className='flex flex-col gap-1'>
                  {projects.map(p => (
                    <li key={p.id}>
                      <button
                        onClick={() => p.id && switchProject(p.id)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                          currentProject?.id === p.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-content2'
                        }`}>
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${
                            currentProject?.id === p.id
                              ? 'bg-primary-foreground text-primary'
                              : 'bg-content3 text-default-700'
                          }`}>
                          {p.name?.[0]?.toUpperCase() || 'P'}
                        </div>
                        <span className='truncate text-sm font-semibold'>{p.name || 'Untitled'}</span>
                        {currentProject?.id === p.id && <Icon icon='lucide:check' className='ml-auto h-4 w-4' />}
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    router.push('/create-project')
                    closeAll()
                  }}
                  className='mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-content2 py-2.5 text-xs font-semibold text-default-700 transition-colors hover:bg-content3'>
                  <Icon icon='lucide:plus' className='h-3.5 w-3.5' />
                  Create Project
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Header
