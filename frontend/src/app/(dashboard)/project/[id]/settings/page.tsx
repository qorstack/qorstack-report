'use client'

import React, { useState, useEffect } from 'react'
import { PageHeader, PanelHeader } from '@/components/ui/PageHeader'
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@heroui/react'
import Icon from '@/components/icon'
import { useRouter } from 'next/navigation'
import { useRouteParams } from '@/hooks/use-route-params'
import { useProject } from '@/providers/ProjectContext'

export default function ProjectSettings() {
  const router = useRouter()
  const params = useRouteParams()
  const projectId = typeof params.id === 'string' ? params.id : null
  const { projects, updateProject, deleteProject } = useProject()
  // Always act on the project in the URL, never on whichever project happens to be "current".
  const currentProject = projects.find(p => p.id === projectId) ?? null

  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange } = useDisclosure()

  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name || '')
    }
  }, [currentProject])

  const handleUpdate = async () => {
    if (!projectId || !currentProject) return
    setLoading(true)
    try {
      await updateProject(projectId, { name: projectName, description: null })
    } catch (error: any) {
      console.error('Update failed', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!projectId || !currentProject) return
    setDeleteLoading(true)
    try {
      const deletedId = projectId
      await deleteProject(deletedId)
      const remaining = projects.filter(p => p.id !== deletedId)
      if (remaining.length > 0) {
        router.push(`/project/${remaining[0].id}`)
      } else {
        router.push('/create-project')
      }
    } catch (error: any) {
      console.error('Delete failed', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!currentProject) return null

  const isDirty = projectName.trim() !== (currentProject.name || '') && projectName.trim().length > 0

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-6'>
      <PageHeader
        breadcrumb={[
          { label: currentProject.name || 'Project', href: `/project/${currentProject.id}` },
          { label: 'Project settings' }
        ]}
        title='Project settings'
        description='Rename or delete this project. To move it to another deployment, use Export & import.'
      />

      <section className='border border-divider bg-content1'>
        <PanelHeader title='General' description='The name is shown in the sidebar and the project switcher.' />
        <div className='p-5'>
          <Input
            label='Project name'
            labelPlacement='outside'
            placeholder='e.g. Invoices'
            value={projectName}
            onValueChange={setProjectName}
            variant='bordered'
            classNames={{
              label: 'text-[13px] font-medium !text-default-500',
              inputWrapper: 'h-10 border-transparent bg-content2 data-[hover=true]:border-default-300 group-data-[focus=true]:border-foreground',
              input: 'text-[14px]'
            }}
          />
        </div>
        <div className='flex justify-end border-t border-divider px-5 py-4'>
          <Button
            color='primary'
            className='h-10 font-medium'
            isLoading={loading}
            isDisabled={!isDirty}
            onPress={handleUpdate}>
            Save changes
          </Button>
        </div>
      </section>

      <section className='border border-divider bg-content1'>
        <PanelHeader title='Danger zone' tone='danger' description='Actions here cannot be undone.' />
        <div className='flex flex-col items-start justify-between gap-4 p-5 md:flex-row md:items-center'>
          <div>
            <h3 className='text-[15px] font-semibold text-foreground'>Delete this project</h3>
            <p className='mt-1 max-w-lg text-[14px] text-default-500'>
              Permanently removes its templates, history and API key. This cannot be undone.
            </p>
          </div>
          <Button
            color='danger'
            variant='bordered'
            className='h-10 shrink-0 font-medium'
            startContent={<Icon icon='lucide:trash-2' className='h-4 w-4' />}
            onPress={onDeleteOpen}>
            Delete project
          </Button>
        </div>
      </section>

      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange} classNames={{ base: 'border border-divider bg-content1' }}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className='text-[16px] font-semibold'>Delete project?</ModalHeader>
              <ModalBody>
                <div className='flex items-start gap-3 border border-danger/40 p-3 text-[14px]'>
                  <Icon icon='lucide:alert-circle' className='mt-0.5 h-5 w-5 shrink-0 text-danger' />
                  <p className='text-default-500'>
                    <span className='font-semibold text-foreground'>{currentProject.name}</span> and all of its templates,
                    history and API key will be permanently removed. This cannot be undone.
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant='light' onPress={onClose} className='h-10 font-medium'>
                  Cancel
                </Button>
                <Button
                  color='danger'
                  variant='bordered'
                  onPress={handleDelete}
                  isLoading={deleteLoading}
                  className='h-10 font-medium'>
                  Yes, delete project
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
