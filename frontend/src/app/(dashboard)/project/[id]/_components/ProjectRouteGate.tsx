'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { Button, Spinner } from '@heroui/react'
import Icon from '@/components/icon'
import { useProject } from '@/providers/ProjectContext'
import { useRouteParams } from '@/hooks/use-route-params'

const StateMessage = ({ title, description, action }: { title: string; description: string; action: ReactNode }) => (
  <div className='mx-auto flex w-full max-w-lg flex-col items-start gap-3 border border-divider bg-content1 p-6' role='alert'>
    <Icon icon='lucide:folder-x' aria-hidden='true' className='h-6 w-6 text-default-500' />
    <h1 className='text-[18px] font-semibold text-foreground'>{title}</h1>
    <p className='text-[14px] text-default-500'>{description}</p>
    {action}
  </div>
)

/**
 * Every /project/{id}/* page renders the project from the URL. This gate resolves that id against the user's
 * projects, makes it the current project before any page renders, and shows "not found" for an unknown id —
 * so a stale link can never show (or delete) a different project.
 */
const ProjectRouteGate = ({ children }: { children: ReactNode }): ReactNode => {
  const params = useRouteParams()
  const urlId = typeof params.id === 'string' ? params.id : null
  const { projects, currentProject, setCurrentProject, hasFetched, fetchError, isLoading, fetchProjects } = useProject()

  const project = urlId ? projects.find(p => p.id === urlId) ?? null : null

  useEffect(() => {
    if (project && currentProject?.id !== project.id) setCurrentProject(project)
  }, [project, currentProject, setCurrentProject])

  if (fetchError && !hasFetched) {
    return (
      <StateMessage
        title='Could not load your projects'
        description='The server did not respond. Check that the API is running, then try again.'
        action={
          <Button
            variant='bordered'
            className='h-10 border-default-300 font-medium'
            isLoading={isLoading}
            startContent={<Icon icon='lucide:refresh-cw' className='h-4 w-4' />}
            onPress={() => void fetchProjects()}>
            Retry
          </Button>
        }
      />
    )
  }

  if (!hasFetched) {
    return (
      <div className='flex min-h-[40vh] items-center justify-center' role='status' aria-label='Loading project'>
        <Spinner color='primary' />
      </div>
    )
  }

  if (!project) {
    return (
      <StateMessage
        title='Project not found'
        description='This project does not exist or you no longer have access to it. It may have been deleted.'
        action={
          <Link href='/project' className='text-[14px] font-medium text-foreground underline-offset-4 hover:underline'>
            Go to your projects →
          </Link>
        }
      />
    )
  }

  // Wait one render for the context to switch, so pages never see the previous project.
  if (currentProject?.id !== project.id) return null

  return children
}

export default ProjectRouteGate
