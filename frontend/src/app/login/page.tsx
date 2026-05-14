'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button, Input, Progress, addToast, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react'
import { useAuth } from '@/providers/AuthContext'
import Icon from '@/components/icon'
import { useGoogleLogin } from '@react-oauth/google'
import axios from 'axios'
import SwitchTheme from '@/components/switch-theme'

// =============================================================================
// Password rules
// =============================================================================
const PASSWORD_RULES = [
  { key: 'length',    label: 'At least 8 characters',        test: (pw: string) => pw.length >= 8 },
  { key: 'uppercase', label: 'Uppercase letter (A–Z)',        test: (pw: string) => /[A-Z]/.test(pw) },
  { key: 'lowercase', label: 'Lowercase letter (a–z)',        test: (pw: string) => /[a-z]/.test(pw) },
  { key: 'number',    label: 'Number (0–9)',                  test: (pw: string) => /[0-9]/.test(pw) },
  { key: 'special',   label: 'Special character (@#$% etc.)', test: (pw: string) => /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(pw) },
]

const isPasswordValid = (pw: string) => PASSWORD_RULES.every(r => r.test(pw))

// =============================================================================
// Sub-components
// =============================================================================
const PasswordStrengthBar = ({ password }: { password: string }) => {
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length
  const pct    = (passed / PASSWORD_RULES.length) * 100
  const color  = passed <= 2 ? 'danger' : passed <= 4 ? 'warning' : 'success'

  return (
    <div className='rounded-lg border border-default-200 bg-content2 px-3 py-2.5'>
      <Progress aria-label='Password strength' value={pct} color={color} size='sm' className='mb-2' />
      <div className='grid grid-cols-2 gap-x-3 gap-y-0.5'>
        {PASSWORD_RULES.map(r => {
          const ok = r.test(password)
          return (
            <div key={r.key} className='flex items-center gap-1.5'>
              <div className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${ok ? 'bg-success' : 'bg-default-300'}`} />
              <span className={`text-[10px] ${ok ? 'text-success' : 'text-default-400'}`}>{r.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const PasswordField = ({
  label, placeholder, value, onChange, show, onToggle, error,
}: {
  label: string; placeholder: string; value: string
  onChange: (v: string) => void; show: boolean; onToggle: () => void; error?: string
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
        <Icon icon={show ? 'lucide:eye-off' : 'lucide:eye'} className='h-4 w-4' />
      </button>
    }
    classNames={{ inputWrapper: 'bg-background border-default-200 data-[hover=true]:border-primary-300 group-data-[focus=true]:border-primary' }}
  />
)

// =============================================================================
// Main page
// =============================================================================
type AuthView = 'login' | 'register'

export default function LoginPage() {
  const router = useRouter()
  const {
    isAuthenticated, isLoading: authLoading,
    login, loginWithGoogle,
    startRegistration,
  } = useAuth()

  const [view,          setView]          = useState<AuthView>('login')
  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [confirmPw,     setConfirmPw]     = useState('')
  const [showPw,        setShowPw]        = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [errors,        setErrors]        = useState<{ email?: string; password?: string; confirmPw?: string }>({})
  const [submitting,    setSubmitting]    = useState(false)
  const [oauthModal,    setOauthModal]    = useState<{ provider: 'Google' | 'GitHub'; envVar: string } | null>(null)

  useEffect(() => {
    setPassword(''); setConfirmPw(''); setErrors({})
  }, [view])

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace('/')
  }, [isAuthenticated, authLoading, router])

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleLogin = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    const errs: typeof errors = {}
    if (!email)    errs.email    = 'Please enter your username or email'
    if (!password) errs.password = 'Please enter your password'
    if (Object.keys(errs).length) { setErrors(errs); return }
    try { setSubmitting(true); await login(email, password) }
    finally { setSubmitting(false) }
  }

  const handleGithubLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
    if (!clientId) { setOauthModal({ provider: 'GitHub', envVar: 'NEXT_PUBLIC_GITHUB_CLIENT_ID' }); return }
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email&redirect_uri=${window.location.origin}/auth/github/callback`
  }

  const googleLoginFlow = useGoogleLogin({
    onSuccess: async tokenResponse => {
      try {
        setSubmitting(true)
        const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        })
        await loginWithGoogle({ googleId: data.sub, email: data.email, firstName: data.given_name, lastName: data.family_name, photoUrl: data.picture })
      } catch { /* handled by context */ } finally { setSubmitting(false) }
    },
    onError: () => addToast({ title: 'Login Failed', description: 'Failed to login with Google', color: 'danger' }),
  })

  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) { setOauthModal({ provider: 'Google', envVar: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID' }); return }
    googleLoginFlow()
  }

  const handleRegister = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    const errs: typeof errors = {}
    if (!email)                     errs.email    = 'Please enter your email'
    if (!password)                  errs.password = 'Please enter your password'
    if (!isPasswordValid(password)) errs.password = 'Password does not meet requirements'
    if (password !== confirmPw)     errs.confirmPw = 'Passwords do not match'
    if (Object.keys(errs).length) { setErrors(errs); return }
    try { setSubmitting(true); await startRegistration(email, password) }
    finally { setSubmitting(false) }
  }

  const TITLES: Record<AuthView, string> = {
    'login':    'Welcome back',
    'register': 'Create account',
  }

  const SUBTITLES: Record<AuthView, string> = {
    'login':    'Sign in to your Qorstack Report account',
    'register': 'Get started — free to self-host',
  }

  if (authLoading) return <div className='flex min-h-screen items-center justify-center bg-background' />

  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-6'>

      <div className='absolute right-5 top-5'>
        <SwitchTheme />
      </div>

      <div className='mb-5 flex items-center gap-2.5'>
        <Image src='/images/logo/logo.png' alt='Qorstack Report' width={36} height={36} className='h-9 w-9 rounded-xl' />
        <span className='text-sm font-bold tracking-tight text-foreground'>Qorstack Report</span>
      </div>

      <div className='w-full max-w-[380px] rounded-2xl border border-default-200 bg-content1 p-6 shadow-sm'>

        <div className='mb-5'>
          <h1 className='mb-0.5 text-lg font-bold tracking-tight text-foreground'>{TITLES[view]}</h1>
          <p className='text-xs text-default-500'>{SUBTITLES[view]}</p>
        </div>

        {/* ── LOGIN ── */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className='flex flex-col gap-3'>
            <div className='grid grid-cols-2 gap-2'>
              <button type='button' onClick={handleGoogleLogin}
                className='flex items-center justify-center gap-2 rounded-xl border border-default-200 bg-content1 px-3 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-content2'>
                <Icon icon='flat-color-icons:google' className='h-4 w-4' />
                Google
              </button>
              <button type='button' onClick={handleGithubLogin}
                className='flex items-center justify-center gap-2 rounded-xl border border-default-200 bg-content1 px-3 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-content2'>
                <Icon icon='mdi:github' className='h-4 w-4' />
                GitHub
              </button>
            </div>

            <div className='flex items-center gap-3'>
              <div className='h-px flex-1 bg-default-200' />
              <span className='text-[11px] font-semibold uppercase tracking-wider text-default-400'>or</span>
              <div className='h-px flex-1 bg-default-200' />
            </div>

            <Input
              label='Username or Email' placeholder='admin or name@example.com'
              variant='bordered' labelPlacement='outside'
              value={email} onValueChange={v => { setEmail(v); setErrors(e => ({ ...e, email: undefined })) }}
              isInvalid={!!errors.email} errorMessage={errors.email}
              classNames={{ inputWrapper: 'bg-background border-default-200 data-[hover=true]:border-primary-300 group-data-[focus=true]:border-primary' }}
            />
            <PasswordField
              label='Password' placeholder='Enter your password'
              value={password} onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: undefined })) }}
              show={showPw} onToggle={() => setShowPw(v => !v)} error={errors.password}
            />

            <Button type='submit' color='primary' isLoading={submitting} isDisabled={submitting}
              className='w-full rounded-xl font-bold'>
              Sign in
            </Button>
            <p className='text-center text-sm text-default-500'>
              Don&apos;t have an account?{' '}
              <button type='button' onClick={() => setView('register')} className='font-bold text-primary hover:underline'>
                Register
              </button>
            </p>
          </form>
        )}

        {/* ── REGISTER ── */}
        {view === 'register' && (
          <form onSubmit={handleRegister} className='flex flex-col gap-3'>
            <Input
              label='Email' placeholder='name@example.com'
              variant='bordered' labelPlacement='outside'
              value={email} onValueChange={v => { setEmail(v); setErrors(e => ({ ...e, email: undefined })) }}
              isInvalid={!!errors.email} errorMessage={errors.email}
              classNames={{ inputWrapper: 'bg-background border-default-200 data-[hover=true]:border-primary-300 group-data-[focus=true]:border-primary' }}
            />
            <PasswordField
              label='Password' placeholder='Create a password'
              value={password} onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: undefined, confirmPw: v === confirmPw ? undefined : e.confirmPw })) }}
              show={showPw} onToggle={() => setShowPw(v => !v)} error={errors.password}
            />
            <PasswordField
              label='Confirm Password' placeholder='Re-enter your password'
              value={confirmPw} onChange={v => { setConfirmPw(v); setErrors(e => ({ ...e, confirmPw: v === password ? undefined : e.confirmPw })) }}
              show={showConfirmPw} onToggle={() => setShowConfirmPw(v => !v)} error={errors.confirmPw}
            />
            {password.length > 0 && <PasswordStrengthBar password={password} />}
            <Button type='submit' color='primary' isLoading={submitting} isDisabled={submitting}
              className='w-full rounded-xl font-bold'>
              Create Account
            </Button>
            <p className='text-center text-sm text-default-500'>
              Already have an account?{' '}
              <button type='button' onClick={() => setView('login')} className='font-bold text-primary hover:underline'>
                Sign in
              </button>
            </p>
          </form>
        )}

      </div>

      <Modal isOpen={!!oauthModal} onClose={() => setOauthModal(null)} placement='center' size='md'>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className='flex items-center gap-2'>
                <Icon icon='lucide:alert-triangle' className='h-5 w-5 text-warning' />
                {oauthModal?.provider} login is not configured
              </ModalHeader>
              <ModalBody>
                <p className='text-sm text-default-600'>
                  The environment variable for {oauthModal?.provider} OAuth is missing.
                  Please set the following variable in your <code className='rounded bg-default-100 px-1 py-0.5 text-xs font-mono'>.env</code> file
                  (or deployment environment) and restart the app.
                </p>
                <div className='mt-1 rounded-lg border border-default-200 bg-content2 px-3 py-2'>
                  <code className='text-xs font-mono text-foreground'>
                    {oauthModal?.envVar}=your_{oauthModal?.provider.toLowerCase()}_client_id
                  </code>
                </div>
                <p className='text-xs text-default-500'>
                  After updating the variable, restart the development server (or redeploy) for the change to take effect.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color='primary' onPress={onClose} className='font-semibold'>
                  Got it
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
