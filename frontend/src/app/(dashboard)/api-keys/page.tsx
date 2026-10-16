'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProject } from '@/providers/ProjectContext'

// API keys are managed per project — send users to the current project's API key page.
export default function ApiKeysRedirect() {
  const router = useRouter()
  const { currentProject, isLoading, hasFetched } = useProject()

  useEffect(() => {
    if (currentProject?.id) {
      router.replace(`/project/${currentProject.id}/api-keys`)
      return
    }
    if (hasFetched && !isLoading) router.replace('/project')
  }, [currentProject, hasFetched, isLoading, router])

  return null
}
