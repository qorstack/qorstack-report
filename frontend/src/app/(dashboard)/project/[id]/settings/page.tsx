'use client'

import React, { useState, useEffect } from 'react'
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
import { useProject } from '@/providers/ProjectContext'

export default function ProjectSettings() {
  const router = useRouter()
  const { currentProject, projects, updateProject, deleteProject } = useProject()

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
    if (!currentProject?.id) return
    setLoading(true)
    try {
      await updateProject(currentProject.id, { name: projectName, description: null })
    } catch (error: any) {
      console.error('Update failed', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!currentProject?.id) return
    setDeleteLoading(true)
    try {
      const deletedId = currentProject.id
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

  return (
    <div className='dashboard-page mx-auto w-full max-w-2xl pb-20 pt-4'>
      <div className='dashboard-panel'>
        <div className='dashboard-header'>
          <div>
            <div className='mb-1 flex items-center gap-2 text-[11.5px] text-default-500'>
              <span>Projects</span>
              <Icon icon='lucide:chevron-right' className='h-3 w-3' />
              <span className='font-medium text-foreground'>{currentProject.name}</span>
            </div>
            <h1 className='dashboard-title'>Settings</h1>
            <p className='dashboard-subtitle'>Manage your project preferences and configurations.</p>
          </div>
        </div>
      </div>

      <div className='space-y-5'>
        {/* General */}
        <div className='dashboard-panel'>
          <div className='dashboard-header'>
            <h3 className='text-[13px] font-bold text-foreground'>General Information</h3>
            <p className='mt-0.5 text-[11.5px] text-default-500'>Basic details about your project.</p>
          </div>
          <div className='p-6'>
            <div className='space-y-2'>
              <label className='label-mono text-default-500'>Project Name</label>
              <Input
                value={projectName}
                onValueChange={setProjectName}
                variant='bordered'
                size='sm'
                className='max-w-full'
              />
            </div>
          </div>
          <div className='border-t border-default-200/70 bg-content2/50 px-6 py-3 text-right dark:border-white/10'>
            <Button
              color='primary'
              size='sm'
              radius='md'
              className='h-8 px-4 text-[11.5px] font-bold'
              isLoading={loading}
              onPress={handleUpdate}>
              Save Changes
            </Button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className='overflow-hidden rounded-2xl bg-content1 ring-1 ring-danger/25'>
          <div className='border-b border-danger/15 bg-danger/5 px-6 py-4'>
            <h3 className='text-[13px] font-bold text-danger'>Danger Zone</h3>
          </div>
          <div className='flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center'>
            <div>
              <h4 className='text-[13px] font-bold text-foreground'>Delete Project</h4>
              <p className='mt-1 max-w-lg text-[11.5px] text-default-500'>
                Deleting this project will permanently remove all associated templates, history, and API keys. This
                action cannot be undone.
              </p>
            </div>
            <Button
              color='danger'
              variant='flat'
              size='sm'
              radius='md'
              className='h-8 shrink-0 px-4 text-[11.5px] font-bold'
              onPress={onDeleteOpen}>
              Delete Project
            </Button>
          </div>
        </div>
      </div>

      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className='flex flex-col gap-1'>Delete Project</ModalHeader>
              <ModalBody>
                <p className='text-sm text-default-500'>
                  Are you sure you want to delete <strong>{currentProject.name}</strong>? This action cannot be undone.
                  All templates and data associated with this project will be permanently removed.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color='default' variant='light' onPress={onClose}>
                  Cancel
                </Button>
                <Button color='danger' onPress={handleDelete} isLoading={deleteLoading}>
                  Yes, Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
