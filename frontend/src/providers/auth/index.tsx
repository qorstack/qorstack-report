'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import { useAuth } from '@/providers/AuthContext'

type Props = {
  children: React.ReactNode
}

const AuthGuard = (props: Props) => {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [router, isAuthenticated, isLoading])

  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{props.children}</>
}

export default AuthGuard
