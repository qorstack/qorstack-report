'use client'

import type { JSX, ReactNode } from 'react'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useRouteParams } from '@/hooks/use-route-params'
import { Dropdown, DropdownItem, DropdownMenu, DropdownSection, DropdownTrigger } from '@heroui/react'
import Icon from '@/components/icon'
import { Logo } from '@/components/brand/Logo'
import { useProject } from '@/providers/ProjectContext'
import { useAuth } from '@/providers/AuthContext'
import { useFeatures } from '@/hooks/use-features'
import { cn } from '@/utils/cn'

interface NavItem {
  key: string
  label: string
  icon: string
  href: string
  isActive: (pathname: string) => boolean
}

const buildProjectItems = (projectId: string): NavItem[] => [
  {
    key: 'overview',
    label: 'Overview',
    icon: 'lucide:layout-dashboard',
    href: `/project/${projectId}`,
    isActive: p => /^\/project\/[^/]+\/?$/.test(p)
  },
  {
    key: 'templates',
    label: 'Templates',
    icon: 'lucide:file-text',
    href: `/project/${projectId}/templates`,
    isActive: p => p.includes('/templates') && !p.startsWith('/gallery')
  },
  {
    key: 'history',
    label: 'History',
    icon: 'lucide:history',
    href: `/project/${projectId}/history`,
    isActive: p => p.includes('/history')
  },
  {
    key: 'api-key',
    label: 'API key',
    icon: 'lucide:key-round',
    href: `/project/${projectId}/api-keys`,
    isActive: p => p.includes('/api-keys')
  },
  {
    key: 'project-settings',
    label: 'Project settings',
    icon: 'lucide:settings-2',
    href: `/project/${projectId}/settings`,
    isActive: p => /^\/project\/[^/]+\/settings/.test(p)
  }
]

const WORKSPACE_ITEMS: NavItem[] = [
  {
    key: 'gallery',
    label: 'Template gallery',
    icon: 'lucide:layout-grid',
    href: '/gallery',
    isActive: p => p.startsWith('/gallery')
  },
  {
    key: 'fonts',
    label: 'Fonts',
    icon: 'lucide:type',
    href: '/fonts',
    isActive: p => p.startsWith('/fonts')
  }
]

/** True when the server reports licensed (Pro-only) features. */
export const useIsPro = (): boolean => {
  const { features } = useFeatures()
  return Boolean(features?.pdfPasswordProtection || features?.pdfWatermark)
}

const getInitial = (value?: string | null): string => (value ? value.charAt(0).toUpperCase() : 'U')

const NavGroup = ({
  label,
  items,
  pathname,
  onNavigate
}: {
  label: string
  items: NavItem[]
  pathname: string
  onNavigate?: () => void
}): JSX.Element => (
  <div>
    <p className='mb-1.5 px-3 text-[12px] font-medium text-default-500'>{label}</p>
    <ul className='flex flex-col'>
      {items.map(item => {
        const active = item.isActive(pathname)
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-10 items-center gap-3 px-3 text-[14px] font-medium transition-colors duration-150',
                active
                  ? 'bg-content2 text-foreground before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary'
                  : 'text-default-500 hover:bg-content2/60 hover:text-foreground'
              )}>
              <Icon icon={item.icon} className='h-[18px] w-[18px] shrink-0' />
              <span className='truncate'>{item.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  </div>
)

const ProjectSwitcher = ({ onNavigate }: { onNavigate?: () => void }): JSX.Element => {
  const router = useRouter()
  const { projects, currentProject, setCurrentProject } = useProject()

  const handleAction = (key: string | number) => {
    const value = String(key)
    onNavigate?.()
    if (value === '__create') {
      router.push('/create-project')
      return
    }
    const project = projects.find(p => p.id === value)
    if (!project?.id) return
    setCurrentProject(project)
    router.push(`/project/${project.id}`)
  }

  return (
    <Dropdown placement='bottom-start' classNames={{ content: 'min-w-[224px] border border-divider bg-content1 p-1' }}>
      <DropdownTrigger>
        <button
          type='button'
          aria-label={`Current project: ${currentProject?.name || 'none'}. Switch project`}
          className='flex min-h-11 w-full items-center gap-3 border border-divider bg-content2 px-3 text-left transition-colors hover:border-default-300 data-[open=true]:border-default-300'>
          <span className='flex h-6 w-6 shrink-0 items-center justify-center bg-content3 text-[12px] font-semibold text-foreground'>
            {getInitial(currentProject?.name || 'P')}
          </span>
          <span className='flex min-w-0 flex-1 flex-col'>
            <span className='text-[12px] text-default-500'>Project</span>
            <span className='truncate text-[14px] font-semibold text-foreground'>
              {currentProject?.name || 'Select a project'}
            </span>
          </span>
          <Icon icon='lucide:chevrons-up-down' className='h-4 w-4 shrink-0 text-default-500' />
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label='Switch project'
        onAction={handleAction}
        selectionMode='single'
        selectedKeys={currentProject?.id ? [currentProject.id] : []}
        itemClasses={{ base: 'min-h-10 gap-3 data-[hover=true]:bg-content2' }}>
        <DropdownSection title='Projects' showDivider classNames={{ heading: 'text-[12px] font-medium text-default-500' }}>
          {projects.map(project => (
            <DropdownItem
              key={project.id || project.name || 'project'}
              textValue={project.name || 'Untitled project'}
              startContent={
                <span className='flex h-6 w-6 shrink-0 items-center justify-center bg-content3 text-[12px] font-semibold text-foreground'>
                  {getInitial(project.name || 'P')}
                </span>
              }>
              <span className='truncate text-[14px]'>{project.name || 'Untitled project'}</span>
            </DropdownItem>
          ))}
        </DropdownSection>
        <DropdownSection>
          <DropdownItem
            key='__create'
            textValue='Create project'
            startContent={<Icon icon='lucide:plus' className='h-4 w-4' />}>
            <span className='text-[14px]'>Create project</span>
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  )
}

/** Account dropdown (Account settings + Log out). Shared by the sidebar user chip and the header avatar. */
export const AccountMenu = ({ children, onNavigate }: { children: ReactNode; onNavigate?: () => void }): JSX.Element | null => {
  const router = useRouter()
  const { user, logout } = useAuth()
  if (!user) return null

  return (
    <Dropdown placement='bottom-end' classNames={{ content: 'min-w-[224px] border border-divider bg-content1 p-1' }}>
      <DropdownTrigger>{children}</DropdownTrigger>
      <DropdownMenu
        aria-label='Account'
        itemClasses={{ base: 'min-h-10 gap-3 data-[hover=true]:bg-content2' }}
        onAction={key => {
          onNavigate?.()
          if (key === 'settings') router.push('/settings')
          if (key === 'logout') logout()
        }}>
        <DropdownSection showDivider>
          <DropdownItem key='profile' isReadOnly textValue='Signed in as' className='cursor-default opacity-100'>
            <span className='block text-[12px] text-default-500'>Signed in as</span>
            <span className='block truncate text-[14px] font-semibold text-foreground'>
              {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email}
            </span>
            {user.firstName && <span className='block truncate text-[12px] text-default-500'>{user.email}</span>}
          </DropdownItem>
        </DropdownSection>
        <DropdownSection>
          <DropdownItem key='settings' startContent={<Icon icon='lucide:user-cog' className='h-4 w-4' />}>
            Account settings
          </DropdownItem>
          <DropdownItem
            key='logout'
            color='danger'
            className='text-danger'
            startContent={<Icon icon='lucide:log-out' className='h-4 w-4' />}>
            Log out
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  )
}

const UserChip = ({ onNavigate }: { onNavigate?: () => void }): JSX.Element => {
  const { user } = useAuth()
  const isPro = useIsPro()

  if (!user) return <div className='px-3 py-2 text-[13px] text-default-500'>Guest</div>

  const displayName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email?.split('@')[0]

  return (
    <AccountMenu onNavigate={onNavigate}>
      <button
        type='button'
        aria-label='Account menu'
        className='flex min-h-11 w-full items-center gap-3 px-3 text-left transition-colors hover:bg-content2'>
        <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-content3 text-[13px] font-bold text-foreground'>
          {getInitial(user.firstName || user.email)}
        </span>
        <span className='flex min-w-0 flex-1 flex-col'>
          <span className='truncate text-[14px] font-semibold text-foreground'>{displayName}</span>
          {user.firstName && <span className='truncate text-[12px] text-default-500'>{user.email}</span>}
        </span>
        {isPro && (
          <span className='shrink-0 border border-default-300 px-1.5 py-0.5 font-mono text-[11px] text-default-500'>
            PRO
          </span>
        )}
      </button>
    </AccountMenu>
  )
}

/**
 * Sidebar body — used by the desktop sidebar and the mobile drawer so both show the same items.
 * `onNavigate` lets the drawer close itself after a navigation.
 */
export const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }): JSX.Element => {
  const pathname = usePathname() || ''
  const { currentProject } = useProject()
  const homeHref = currentProject?.id ? `/project/${currentProject.id}` : '/create-project'

  return (
    <div className='flex h-full flex-col bg-content1'>
      <div className='px-4 pb-4 pt-5'>
        <Link href={homeHref} onClick={onNavigate} aria-label='Qorstack Report home' className='inline-flex text-foreground'>
          <Logo size={28} />
        </Link>
      </div>

      <div className='px-3 pb-4'>
        <ProjectSwitcher onNavigate={onNavigate} />
      </div>

      <nav aria-label='Main' className='no-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4'>
        {currentProject?.id ? (
          <NavGroup
            label='Project'
            items={buildProjectItems(currentProject.id)}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ) : (
          <div className='border border-dashed border-default-300 px-4 py-4'>
            <p className='text-[14px] font-medium text-foreground'>No project selected</p>
            <p className='mt-2 text-[13px] text-default-500'>Pick a project above or create a new one.</p>
            <Link
              href='/create-project'
              onClick={onNavigate}
              className='mt-3 inline-flex min-h-10 items-center gap-2 text-[14px] font-medium text-foreground underline-offset-4 hover:underline'>
              <Icon icon='lucide:plus' className='h-4 w-4' />
              Create project
            </Link>
          </div>
        )}
        <NavGroup label='Workspace' items={WORKSPACE_ITEMS} pathname={pathname} onNavigate={onNavigate} />
      </nav>

      <div className='border-t border-divider px-1 py-2'>
        <UserChip onNavigate={onNavigate} />
      </div>
    </div>
  )
}

/** Desktop sidebar (fixed). Also keeps the current project in sync with the URL. */
const Sidebar = (): JSX.Element => {
  const pathname = usePathname() || ''
  const params = useRouteParams()
  const searchParams = useSearchParams()
  const { projects, currentProject, setCurrentProject } = useProject()

  useEffect(() => {
    let projectId = searchParams.get('projectId')
    if (!projectId && pathname.startsWith('/project/') && typeof params.id === 'string') {
      projectId = params.id
    }
    if (!projectId) return
    const projectFromUrl = projects.find(p => p.id === projectId)
    if (projectFromUrl && currentProject?.id !== projectFromUrl.id) {
      setCurrentProject(projectFromUrl)
    }
  }, [searchParams, params.id, pathname, projects, currentProject, setCurrentProject])

  return (
    <aside className='fixed inset-y-0 left-0 z-40 flex h-screen w-[256px] flex-col border-r border-divider'>
      <SidebarContent />
    </aside>
  )
}

export default Sidebar
