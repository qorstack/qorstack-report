import React, { useEffect, useState } from 'react'
import { useAppConfig } from '@/hooks/use-app-config'
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

const PCT_TEXT: Record<'danger' | 'warning' | 'success', string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  success: 'text-success'
}

// Password Strength Indicator Component
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const passedRules = PASSWORD_RULES.filter(rule => rule.test(password))
  const passedCount = passedRules.length
  const percentage = (passedCount / PASSWORD_RULES.length) * 100

  const getColor = (): 'danger' | 'warning' | 'success' => {
    if (passedCount <= 2) return 'danger'
    if (passedCount <= 4) return 'warning'
    return 'success'
  }

  return (
    <div className='mt-1 border border-divider bg-content2 p-4'>
      <div className='mb-3 flex items-center justify-between'>
        <span className='font-mono text-[12px] uppercase tracking-[0.14em] text-default-500'>
          Password requirements
        </span>
        <span className={`font-mono text-[12px] font-bold ${PCT_TEXT[getColor()]}`}>{Math.round(percentage)}%</span>
      </div>

      <Progress
        aria-label='Password strength'
        value={percentage}
        color={getColor()}
        className='mb-3'
        size='sm'
        radius='none'
      />

      <ul className='grid gap-1.5'>
        {PASSWORD_RULES.map(rule => {
          const passed = rule.test(password)
          return (
            <li key={rule.key} className='flex items-center gap-2'>
              <Icon
                icon={passed ? 'lucide:check' : 'lucide:minus'}
                aria-hidden='true'
                className={`h-3.5 w-3.5 shrink-0 ${passed ? 'text-success' : 'text-default-500'}`}
              />
              <span className={`text-[12px] ${passed ? 'text-success' : 'text-default-500'}`}>
                {rule.label}
                <span className='sr-only'>{passed ? ' — met' : ' — not met'}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const INPUT_CLASSNAMES = {
  label: 'text-[13px] font-medium text-foreground',
  inputWrapper:
    'bg-content2 border-default-300 data-[hover=true]:border-default-500 group-data-[focus=true]:border-primary group-data-[focus=true]:shadow-[inset_3px_0_0_#F2271C]',
  errorMessage: 'text-[12px]'
}

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <span className='flex items-center gap-1.5 text-danger'>
      <Icon icon='lucide:circle-alert' aria-hidden='true' className='h-3.5 w-3.5 shrink-0' />
      {message}
    </span>
  ) : null

const isPasswordValid = (password: string) => {
  return PASSWORD_RULES.every(rule => rule.test(password))
}

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
    errorMessage={<FieldError message={error} />}
    endContent={
      <button
        type='button'
        onClick={onToggle}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        className='text-default-500 transition-colors hover:text-foreground'>
        <Icon icon={show ? 'lucide:eye-off' : 'lucide:eye'} className='h-4 w-4' />
      </button>
    }
    classNames={INPUT_CLASSNAMES}
  />
)

const AuthModal = () => {
  const { githubClientId } = useAppConfig()
  const { isAuthModalOpen, closeAuthModal, authView, setAuthView, login, loginWithGoogle, startRegistration } =
    useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthModalOpen) {
      setEmail(mockUser.email)
      setPassword(mockUser.password)
      setConfirmPassword(mockUser.password)
      setErrors({})
    }
  }, [isAuthModalOpen])

  useEffect(() => {
    setPassword('')
    setConfirmPassword('')
    setErrors({})
  }, [authView])

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
    const clientId = githubClientId
    if (!clientId) {
      addToast({ title: 'Configuration Error', description: 'GitHub Client ID is missing', color: 'danger' })
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
    onError: () => addToast({ title: 'Login Failed', description: 'Failed to login with Google', color: 'danger' })
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

  const titleMap = {
    login: 'Welcome Back',
    register: 'Create Account'
  }

  const subtitleMap = {
    login: 'Login to access Qorstack Report',
    register: 'Get started with Qorstack Report today'
  }

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onOpenChange={open => !open && closeAuthModal()}
      size='md'
      backdrop='opaque'
      placement='center'
      classNames={{
        base: 'border border-default-300 bg-content1 shadow-[0_24px_60px_-24px_rgba(20,20,20,.3)] dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,.8)]',
        header: 'border-b border-divider py-5',
        body: 'py-6',
        footer: 'border-t border-divider py-4'
      }}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader className='flex flex-col gap-2'>
              <span className='font-mono text-[12px] font-normal uppercase tracking-[0.16em] text-default-500'>
                {authView === 'login' ? 'Sign in' : 'Register'}
              </span>
              <h2 className='press-display text-[28px] text-foreground'>{titleMap[authView]}</h2>
              <p className='text-[14px] font-normal text-default-500'>{subtitleMap[authView]}</p>
            </ModalHeader>

            <ModalBody>
              <div className='flex flex-col gap-4'>
                {/* ==================== LOGIN VIEW ==================== */}
                {authView === 'login' && (
                  <form id='login-form' onSubmit={handleLoginSubmit} className='flex flex-col gap-4'>
                    <Button
                      variant='bordered'
                      startContent={<Icon icon='flat-color-icons:google' aria-hidden='true' className='h-4 w-4' />}
                      className='h-11 border-default-300 font-semibold uppercase tracking-[0.04em] text-foreground data-[hover=true]:border-foreground'
                      onPress={() => handleGoogleLogin()}>
                      Continue with Google
                    </Button>

                    <Button
                      variant='bordered'
                      startContent={<Icon icon='mdi:github' aria-hidden='true' className='h-4 w-4' />}
                      className='h-11 border-default-300 font-semibold uppercase tracking-[0.04em] text-foreground data-[hover=true]:border-foreground'
                      onPress={() => handleGithubLogin()}>
                      Continue with GitHub
                    </Button>

                    <div className='flex items-center gap-3' aria-hidden='true'>
                      <Divider className='flex-1' />
                      <span className='font-mono text-[11px] uppercase tracking-[0.16em] text-default-500'>Or</span>
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
                      errorMessage={<FieldError message={errors.email} />}
                      classNames={INPUT_CLASSNAMES}
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
                      errorMessage={<FieldError message={errors.email} />}
                      classNames={INPUT_CLASSNAMES}
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

                    <PasswordStrengthIndicator password={password} />
                  </form>
                )}
              </div>
            </ModalBody>

            <ModalFooter className='flex flex-col gap-3'>
              {authView === 'login' && (
                <Button
                  color='primary'
                  size='lg'
                  className='w-full font-bold uppercase tracking-[0.04em]'
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
                  size='lg'
                  className='w-full font-bold uppercase tracking-[0.04em]'
                  type='submit'
                  form='register-form'
                  onPress={handleRegister}
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting}>
                  Create Account
                </Button>
              )}

              <div className='text-center text-[14px] text-default-500'>
                {authView === 'login' && (
                  <>
                    Don&apos;t have an account?{' '}
                    <Link
                      as='button'
                      onPress={() => setAuthView('register')}
                      className='cursor-pointer font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary'>
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
                      className='cursor-pointer font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary'>
                      Login
                    </Link>
                  </>
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
