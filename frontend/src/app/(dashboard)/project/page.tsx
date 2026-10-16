'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Spinner } from '@heroui/react'
import Icon from '@/components/icon'
import { useProject } from '@/providers/ProjectContext'

export default function ProjectIndexPage() {
  const router = useRouter()
  const { projects, isLoading, hasFetched, fetchError, fetchProjects } = useProject()

  useEffect(() => {
    if (isLoading || !hasFetched || fetchError) return
    if (projects.length > 0 && projects[0].id) {
      router.replace(`/project/${projects[0].id}`)
    } else {
      router.replace('/create-project')
    }
  }, [projects, isLoading, hasFetched, fetchError, router])

  if (fetchError) {
    return (
      <div className='mx-auto flex w-full max-w-lg flex-col items-start gap-3 border border-divider bg-content1 p-6' role='alert'>
        <Icon icon='lucide:cloud-off' aria-hidden='true' className='h-6 w-6 text-default-500' />
        <h1 className='text-[18px] font-semibold text-foreground'>Could not load your projects</h1>
        <p className='text-[14px] text-default-500'>
          The server did not respond. Check that the API is running, then try again.
        </p>
        <Button
          variant='bordered'
          className='h-10 border-default-300 font-medium'
          isLoading={isLoading}
          startContent={<Icon icon='lucide:refresh-cw' className='h-4 w-4' />}
          onPress={() => void fetchProjects()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className='flex min-h-[40vh] items-center justify-center' role='status' aria-label='Loading projects'>
      <Spinner color='primary' />
    </div>
  )
}
