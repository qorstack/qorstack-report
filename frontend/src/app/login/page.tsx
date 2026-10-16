'use client'

import { useAppConfig } from '@/hooks/use-app-config'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Progress, addToast } from '@heroui/react'
import { useAuth } from '@/providers/AuthContext'
import Icon from '@/components/icon'
import { useGoogleLogin } from '@react-oauth/google'
import axios from 'axios'
import { Logo } from '@/components/brand/Logo'

// =============================================================================
// Password rules
// =============================================================================
const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
  { key: 'uppercase', label: 'Uppercase letter (A–Z)', test: (pw: string) => /[A-Z]/.test(pw) },
  { key: 'lowercase', label: 'Lowercase letter (a–z)', test: (pw: string) => /[a-z]/.test(pw) },
  { key: 'number', label: 'Number (0–9)', test: (pw: string) => /[0-9]/.test(pw) },
  {
    key: 'special',
    label: 'Special character (@#$% etc.)',
    test: (pw: string) => /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(pw)
  }
]

const isPasswordValid = (pw: string) => PASSWORD_RULES.every(r => r.test(pw))

// =============================================================================
// Sub-components
// =============================================================================
const INPUT_CLASSNAMES = {
  label: 'text-[13px] font-medium text-foreground',
  inputWrapper:
    'h-11 bg-content2 border-default-300 data-[hover=true]:border-default-500 group-data-[focus=true]:border-primary group-data-[focus=true]:shadow-[inset_3px_0_0_#F2271C]',
  input: 'text-[15px]',
  errorMessage: 'text-[12px]'
}

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <span className='flex items-center gap-1.5 text-danger'>
      <Icon icon='lucide:circle-alert' aria-hidden='true' className='h-3.5 w-3.5 shrink-0' />
      {message}
    </span>
  ) : null

const PasswordStrengthBar = ({ password }: { password: string }) => {
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length
  const pct = (passed / PASSWORD_RULES.length) * 100
  const color = passed <= 2 ? 'danger' : passed <= 4 ? 'warning' : 'success'

  return (
    <div className='border border-divider bg-content2 px-3 py-3'>
      <Progress aria-label='Password strength' value={pct} color={color} size='sm' radius='none' className='mb-2.5' />
      <ul className='grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2'>
        {PASSWORD_RULES.map(r => {
          const ok = r.test(password)
          return (
            <li key={r.key} className='flex items-center gap-1.5'>
              <Icon
                icon={ok ? 'lucide:check' : 'lucide:minus'}
                aria-hidden='true'
                className={`h-3.5 w-3.5 shrink-0 ${ok ? 'text-success' : 'text-default-500'}`}
              />
              <span className={`text-[12px] ${ok ? 'text-success' : 'text-default-500'}`}>
                {r.label}
                <span className='sr-only'>{ok ? ' — met' : ' — not met'}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const PasswordField = ({
  label,
  placeholder,
  value,
  onChange,
  show,
  onToggle,
  error,
  autoComplete
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  error?: string
  autoComplete?: string
}) => (
  <Input
    label={label}
    placeholder={placeholder}
    type={show ? 'text' : 'password'}
    variant='bordered'
    labelPlacement='outside'
    autoComplete={autoComplete}
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

/** Crop-marked "paper" visual — a document preview, light in both themes. */
const PaperPreview = () => (
  <div className='crop w-full max-w-[340px]' aria-hidden='true'>
    <span className='crop-cm' />
    <div className='bg-[#FFFFFF] p-6 text-[#141414] shadow-[0_24px_48px_-20px_rgba(20,20,20,.35)] ring-1 ring-[#E4E4E7] dark:shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)] dark:ring-0'>
      <div className='flex items-start justify-between border-b-2 border-[#141414] pb-3'>
        <div>
          <p className='text-[18px] font-extrabold uppercase leading-none [font-variation-settings:"wdth"_80]'>
            Invoice
          </p>
          <p className='mt-1 font-mono text-[11px] text-[#52525B]'>INV-2026-001</p>
        </div>
        <span className='border-2 border-[#F2271C] px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#F2271C]'>
          Paid
        </span>
      </div>
      <div className='mt-3 grid grid-cols-2 gap-2 text-[11px]'>
        <div>
          <p className='font-mono uppercase tracking-[0.1em] text-[#52525B]'>Bill to</p>
          <p className='mt-0.5 font-semibold'>ACME Co., Ltd.</p>
        </div>
        <div className='text-right'>
          <p className='font-mono uppercase tracking-[0.1em] text-[#52525B]'>Date</p>
          <p className='mt-0.5 font-semibold'>05 Oct 2026</p>
        </div>
      </div>
      <div className='mt-4 space-y-1.5 text-[11px]'>
        {[
          ['Design', '2,400.00'],
          ['Implementation', '5,200.00'],
          ['Hosting (12 mo)', '1,200.00']
        ].map(([item, total]) => (
          <div key={item} className='flex justify-between border-b border-[#E4E4E7] pb-1.5'>
            <span>{item}</span>
            <span className='font-mono'>{total}</span>
          </div>
        ))}
      </div>
      <div className='mt-3 flex items-end justify-between'>
        <div className='grid grid-cols-5 gap-[2px]'>
          {Array.from({ length: 25 }, (_, i) => (
            <span
              key={i}
              className={`h-2 w-2 ${[0, 1, 3, 5, 7, 8, 11, 12, 14, 16, 18, 20, 21, 23, 24].includes(i) ? 'bg-[#141414]' : ''}`}
            />
          ))}
        </div>
        <div className='text-right'>
          <p className='font-mono text-[11px] uppercase tracking-[0.1em] text-[#52525B]'>Total</p>
          <p className='text-[20px] font-extrabold leading-none'>8,800.00</p>
        </div>
      </div>
    </div>
  </div>
)

// =============================================================================
// Main page
// =============================================================================
type AuthView = 'login' | 'register'

export default function LoginPage() {
  const { githubClientId, googleClientId } = useAppConfig()
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, login, loginWithGoogle, startRegistration } = useAuth()

  const [view, setView] = useState<AuthView>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPw?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setPassword('')
    setConfirmPw('')
    setErrors({})
  }, [view])

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace('/')
  }, [isAuthenticated, authLoading, router])

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleLogin = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    const errs: typeof errors = {}
    if (!email) errs.email = 'Please enter your username or email'
    if (!password) errs.password = 'Please enter your password'
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    try {
      setSubmitting(true)
      await login(email, password)
    } finally {
      setSubmitting(false)
    }
  }

  // Each OAuth button is shown only when the server has a client id for it (GOOGLE_CLIENT_ID / GITHUB_CLIENT_ID).
  const hasOauth = Boolean(googleClientId || githubClientId)

  const handleGithubLogin = () => {
    const clientId = githubClientId
    if (!clientId) return
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email&redirect_uri=${window.location.origin}/auth/github/callback`
  }

  const googleLoginFlow = useGoogleLogin({
    onSuccess: async tokenResponse => {
      try {
        setSubmitting(true)
        const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        })
        await loginWithGoogle({
          googleId: data.sub,
          email: data.email,
          firstName: data.given_name,
          lastName: data.family_name,
          photoUrl: data.picture
        })
      } catch {
        /* handled by context */
      } finally {
        setSubmitting(false)
      }
    },
    onError: () => addToast({ title: 'Login Failed', description: 'Failed to login with Google', color: 'danger' })
  })

  const handleGoogleLogin = () => {
    if (!googleClientId) return
    googleLoginFlow()
  }

  const handleRegister = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    const errs: typeof errors = {}
    if (!email) errs.email = 'Please enter your email'
    if (!password) errs.password = 'Please enter your password'
    if (!isPasswordValid(password)) errs.password = 'Password does not meet requirements'
    if (password !== confirmPw) errs.confirmPw = 'Passwords do not match'
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    try {
      setSubmitting(true)
      await startRegistration(email, password)
    } finally {
      setSubmitting(false)
    }
  }

  const TITLES: Record<AuthView, string> = {
    login: 'Welcome back',
    register: 'Create account'
  }

  const SUBTITLES: Record<AuthView, string> = {
    login: 'Sign in to your Qorstack Report account',
    register: 'Get started — free to self-host'
  }

  if (authLoading) return <div className='flex min-h-screen items-center justify-center bg-background' />

  const oauthButtonClass =
    'flex h-11 items-center justify-center gap-2 border border-default-300 bg-transparent px-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-foreground'

  return (
    <div className='grid min-h-screen bg-background lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]'>
      {/* ── Left: brand panel ── */}
      <aside className='relative hidden flex-col justify-between overflow-hidden border-r border-divider bg-content1 p-10 lg:flex xl:p-14'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 bg-[linear-gradient(hsl(var(--heroui-divider))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--heroui-divider))_1px,transparent_1px)] bg-[size:64px_64px] opacity-40'
        />
        <div className='relative'>
          <Logo />
        </div>

        <div className='relative grid items-end gap-10 xl:grid-cols-[minmax(0,1fr)_auto]'>
          <div>
            <p className='press-label mb-5'>Self-hosted document API</p>
            <h2 className='press-display text-[clamp(2.25rem,0.75rem+2.6vw,3.5rem)] text-foreground'>
              <span className='whitespace-nowrap'>Templates in.</span>
              <br />
              <span className='whitespace-nowrap'>
                <span className='bg-primary px-[0.08em] text-primary-foreground'>PDF</span> &amp; Excel{' '}
                <span className='text-primary'>out.</span>
              </span>
            </h2>
            <p className='mt-6 max-w-md text-[17px] leading-relaxed text-default-500'>
              Upload a Word or Excel template, send JSON, get a PDF, DOCX or XLSX back — on your own servers.
            </p>
          </div>
          <PaperPreview />
        </div>

        <p className='relative font-mono text-[11px] uppercase tracking-[0.16em] text-default-500'>
          MIT core · Docker · Your data stays inside
        </p>
      </aside>

      {/* ── Right: form ── */}
      <main className='flex flex-col items-center justify-center px-4 py-10 sm:px-8'>
        <div className='mb-8 lg:hidden'>
          <Logo />
        </div>

        <div className='w-full max-w-[400px] border border-divider bg-content1 p-6 sm:p-8'>
          <div className='mb-6'>
            <p className='press-label mb-3'>{view === 'login' ? 'Sign in' : 'Register'}</p>
            <h1 className='press-display text-[32px] text-foreground'>{TITLES[view]}</h1>
            <p className='mt-2 text-[14px] text-default-500'>{SUBTITLES[view]}</p>
          </div>

          {/* ── LOGIN ── */}
          {view === 'login' && (
            <form onSubmit={handleLogin} noValidate className='flex flex-col gap-4'>
              {hasOauth && (
                <>
                  <div className={`grid gap-2 ${googleClientId && githubClientId ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {googleClientId && (
                      <button type='button' onClick={handleGoogleLogin} className={oauthButtonClass}>
                        <Icon icon='flat-color-icons:google' aria-hidden='true' className='h-4 w-4' />
                        Google
                      </button>
                    )}
                    {githubClientId && (
                      <button type='button' onClick={handleGithubLogin} className={oauthButtonClass}>
                        <Icon icon='mdi:github' aria-hidden='true' className='h-4 w-4' />
                        GitHub
                      </button>
                    )}
                  </div>

                  <div className='flex items-center gap-3' aria-hidden='true'>
                    <div className='h-px flex-1 bg-divider' />
                    <span className='font-mono text-[11px] uppercase tracking-[0.16em] text-default-500'>or</span>
                    <div className='h-px flex-1 bg-divider' />
                  </div>
                </>
              )}

              <Input
                label='Username or email'
                placeholder='Enter your username or email'
                variant='bordered'
                labelPlacement='outside'
                autoComplete='username'
                value={email}
                onValueChange={v => {
                  setEmail(v)
                  setErrors(e => ({ ...e, email: undefined }))
                }}
                isInvalid={!!errors.email}
                errorMessage={<FieldError message={errors.email} />}
                classNames={INPUT_CLASSNAMES}
              />
              <PasswordField
                label='Password'
                placeholder='Enter your password'
                autoComplete='current-password'
                value={password}
                onChange={v => {
                  setPassword(v)
                  setErrors(e => ({ ...e, password: undefined }))
                }}
                show={showPw}
                onToggle={() => setShowPw(v => !v)}
                error={errors.password}
              />

              <Button
                type='submit'
                color='primary'
                size='lg'
                isLoading={submitting}
                isDisabled={submitting}
                className='mt-1 w-full font-bold uppercase tracking-[0.04em]'>
                Sign in
              </Button>
              <p className='text-center text-[14px] text-default-500'>
                Don&apos;t have an account?{' '}
                <button
                  type='button'
                  onClick={() => setView('register')}
                  className='font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary'>
                  Register
                </button>
              </p>
            </form>
          )}

          {/* ── REGISTER ── */}
          {view === 'register' && (
            <form onSubmit={handleRegister} noValidate className='flex flex-col gap-4'>
              <Input
                label='Email'
                placeholder='name@example.com'
                variant='bordered'
                labelPlacement='outside'
                type='email'
                autoComplete='email'
                value={email}
                onValueChange={v => {
                  setEmail(v)
                  setErrors(e => ({ ...e, email: undefined }))
                }}
                isInvalid={!!errors.email}
                errorMessage={<FieldError message={errors.email} />}
                classNames={INPUT_CLASSNAMES}
              />
              <PasswordField
                label='Password'
                placeholder='Create a password'
                autoComplete='new-password'
                value={password}
                onChange={v => {
                  setPassword(v)
                  setErrors(e => ({ ...e, password: undefined, confirmPw: v === confirmPw ? undefined : e.confirmPw }))
                }}
                show={showPw}
                onToggle={() => setShowPw(v => !v)}
                error={errors.password}
              />
              <PasswordField
                label='Confirm password'
                placeholder='Re-enter your password'
                autoComplete='new-password'
                value={confirmPw}
                onChange={v => {
                  setConfirmPw(v)
                  setErrors(e => ({ ...e, confirmPw: v === password ? undefined : e.confirmPw }))
                }}
                show={showConfirmPw}
                onToggle={() => setShowConfirmPw(v => !v)}
                error={errors.confirmPw}
              />
              {password.length > 0 && <PasswordStrengthBar password={password} />}
              <Button
                type='submit'
                color='primary'
                size='lg'
                isLoading={submitting}
                isDisabled={submitting}
                className='mt-1 w-full font-bold uppercase tracking-[0.04em]'>
                Create account
              </Button>
              <p className='text-center text-[14px] text-default-500'>
                Already have an account?{' '}
                <button
                  type='button'
                  onClick={() => setView('login')}
                  className='font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary'>
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
