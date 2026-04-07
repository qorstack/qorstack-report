import React, { useState } from 'react'
import Icon from '@/components/icon'

export interface SidebarItem {
  id: string
  label: string
  icon?: string
  badge?: string
}

export interface SidebarGroup {
  title: string
  icon?: string
  items: SidebarItem[]
}

export interface TocItem {
  id: string
  label: string
  indent?: boolean
}

interface DocLayoutProps {
  sidebarGroups: SidebarGroup[]
  tocItems: TocItem[]
  activeSection: string
  onNavigate: (id: string) => void
  children: React.ReactNode
}

const DocLayout = ({ sidebarGroups, tocItems, activeSection, onNavigate, children }: DocLayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className='flex min-h-screen flex-col bg-background font-sans text-foreground'>
      {/* Spacer for fixed navbar from parent layout */}
      <div className='h-14' />

      {/* Main 3-column Layout */}
      <div className='mx-auto flex w-full max-w-[90rem] flex-1'>
        {/* Left Sidebar */}
        <aside
          className={`${
            mobileMenuOpen ? 'absolute inset-x-0 top-12 z-40 block bg-background shadow-xl' : 'hidden'
          } w-full shrink-0 overflow-y-auto border-r border-default-200 md:sticky md:top-12 md:block md:h-[calc(100vh-3rem)] md:w-60 lg:w-64`}>
          <nav className='space-y-5 p-4 pb-12 pt-5'>
            {sidebarGroups.map(group => (
              <div key={group.title}>
                <h3 className='mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-default-400'>
                  {group.icon && <Icon icon={group.icon} className='text-xs' />}
                  {group.title}
                </h3>
                <ul className='space-y-0.5'>
                  {group.items.map(item => (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          onNavigate(item.id)
                          setMobileMenuOpen(false)
                        }}
                        className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-[13px] font-medium transition-colors ${
                          activeSection === item.id
                            ? 'bg-primary/5 text-primary'
                            : 'text-default-600 hover:bg-content2 hover:text-foreground'
                        }`}>
                        {item.icon && (
                          <Icon
                            icon={item.icon}
                            className={`shrink-0 text-sm ${activeSection === item.id ? 'text-primary' : 'text-default-400'}`}
                          />
                        )}
                        <span className='flex-1'>{item.label}</span>
                        {item.badge && (
                          <span className='rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary'>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className='min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 xl:px-16'>
          {children}
        </main>

        {/* Right TOC Sidebar */}
        <aside className='hidden w-56 shrink-0 xl:block'>
          <div className='sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto py-8 pl-6'>
            <div className='border-l border-default-200'>
              <h4 className='mb-3 pl-4 text-[11px] font-bold uppercase tracking-wider text-default-400'>On this page</h4>
              <ul className='space-y-0.5'>
                {tocItems.map((item) => (
                  <li key={`${item.id}-${item.label}`} className='relative'>
                    {activeSection === item.id && (
                      <div className='absolute -left-[1px] top-0 h-full w-0.5 rounded-full bg-primary' />
                    )}
                    <button
                      onClick={() => onNavigate(item.id)}
                      className={`block w-full py-1 text-left text-[13px] transition-colors ${
                        item.indent ? 'pl-7' : 'pl-4'
                      } ${
                        activeSection === item.id
                          ? 'font-semibold text-primary'
                          : 'text-default-400 hover:text-foreground'
                      }`}>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default DocLayout
