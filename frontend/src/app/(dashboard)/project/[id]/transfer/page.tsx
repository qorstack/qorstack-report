'use client'

import React from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useRouteParams } from '@/hooks/use-route-params'
import { useProject } from '@/providers/ProjectContext'
import { ProjectTransferPanel } from '@/components/projects/ProjectTransferPanel'

/** Export & import (Pro): its own page in the sidebar, apart from Project settings. */
const ProjectTransferPage = (): React.JSX.Element | null => {
  const params = useRouteParams()
  const projectId = typeof params.id === 'string' ? params.id : null
  const { projects } = useProject()
  // Always act on the project in the URL, never on whichever project happens to be "current".
  const project = projects.find(p => p.id === projectId) ?? null
  if (!project) return null

  return (
    <div className='mx-auto flex w-full max-w-4xl flex-col gap-6'>
      <PageHeader
        breadcrumb={[{ label: project.name || 'Project', href: `/project/${project.id}` }, { label: 'Export & import' }]}
        title='Export & import'
        description='Move this project to another Qorstack deployment, e.g. from staging to production. You see every difference before an import is saved.'
      />
      <ProjectTransferPanel projectId={project.id} projectName={project.name || 'project'} showHeader={false} />
    </div>
  )
}

export default ProjectTransferPage
