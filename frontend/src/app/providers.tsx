'use client'

import { Provider as ReduxProvider } from 'react-redux'
import store from '@/store'
import ReactQueryProvider from '@/providers/react-query'
import DayjsProvider from '@/providers/dayjs'
import NextUIProvider from '@/providers/next-ui'
import { AuthProvider } from '@/providers/AuthContext'
import { ProjectProvider } from '@/providers/ProjectContext'
import AuthModal from '@/components/auth/AuthModal'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider } from 'next-themes'

import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

import '@/configs/i18n'
import '@/iconify-bundle/icons-bundle-react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE'}>
        <ThemeProvider attribute='class' defaultTheme='dark' enableSystem={false}>
          <ReduxProvider store={store}>
            <NextUIProvider>
              <DayjsProvider>
                <AuthProvider>
                  <ProjectProvider>
                    <AuthModal />
                    {children}
                  </ProjectProvider>
                </AuthProvider>
              </DayjsProvider>
            </NextUIProvider>
          </ReduxProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </ReactQueryProvider>
  )
}
