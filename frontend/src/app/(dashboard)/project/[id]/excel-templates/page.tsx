'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function ExcelTemplatesRedirect() {
  const router = useRouter()
  const params = useParams()
  useEffect(() => {
    router.replace(`/project/${params.id}/templates`)
  }, [params.id, router])
  return null
}
