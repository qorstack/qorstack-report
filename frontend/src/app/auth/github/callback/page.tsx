'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthContext'
import axios from 'axios'
import { Spinner } from '@heroui/react'

export default function GithubCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithGithub } = useAuth()
  const processedRef = useRef(false)

  useEffect(() => {
    const code = searchParams.get('code')

    if (code && !processedRef.current) {
      processedRef.current = true

      const handleGithubLogin = async () => {
        try {
          const response = await axios.post('/api/auth/github/exchange', { code })

          const { githubId, email, name, avatarUrl } = response.data

          await loginWithGithub({
            githubId,
            email,
            name,
            avatarUrl
          })
        } catch (error) {
          console.error('GitHub login error:', error)
          router.push('/')
        }
      }

      handleGithubLogin()
    } else if (!code) {
      router.push('/')
    }
  }, [searchParams, loginWithGithub, router])

  return (
    <div className='flex h-screen w-screen flex-col items-center justify-center gap-4'>
      <Spinner size='lg' color='primary' />
      <p className='text-default-500'>Authenticating with GitHub...</p>
    </div>
  )
}
