'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProject } from '@/providers/ProjectContext'

export default function ProjectIndexPage() {
  const router = useRouter()
  const { projects } = useProject()

  useEffect(() => {
    if (projects.length > 0 && projects[0].id) {
      router.replace(`/project/${projects[0].id}`)
    } else if (projects.length === 0) {
      router.replace('/create-project')
    }
  }, [projects, router])

  return null
}
