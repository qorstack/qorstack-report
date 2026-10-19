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
  /** Sub-items: the id of the section they belong to (shown while that section is active). */
  section?: string
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
      {/* Main 3-column Layout */}
      <div className='mx-auto flex w-full max-w-[90rem] flex-1'>
        {/* Left Sidebar */}
        <aside
          className={`${
            mobileMenuOpen ? 'absolute inset-x-0 top-[68px] z-40 block bg-content1' : 'hidden'
          } w-full shrink-0 overflow-y-auto border-r border-divider bg-background md:sticky md:top-[68px] md:block md:h-[calc(100vh-68px)] md:w-60 lg:w-64`}>
          <nav aria-label='Documentation' className='space-y-6 pb-12 pt-6'>
            {sidebarGroups.map(group => (
              <div key={group.title}>
                <h3 className='mb-2 flex items-center gap-1.5 px-4 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-default-500'>
                  {group.icon && <Icon icon={group.icon} className='h-3.5 w-3.5' />}
                  {group.title}
                </h3>
                <ul>
                  {group.items.map(item => (
                    <li key={item.id}>
                      <button
                        type='button'
                        aria-current={activeSection === item.id ? 'true' : undefined}
                        onClick={() => {
                          onNavigate(item.id)
                          setMobileMenuOpen(false)
                        }}
                        className={`relative flex w-full items-center gap-2 py-1.5 pl-4 pr-3 text-left text-[14px] font-medium transition-colors before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary before:transition-opacity ${
                          activeSection === item.id
                            ? 'bg-content2 text-foreground before:opacity-100'
                            : 'text-default-500 before:opacity-0 hover:bg-content1 hover:text-foreground'
                        }`}>
                        {item.icon && (
                          <Icon
                            icon={item.icon}
                            className={`h-4 w-4 shrink-0 ${activeSection === item.id ? 'text-primary' : 'text-default-500'}`}
                          />
                        )}
                        <span className='flex-1'>{item.label}</span>
                        {item.badge && (
                          <span className='border border-primary px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase leading-none tracking-[0.1em] text-primary'>
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
        <main className='min-w-0 flex-1 px-4 py-10 sm:px-8 lg:px-12 xl:px-16'>
          <div className='mx-auto max-w-[52rem]'>{children}</div>
        </main>

        {/* Right TOC Sidebar — only the current section's sub-headings (the left menu already lists sections) */}
        <aside className='hidden w-56 shrink-0 xl:block'>
          <div className='sticky top-[68px] h-[calc(100vh-68px)] overflow-y-auto py-8 pl-6'>
            <nav aria-label='On this page' className='border-l border-divider'>
              <h4 className='mb-3 pl-4 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-default-500'>
                On this page
              </h4>
              <ul className='space-y-0.5'>
                {tocItems.filter(item => (item.section ?? item.id) === activeSection).map(item => (
                  <li key={`${item.id}-${item.label}`} className='relative'>
                    {activeSection === item.id && (
                      <div aria-hidden='true' className='absolute -left-[1px] top-0 h-full w-0.5 bg-primary' />
                    )}
                    <button
                      type='button'
                      aria-current={activeSection === item.id ? 'true' : undefined}
                      onClick={() => onNavigate(item.id)}
                      className={`block w-full py-1 text-left text-[13px] transition-colors ${
                        item.indent ? 'pl-7' : 'pl-4'
                      } ${
                        activeSection === item.id
                          ? 'font-semibold text-foreground'
                          : 'text-default-500 hover:text-foreground'
                      }`}>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default DocLayout
