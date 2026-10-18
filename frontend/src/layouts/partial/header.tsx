'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRouteParams } from '@/hooks/use-route-params'
import { Drawer, DrawerBody, DrawerContent } from '@heroui/react'
import Icon from '@/components/icon'
import DocSearch from '@/components/docs/DocSearch'
import { useAuth } from '@/providers/AuthContext'
import { useProject } from '@/providers/ProjectContext'
import { AccountMenu, SidebarContent } from '@/layouts/partial/sidebar'

const ICON_BUTTON =
  'flex h-10 w-10 shrink-0 items-center justify-center text-default-500 transition-colors hover:bg-content2 hover:text-foreground'

const Header = (): JSX.Element => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useRouteParams()
  const { user } = useAuth()
  const { projects, currentProject, setCurrentProject } = useProject()

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(v => !v)
      }
    }
    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close the drawer whenever the route changes
  useEffect(() => {
    setIsDrawerOpen(false)
  }, [pathname])

  const handleSearchNavigate = useCallback(
    (_id: string, path?: string) => {
      setSearchOpen(false)
      router.push(path ?? '/docs')
    },
    [router]
  )

  // Sync currentProject from URL param
  const urlProjectId = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null
  useEffect(() => {
    if (urlProjectId && currentProject?.id !== urlProjectId) {
      const p = projects.find(x => x.id === urlProjectId)
      if (p) setCurrentProject(p)
    }
  }, [urlProjectId, projects, currentProject, setCurrentProject])

  return (
    <>
      <header className='sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-divider bg-background px-3 py-2 sm:px-4 lg:px-6'>
        {/* Mobile: menu trigger */}
        <button type='button' onClick={() => setIsDrawerOpen(true)} className={`${ICON_BUTTON} -ml-1 lg:hidden`} aria-label='Open menu'>
          <Icon icon='lucide:menu' className='h-5 w-5' />
        </button>

        {/* Left portal target — builder pages render their title/back button here (all breakpoints) */}
        <div id='global-header-left' className='flex min-w-0 flex-1 items-center overflow-hidden empty:hidden' />

        <div className='ml-auto flex shrink-0 items-center gap-1'>
          {/* Page-specific actions (Save, Delete, Download…) are portalled here by builder pages */}
          <div id='global-header-actions' className='flex items-center gap-2 empty:hidden lg:mr-2' />

          <button
            type='button'
            onClick={() => setSearchOpen(true)}
            title='Search docs (Ctrl/⌘ K)'
            aria-label='Search docs'
            className={ICON_BUTTON}>
            <Icon icon='lucide:search' className='h-[18px] w-[18px]' />
          </button>
          <Link href='/docs' title='Documentation' aria-label='Documentation' className={`${ICON_BUTTON} hidden sm:flex`}>
            <Icon icon='lucide:book-open' className='h-[18px] w-[18px]' />
          </Link>

          {user && (
            <AccountMenu>
              <button
                type='button'
                aria-label='Account menu'
                className='ml-1 flex h-10 w-10 shrink-0 items-center justify-center'>
                <span className='flex h-8 w-8 items-center justify-center rounded-full bg-content3 text-[13px] font-bold text-foreground ring-1 ring-default-300 transition-colors hover:ring-foreground'>
                  {user.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </button>
            </AccountMenu>
          )}
        </div>
      </header>

      {/* Mobile drawer — same content as the desktop sidebar */}
      <Drawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        placement='left'
        size='xs'
        radius='none'
        classNames={{
          base: 'max-w-[288px] border-r border-divider bg-content1',
          backdrop: 'bg-black/60',
          closeButton: 'top-4 right-3 h-10 w-10 flex items-center justify-center text-default-500 hover:bg-content2'
        }}>
        <DrawerContent>
          <DrawerBody className='p-0'>
            <SidebarContent onNavigate={() => setIsDrawerOpen(false)} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {searchOpen && <DocSearch onNavigate={handleSearchNavigate} onClose={() => setSearchOpen(false)} />}
    </>
  )
}

export default Header
