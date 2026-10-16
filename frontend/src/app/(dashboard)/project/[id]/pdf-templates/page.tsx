'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRouteParams } from '@/hooks/use-route-params'

import { Suspense } from 'react'

function PdfTemplatesRedirect() {
  const router = useRouter()
  const params = useRouteParams()
  useEffect(() => {
    router.replace(`/project/${params.id}/templates`)
  }, [params.id, router])
  return null
}

export default function PdfTemplatesRedirectPage() {
  return (
    <Suspense>
      <PdfTemplatesRedirect />
    </Suspense>
  )
}
