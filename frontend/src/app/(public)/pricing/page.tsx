'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PRICING_HREF } from '@/components/landing/constants'

export default function PricingRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace(PRICING_HREF)
  }, [router])

  return null
}
