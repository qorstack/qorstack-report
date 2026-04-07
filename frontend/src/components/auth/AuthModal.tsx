import React, { useEffect, useState } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Divider,
  Link,
  Progress
} from '@heroui/react'
import OtpInput from '@/components/otp-input'
import { useAuth } from '@/providers/AuthContext'
import Icon from '@/components/icon'
import { useGoogleLogin } from '@react-oauth/google'
import axios from 'axios'
import { addToast } from '@heroui/react'

// Password validation rules
const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters long', test: (pw: string) => pw.length >= 8 },
  { key: 'uppercase', label: 'Contains uppercase letter (A–Z)', test: (pw: string) => /[A-Z]/.test(pw) },
  { key: 'lowercase', label: 'Contains lowercase letter (a–z)', test: (pw: string) => /[a-z]/.test(pw) },
  { key: 'number', label: 'Contains number (0–9)', test: (pw: string) => /[0-9]/.test(pw) },
  {
    key: 'special',
    label: 'Contains special character (@#$% etc.)',
    test: (pw: string) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(pw)
  }
]

const mockUser = {
  email: '',
  password: ''
}

// Password Strength Indicator Component
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const passedRules = PASSWORD_RULES.filter(rule => rule.test(password))
  const passedCount = passedRules.length
  const percentage = (passedCount / PASSWORD_RULES.length) * 100

  // Color coding: 0-2 = red, 3-4 = yellow, 5 = green
  const getColor = () => {
    if (passedCount <= 2) return 'danger'
    if (passedCount <= 4) return 'warning'
    return 'success'
  }

  const getColorHex = () => {
    if (passedCount <= 2) return '#ef4444'
    if (passedCount <= 4) return '#eab308'
    return '#22c55e'
  }

  return (
    <div className='mt-3 rounded-lg border border-default-200 bg-content2 p-4'>
      <div className='mb-3 flex items-center justify-between'>
        <span className='text-sm font-semibold text-default-700'>Password Requirements</span>
        <span className='text-sm font-bold' style={{ color: getColorHex() }}>
          ({Math.round(percentage)}%)
        </span>
      </div>

      <Progress aria-label='Password strength' value={percentage} color={getColor()} className='mb-3' size='sm' />

      <div className='grid gap-1.5'>
        {PASSWORD_RULES.map(rule => {
          const passed = rule.test(password)
          return (
            <div key={rule.key} className='flex items-center gap-2'>
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-full text-xs transition-colors ${
                  passed ? 'bg-success text-white' : 'border border-default-300 bg-content1'
                }`}>
                {passed && <Icon icon='lucide:check' className='h-3 w-3' />}
              </div>
              <span className={`text-xs ${passed ? 'text-success' : 'text-default-500'}`}>{rule.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Check if password is valid
const isPasswordValid = (password: string) => {
  return PASSWORD_RULES.every(rule => rule.test(password))
}

// Password input with toggle - moved outside to prevent re-creation on every render
const PasswordInput = ({
  label,
  placeholder,
  value,
  onChange,
  show,
  onToggle,
  error
}: {
  label: string
  placeholder: string
  value: string
  onChange: (val: string) => void
  show: boolean
  onToggle: () => void
  error?: string
}) => (
  <Input
    label={label}
    placeholder={placeholder}
    type={show ? 'text' : 'password'}
    variant='bordered'
    labelPlacement='outside'
    value={value}
    onValueChange={onChange}
    isInvalid={!!error}
    errorMessage={error}
    endContent={
      <button type='button' onClick={onToggle} tabIndex={-1} className='text-default-400 hover:text-default-600'>
        <Icon icon={show ? 'lucide:eye-off' : 'lucide:eye'} className='h-5 w-5' />
      </button>
    }
    classNames={{
      inputWrapper:
        'bg-content1 border-default-200 data-[hover=true]:border-primary-300 group-data-[focus=true]:border-primary-500'
    }}
  />
)

const AuthModal = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authView,
    setAuthView,
    login,
    loginWithGoogle,
    pendingEmail,
    setPendingEmail,
    otpRef,
    otpFlow,
    startRegistration,
    verifyOtp,
    sendForgotPasswordOtp,
    resetPassword
  } = useAuth()

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // OTP states
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  // Error states
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset state when modal opens or view changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setEmail(mockUser.email)
      setPassword(mockUser.password)
      setConfirmPassword(mockUser.password)
      setOtp('')
      setOtpError('')
      setErrors({})
    }
  }, [isAuthModalOpen])

  // Reset password fields when view changes
  useEffect(() => {
    setPassword('')
    setConfirmPassword('')
    setErrors({})
  }, [authView])

  // Start resend timer when OTP view opens
  useEffect(() => {
    if (authView === 'verify-otp') {
      setResendTimer(30)
      setOtp('')
      setOtpError('')
    }
  }, [authView])

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(r => r - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  // Handlers
  const handleLogin = async () => {
    const newErrors: { email?: string; password?: string } = {}
    if (!email) newErrors.email = 'Please enter your email'
    if (!password) newErrors.password = 'Please enter your password'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setIsSubmitting(true)
      await login(email, password)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleLogin()
  }

  const handleGithubLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
    if (!clientId) {
      addToast({
        title: 'Configuration Error',
        description: 'GitHub Client ID is missing',
        color: 'danger'
      })
      return
    }
    const redirectUri = `${window.location.origin}/auth/github/callback`
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email&redirect_uri=${redirectUri}`
  }

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async tokenResponse => {
      try {
        setIsSubmitting(true)
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        })

        await loginWithGoogle({
          googleId: userInfo.data.sub,
          email: userInfo.data.email,
          firstName: userInfo.data.given_name,
          lastName: userInfo.data.family_name,
          photoUrl: userInfo.data.picture
        })
      } catch (error) {
        console.error('Google login error:', error)
      } finally {
        setIsSubmitting(false)
      }
    },
    onError: () => {
      addToast({
        title: 'Login Failed',
        description: 'Failed to login with Google',
        color: 'danger'
      })
    }
  })

  const handleRegister = async () => {
    const newErrors: { email?: string; password?: string; confirmPassword?: string } = {}
    if (!email) newErrors.email = 'Please enter your email'
    if (!password) newErrors.password = 'Please enter your password'
    if (!isPasswordValid(password)) newErrors.password = 'Password does not meet requirements'
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setIsSubmitting(true)
      await startRegistration(email, password)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleRegister()
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setErrors({ email: 'Please enter your email' })
      return
    }
    try {
      setIsSubmitting(true)
      await sendForgotPasswordOtp(email)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleForgotPassword()
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setOtpError('Please enter 6-digit OTP')
      return
    }
    try {
      setIsSubmitting(true)
      const success = await verifyOtp(otp)
      if (!success) {
        // Error assumed to be handled by context or we can add specific logic here if context returns false without throwing
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleVerifyOtp()
  }

  const handleResendOtp = () => {
    setResendTimer(30)
    setOtp('')
    setOtpError('')
    // Re-send OTP (mock - just regenerates ref)
    if (otpFlow === 'register') {
      startRegistration(pendingEmail, password)
    } else {
      sendForgotPasswordOtp(pendingEmail)
    }
  }

  const handleResetPassword = async () => {
    const newErrors: { password?: string; confirmPassword?: string } = {}
    if (!password) newErrors.password = 'Please enter a new password'
    if (!isPasswordValid(password)) newErrors.password = 'Password does not meet requirements'
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setIsSubmitting(true)
      await resetPassword(password)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleResetPassword()
  }

  // Mask email for display
  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@')
    if (!domain) return email
    const maskedLocal = local.length > 3 ? local.slice(0, 3) + '***' : local
    return `${maskedLocal}@${domain}`
  }

  const titleMap = {
    login: 'Welcome Back',
    register: 'Create Account',
    'forgot-password': 'Forgot Password',
    'verify-otp': 'Verify OTP',
    'reset-password': 'Reset Password'
  }

  const subtitleMap = {
    login: 'Login to access Qorstack Report',
    register: 'Get started with Qorstack Report today',
    'forgot-password': 'Enter your email to receive OTP',
    'verify-otp': otpFlow === 'register' ? 'Verify your email address' : 'Verify your identity to reset password',
    'reset-password': 'Please set a new password'
  }

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onOpenChange={open => !open && closeAuthModal()}
      size='md'
      backdrop='blur'
      placement='center'
      classNames={{
        base: 'border border-default-100 shadow-xl bg-content1',
        header: 'border-b border-default-100 py-4',
        body: 'py-6',
        footer: 'border-t border-default-100 py-4'
      }}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader className='flex flex-col gap-1 text-center'>
              <h2 className='text-xl font-bold text-foreground'>{titleMap[authView]}</h2>
              <p className='text-sm font-normal text-default-500'>{subtitleMap[authView]}</p>
            </ModalHeader>

            <ModalBody>
              <div className='flex flex-col gap-4'>
                {/* ==================== LOGIN VIEW ==================== */}
                {authView === 'login' && (
                  <form id='login-form' onSubmit={handleLoginSubmit} className='flex flex-col gap-4'>
                    {/* Google Login */}
                    <Button
                      variant='bordered'
                      startContent={<Icon icon='flat-color-icons:google' className='h-5 w-5' />}
                      className='font-medium text-default-700'
                      onPress={() => handleGoogleLogin()}>
                      Continue with Google
                    </Button>

                    {/* GitHub Login */}
                    <Button
                      variant='bordered'
                      startContent={<Icon icon='mdi:github' className='h-5 w-5' />}
                      className='font-medium text-default-700'
                      onPress={() => handleGithubLogin()}>
                      Continue with GitHub
                    </Button>

                    <div className='flex items-center gap-2'>
                      <Divider className='flex-1' />
                      <span className='text-xs uppercase text-default-400'>Or</span>
                      <Divider className='flex-1' />
                    </div>

                    <Input
                      label='Email'
                      placeholder='name@example.com'
                      variant='bordered'
                      labelPlacement='outside'
                      value={email}
                      onValueChange={v => {
                        setEmail(v)
                        setErrors(e => ({ ...e, email: undefined }))
                      }}
                      isInvalid={!!errors.email}
                      errorMessage={errors.email}
                      classNames={{
                        inputWrapper:
                          'bg-content1 border-default-200 data-[hover=true]:border-primary-300 group-data-[focus=true]:border-primary-500'
                      }}
                    />

                    <PasswordInput
                      label='Password'
                      placeholder='Enter your password'
                      value={password}
                      onChange={v => {
                        setPassword(v)
                        setErrors(e => ({ ...e, password: undefined }))
                      }}
                      show={showPassword}
                      onToggle={() => setShowPassword(!showPassword)}
                      error={errors.password}
                    />

                    <div className='flex justify-end'>
                      <Link
                        as='button'
                        type='button'
                        size='sm'
                        className='cursor-pointer text-primary hover:underline'
                        onPress={() => setAuthView('forgot-password')}>
                        Forgot password?
                      </Link>
                    </div>
                  </form>
                )}

                {/* ==================== REGISTER VIEW ==================== */}
                {authView === 'register' && (
                  <form id='register-form' onSubmit={handleRegisterSubmit} className='flex flex-col gap-4'>
                    <Input
                      label='Email'
                      placeholder='name@example.com'
                      variant='bordered'
                      labelPlacement='outside'
                      value={email}
                      onValueChange={v => {
                        setEmail(v)
                        setErrors(e => ({ ...e, email: undefined }))
                      }}
                      isInvalid={!!errors.email}
                      errorMessage={errors.email}
                      classNames={{
                        inputWrapper:
                          'bg-content1 border-default-200 data-[hover=true]:border-primary-300 group-data-[focus=true]:border-primary-500'
                      }}
                    />

                    <PasswordInput
                      label='Password'
                      placeholder='Enter your password'
                      value={password}
                      onChange={v => {
                        setPassword(v)
                        setErrors(e => ({
                          ...e,
                          password: undefined,
                          confirmPassword: v === confirmPassword ? undefined : e.confirmPassword
                        }))
                      }}
                      show={showPassword}
                      onToggle={() => setShowPassword(!showPassword)}
                      error={errors.password}
                    />

                    <PasswordInput
                      label='Confirm Password'
                      placeholder='Re-enter your password'
                      value={confirmPassword}
                      onChange={v => {
                        setConfirmPassword(v)
                        setErrors(e => ({
                          ...e,
                          confirmPassword: v === password ? undefined : e.confirmPassword
                        }))
                      }}
                      show={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                      error={errors.confirmPassword}
                    />

                    {/* Password Strength Indicator */}
                    <PasswordStrengthIndicator password={password} />
                  </form>
                )}

                {/* ==================== FORGOT PASSWORD VIEW ==================== */}
                {authView === 'forgot-password' && (
                  <form id='forgot-password-form' onSubmit={handleForgotPasswordSubmit} className='flex flex-col gap-4'>
                    <Input
                      label='Email'
                      placeholder='name@example.com'
                      variant='bordered'
                      labelPlacement='outside'
                      value={email}
                      onValueChange={v => {
                        setEmail(v)
                        setErrors(e => ({ ...e, email: undefined }))
                      }}
                      isInvalid={!!errors.email}
                      errorMessage={errors.email}
                      classNames={{
                        inputWrapper:
                          'bg-content1 border-default-200 data-[hover=true]:border-primary-300 group-data-[focus=true]:border-primary-500'
                      }}
                    />
                  </form>
                )}

                {/* ==================== VERIFY OTP VIEW ==================== */}
                {authView === 'verify-otp' && (
                  <form id='verify-otp-form' onSubmit={handleVerifyOtpSubmit} className='flex flex-col gap-4'>
                    <div className='rounded-lg bg-primary-50 p-4 text-center'>
                      <p className='text-sm text-primary-600'>We sent an OTP code to</p>
                      <p className='font-semibold text-primary'>{maskEmail(pendingEmail)}</p>
                    </div>

                    <div className='text-center'>
                      <span className='text-sm text-default-500'>OTP Ref: </span>
                      <span className='font-mono font-bold text-default-700'>{otpRef}</span>
                    </div>

                    <div className='flex items-center justify-center'>
                      <OtpInput
                        length={6}
                        value={otp}
                        onValueChange={setOtp}
                        isInvalid={!!otpError}
                        errorMessage={otpError}
                        autoFocus
                      />
                    </div>

                    <div className='text-center'>
                      {resendTimer > 0 ? (
                        <span className='text-sm text-default-400'>Resend OTP in {resendTimer} seconds</span>
                      ) : (
                        <Link
                          as='button'
                          size='sm'
                          className='cursor-pointer text-primary hover:underline'
                          onPress={handleResendOtp}>
                          Resend OTP
                        </Link>
                      )}
                    </div>
                  </form>
                )}

                {/* ==================== RESET PASSWORD VIEW ==================== */}
                {authView === 'reset-password' && (
                  <form id='reset-password-form' onSubmit={handleResetPasswordSubmit} className='flex flex-col gap-4'>
                    <PasswordInput
                      label='New Password'
                      placeholder='Enter new password'
                      value={password}
                      onChange={v => {
                        setPassword(v)
                        setErrors(e => ({
                          ...e,
                          password: undefined,
                          confirmPassword: v === confirmPassword ? undefined : e.confirmPassword
                        }))
                      }}
                      show={showPassword}
                      onToggle={() => setShowPassword(!showPassword)}
                      error={errors.password}
                    />

                    <PasswordInput
                      label='Confirm New Password'
                      placeholder='Re-enter new password'
                      value={confirmPassword}
                      onChange={v => {
                        setConfirmPassword(v)
                        setErrors(e => ({
                          ...e,
                          confirmPassword: v === password ? undefined : e.confirmPassword
                        }))
                      }}
                      show={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                      error={errors.confirmPassword}
                    />

                    {/* Password Strength Indicator */}
                    <PasswordStrengthIndicator password={password} />
                  </form>
                )}
              </div>
            </ModalBody>

            <ModalFooter className='flex flex-col gap-3'>
              {/* Action Button */}
              {authView === 'login' && (
                <Button
                  color='primary'
                  className='w-full font-bold shadow-lg shadow-primary/20'
                  type='submit'
                  form='login-form'
                  onPress={handleLogin}
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting}>
                  Login
                </Button>
              )}
              {authView === 'register' && (
                <Button
                  color='primary'
                  className='w-full font-bold shadow-lg shadow-primary/20'
                  type='submit'
                  form='register-form'
                  onPress={handleRegister}
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting}>
                  Create Account
                </Button>
              )}
              {authView === 'forgot-password' && (
                <Button
                  color='primary'
                  className='w-full font-bold shadow-lg shadow-primary/20'
                  type='submit'
                  form='forgot-password-form'
                  onPress={handleForgotPassword}
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting}>
                  Send OTP
                </Button>
              )}
              {authView === 'verify-otp' && (
                <Button
                  color='primary'
                  className='w-full font-bold shadow-lg shadow-primary/20'
                  type='submit'
                  form='verify-otp-form'
                  onPress={handleVerifyOtp}
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting}>
                  Verify OTP
                </Button>
              )}
              {authView === 'reset-password' && (
                <Button
                  color='primary'
                  className='w-full font-bold shadow-lg shadow-primary/20'
                  type='submit'
                  form='reset-password-form'
                  onPress={handleResetPassword}
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting}>
                  Reset Password
                </Button>
              )}

              {/* Navigation Links */}
              <div className='text-center text-sm text-default-500'>
                {authView === 'login' && (
                  <>
                    Don&apos;t have an account?{' '}
                    <Link
                      as='button'
                      onPress={() => setAuthView('register')}
                      className='cursor-pointer font-bold text-primary'>
                      Register
                    </Link>
                  </>
                )}
                {authView === 'register' && (
                  <>
                    Already have an account?{' '}
                    <Link
                      as='button'
                      onPress={() => setAuthView('login')}
                      className='cursor-pointer font-bold text-primary'>
                      Login
                    </Link>
                  </>
                )}
                {authView === 'forgot-password' && (
                  <Link
                    as='button'
                    onPress={() => setAuthView('login')}
                    className='cursor-pointer font-bold text-primary'>
                    Back to Login
                  </Link>
                )}
                {authView === 'verify-otp' && (
                  <Link
                    as='button'
                    onPress={() => setAuthView(otpFlow === 'register' ? 'register' : 'forgot-password')}
                    className='cursor-pointer font-bold text-primary'>
                    Go Back
                  </Link>
                )}
                {authView === 'reset-password' && (
                  <Link
                    as='button'
                    onPress={() => setAuthView('login')}
                    className='cursor-pointer font-bold text-primary'>
                    Back to Login
                  </Link>
                )}
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}

export default AuthModal
