'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthContext'
import { Spinner } from '@heroui/react'
import Icon from '@/components/icon'

export default function GithubCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithGithub } = useAuth()
  const processedRef = useRef(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')

    if (code && !processedRef.current) {
      processedRef.current = true

      const handleGithubLogin = async () => {
        try {
          await loginWithGithub(code)
        } catch (error) {
          console.error('GitHub login error:', error)
          setFailed(true)
        }
      }

      handleGithubLogin()
    } else if (!code && !searchParams.get('error')) {
      router.push('/')
    }
  }, [searchParams, loginWithGithub, router])

  // GitHub redirects back with ?error=access_denied (and no code) when the user cancels.
  const oauthError = !searchParams.get('code') && Boolean(searchParams.get('error'))

  if (failed || oauthError) {
    return (
      <main className='flex min-h-screen flex-col items-center justify-center bg-background px-4' role='alert'>
        <div className='flex w-full max-w-[400px] flex-col items-start gap-3 border border-divider bg-content1 p-6'>
          <Icon icon='mdi:github' aria-hidden='true' className='h-6 w-6 text-foreground' />
          <h1 className='text-[18px] font-semibold text-foreground'>GitHub sign-in failed</h1>
          <p className='text-[14px] text-default-500'>
            We could not sign you in with GitHub. The link may have expired, or GitHub sign-in is not set up correctly on
            this server. Please try again.
          </p>
          <Link
            href='/login'
            className='text-[14px] font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary'>
            Back to sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main
      className='flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-4'
      role='status'
      aria-live='polite'>
      <Spinner size='lg' color='primary' />
      <p className='font-mono text-[12px] uppercase tracking-[0.16em] text-default-500'>Authenticating with GitHub…</p>
    </main>
  )
}
