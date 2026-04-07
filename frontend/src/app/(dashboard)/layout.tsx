'use client'

import AuthGuard from '@/providers/auth'
import SidebarLayout from '@/layouts/sidebar-layout'
import LoadingScreen from '@/components/loading-screen'
import { useSelector } from 'react-redux'
import { StateType } from '@/store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const loadingScreenReducer = useSelector((state: StateType) => state.loadingScreenReducer)

  return (
    <AuthGuard>
      <LoadingScreen isLoading={loadingScreenReducer.loadingList.length > 0} />
      <SidebarLayout>{children}</SidebarLayout>
    </AuthGuard>
  )
}
