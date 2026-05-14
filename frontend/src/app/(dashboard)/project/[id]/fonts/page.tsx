'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Fonts are now global — redirect to the global fonts page.
export default function ProjectFontsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/fonts')
  }, [router])

  return null
}
