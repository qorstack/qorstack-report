'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/api/generated/main-service'
import { ProfileDto, GoogleLoginRequest, GithubLoginRequest } from '@/api/generated/main-service/apiGenerated'
import { addToast } from '@heroui/react'
import Cookies from 'js-cookie'

const AUTH_COOKIE_NAME = 'is_authenticated'

// Re-export AuthView for use in components
export type AuthView = 'login' | 'register' | 'forgot-password' | 'verify-otp' | 'reset-password'
export type OtpFlowType = 'register' | 'forgot-password'
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
  // Registration/OTP Flow
  pendingEmail: string
  setPendingEmail: (email: string) => void
  otpRef: string
  setOtpRef: (ref: string) => void
  otpFlow: OtpFlowType
  setOtpFlow: (flow: OtpFlowType) => void
  // Real API functions
  startRegistration: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>
  verifyOtp: (otp: string) => Promise<boolean>
  sendForgotPasswordOtp: (email: string) => Promise<void>
  resetPassword: (password: string) => Promise<void>
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

  // OTP Flow State
  const [pendingEmail, setPendingEmail] = useState('')
  const [pendingPassword, setPendingPassword] = useState('')
  const [otpRef, setOtpRef] = useState('')
  const [otpFlow, setOtpFlow] = useState<OtpFlowType>('register')
  const [verificationToken, setVerificationToken] = useState<string>('')

  const refreshUser = async () => {
    try {
      const profile = await api.settings.profileList()
      setUser({ ...profile })
      Cookies.set(AUTH_COOKIE_NAME, 'true', { expires: 7 }) // Sync cookie state
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      setUser(null)
      Cookies.remove(AUTH_COOKIE_NAME) // Clear cookie if refresh fails (session invalid)
    }
  }

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      const hasAuthCookie = Cookies.get(AUTH_COOKIE_NAME) === 'true'

      if (hasAuthCookie) {
        // Only attempt to fetch user if we think we have a session
        await refreshUser()
      } else {
        // No auth cookie -> assume logged out without API call
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
        router.push(`/project/${projects[0].id}`)
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
        addToast({
          title: 'Login Failed',
          description: 'Invalid email or password',
          color: 'danger'
        })
      } else {
        addToast({
          title: 'Login Error',
          description: 'An unexpected error occurred',
          color: 'danger'
        })
      }
    }
  }

  const loginWithGoogle = async (data: GoogleLoginRequest) => {
    try {
      await api.auth.googleLoginCreate(data)
      Cookies.set(AUTH_COOKIE_NAME, 'true', { expires: 7 })

      // Fetch user profile
      await refreshUser()
      await navigateHome()
      setIsAuthModalOpen(false)
    } catch (error) {
      console.error('Google login failed:', error)
      addToast({
        title: 'Login Failed',
        description: 'Failed to login with Google',
        color: 'danger'
      })
    }
  }

  const loginWithGithub = async (data: GithubLoginRequest) => {
    try {
      await api.auth.githubLoginCreate(data)
      Cookies.set(AUTH_COOKIE_NAME, 'true', { expires: 7 })

      // Fetch user profile
      await refreshUser()
      await navigateHome()
      setIsAuthModalOpen(false)
    } catch (error) {
      console.error('Github login failed:', error)
      addToast({
        title: 'Login Failed',
        description: 'Failed to login with Github',
        color: 'danger'
      })
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
    setPendingEmail('')
    setOtpRef('')
  }

  const closeAuthModal = () => {
    setIsAuthModalOpen(false)
    setPendingEmail('')
    setOtpRef('')
    setAuthView('login')
  }

  const startRegistration = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const response = await api.auth.registerCreate({ email, password, firstName: firstName ?? '', lastName: lastName ?? '' })
      if (response?.refCode) {
        setOtpRef(response.refCode)
      }
      setPendingEmail(email)
      setPendingPassword(password)
      setOtpFlow('register')
      setAuthView('verify-otp')
    } catch (error: any) {
      if (error?.data?.title === 'USER_ALREADY_EXISTS') {
        addToast({
          title: 'Registration Failed',
          description: 'User already exists',
          color: 'danger'
        })
        return
      }

      addToast({
        title: 'Registration Failed',
        description: error?.response?.data?.message || 'Failed to start registration',
        color: 'danger'
      })
    }
  }

  const verifyOtp = async (otp: string): Promise<boolean> => {
    try {
      const response = await api.auth.verifyOtpCreate({
        email: pendingEmail,
        otp,
        type: otpFlow === 'register' ? 'REGISTER' : 'FORGOT_PASSWORD'
      })

      if (response?.verificationToken) {
        setVerificationToken(response.verificationToken)
      }

      if (otpFlow === 'register') {
        try {
          await login(pendingEmail, pendingPassword)

          setPendingPassword('')
        } catch (loginError) {
          setAuthView('login')
          addToast({
            title: 'Email Verified',
            description: 'Your account has been verified. Please login.',
            color: 'success'
          })
        }
      } else {
        setAuthView('reset-password')
      }

      return true
    } catch (error: any) {
      if (error?.data?.title === 'INVALID_OTP') {
        addToast({
          title: 'Verification Failed',
          description: 'Invalid OTP code',
          color: 'danger'
        })
        return false
      }

      if (error?.data?.title === 'OTP_EXPIRED') {
        addToast({
          title: 'Verification Failed',
          description: 'OTP Expired. Please resend new OTP.',
          color: 'danger'
        })
        return false
      }

      addToast({
        title: 'Verification Failed',
        description: 'Invalid OTP code',
        color: 'danger'
      })

      return false
    }
  }

  const sendForgotPasswordOtp = async (email: string) => {
    try {
      const response = await api.auth.forgotPasswordCreate({ email })
      if (response?.refCode) {
        setOtpRef(response.refCode)
      }

      setPendingEmail(email)
      setOtpFlow('forgot-password')
      setAuthView('verify-otp')
    } catch (error: any) {
      addToast({
        title: 'Failed to send OTP',
        description: 'Could not send reset code. Please check your email.',
        color: 'danger'
      })
    }
  }

  const resetPassword = async (password: string) => {
    try {
      await api.auth.resetPasswordCreate({
        verificationToken,
        newPassword: password
      })

      try {
        await login(pendingEmail, password)
      } catch (loginError) {
        setAuthView('login')
        addToast({
          title: 'Password Reset Successful',
          description: 'Please login with your new password',
          color: 'success'
        })
      }

      setVerificationToken('')
      setPendingEmail('')
    } catch (error) {
      console.error('Reset password failed:', error)
      addToast({
        title: 'Reset Password Failed',
        description: 'Failed to reset password',
        color: 'danger'
      })
    }
  }

  // ChangePasswordRequest uses oldPassword, not currentPassword
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await api.auth.changePasswordCreate({ oldPassword: currentPassword, newPassword })
      addToast({
        title: 'Password Changed',
        description: 'Your password has been successfully updated',
        color: 'success'
      })
    } catch (error) {
      console.error('Change password failed:', error)
      addToast({
        title: 'Change Password Failed',
        description: 'Failed to update password',
        color: 'danger'
      })
    }
  }

  return (
    <AuthContext.Provider
      value={{
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
        pendingEmail,
        setPendingEmail,
        otpRef,
        setOtpRef,
        otpFlow,
        setOtpFlow,
        startRegistration,
        verifyOtp,
        sendForgotPasswordOtp,
        resetPassword,
        changePassword,
        refreshUser,
        navigateHome
      }}>
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
