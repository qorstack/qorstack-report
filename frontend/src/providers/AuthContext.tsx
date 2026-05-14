'use client'

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/api/generated/main-service'
import { ProfileDto, GoogleLoginRequest, GithubLoginRequest } from '@/api/generated/main-service/apiGenerated'
import { addToast } from '@heroui/react'
import Cookies from 'js-cookie'

const AUTH_COOKIE_NAME = 'is_authenticated'

export type AuthView = 'login' | 'register'

interface AuthContextType {
  user: ProfileDto | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (data: GoogleLoginRequest) => Promise<void>
  loginWithGithub: (data: GithubLoginRequest) => Promise<void>
  logout: () => void
  // Modal Control
  isAuthModalOpen: boolean
  authView: AuthView
  openAuthModal: (view?: AuthView) => void
  closeAuthModal: () => void
  setAuthView: (view: AuthView) => void
  // Registration
  startRegistration: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  refreshUser: () => Promise<void>
  navigateHome: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter()
  const [user, setUser] = useState<ProfileDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authView, setAuthView] = useState<AuthView>('login')

  const refreshUser = async () => {
    try {
      const profile = await api.settings.profileList()
      setUser({ ...profile })
      Cookies.set(AUTH_COOKIE_NAME, 'true', { expires: 7 })
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      setUser(null)
      Cookies.remove(AUTH_COOKIE_NAME)
    }
  }

  useEffect(() => {
    const initSession = async () => {
      const hasAuthCookie = Cookies.get(AUTH_COOKIE_NAME) === 'true'
      if (hasAuthCookie) {
        await refreshUser()
      } else {
        setIsLoading(false)
      }
      setIsLoading(false)
    }
    initSession()
  }, [])

  const navigateHome = async () => {
    try {
      const projects = await api.projects.projectsList()
      if (!projects || projects.length === 0) {
        router.push('/create-project')
      } else {
        const oldest = [...projects].sort(
          (a, b) => new Date(a.createdDatetime ?? 0).getTime() - new Date(b.createdDatetime ?? 0).getTime()
        )[0]
        router.push(`/project/${oldest.id}`)
      }
    } catch (error) {
      console.error('Failed to navigate home:', error)
      router.push('/create-project')
    }
  }

  const login = async (email: string, password: string) => {
    try {
      await api.auth.loginCreate({ email, password })
      Cookies.set(AUTH_COOKIE_NAME, 'true', { expires: 7 })
      await refreshUser()
      await navigateHome()
      setIsAuthModalOpen(false)
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.data?.status === 401) {
        addToast({ title: 'Login Failed', description: 'Invalid email or password', color: 'danger' })
      } else {
        addToast({ title: 'Login Error', description: 'An unexpected error occurred', color: 'danger' })
      }
    }
  }

  const loginWithGoogle = async (data: GoogleLoginRequest) => {
    try {
      await api.auth.googleLoginCreate(data)
      Cookies.set(AUTH_COOKIE_NAME, 'true', { expires: 7 })
      await refreshUser()
      await navigateHome()
      setIsAuthModalOpen(false)
    } catch (error) {
      console.error('Google login failed:', error)
      addToast({ title: 'Login Failed', description: 'Failed to login with Google', color: 'danger' })
    }
  }

  const loginWithGithub = async (data: GithubLoginRequest) => {
    try {
      await api.auth.githubLoginCreate(data)
      Cookies.set(AUTH_COOKIE_NAME, 'true', { expires: 7 })
      await refreshUser()
      await navigateHome()
      setIsAuthModalOpen(false)
    } catch (error) {
      console.error('Github login failed:', error)
      addToast({ title: 'Login Failed', description: 'Failed to login with Github', color: 'danger' })
    }
  }

  const logout = async () => {
    try {
      await api.auth.revokeTokenCreate({})
    } catch (error) {
      console.error('Logout API failed', error)
    } finally {
      setUser(null)
      Cookies.remove(AUTH_COOKIE_NAME)
      localStorage.removeItem('currentProjectId')
      router.replace('/')
    }
  }

  const openAuthModal = (view: AuthView = 'login') => {
    setAuthView(view)
    setIsAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setIsAuthModalOpen(false)
    setAuthView('login')
  }

  const startRegistration = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      await api.auth.registerCreate({ email, password, firstName: firstName ?? '', lastName: lastName ?? '' })
      await login(email, password)
    } catch (error: any) {
      if (error?.data?.title === 'USER_ALREADY_EXISTS') {
        addToast({ title: 'Registration Failed', description: 'User already exists', color: 'danger' })
        return
      }
      addToast({
        title: 'Registration Failed',
        description: error?.response?.data?.message || 'Failed to register',
        color: 'danger'
      })
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await api.auth.changePasswordCreate({ oldPassword: currentPassword, newPassword })
      addToast({ title: 'Password Changed', description: 'Your password has been successfully updated', color: 'success' })
    } catch (error) {
      console.error('Change password failed:', error)
      addToast({ title: 'Change Password Failed', description: 'Failed to update password', color: 'danger' })
    }
  }

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    loginWithGithub,
    logout,
    isAuthModalOpen,
    authView,
    openAuthModal,
    closeAuthModal,
    setAuthView,
    startRegistration,
    changePassword,
    refreshUser,
    navigateHome
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, isLoading, isAuthModalOpen, authView])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
