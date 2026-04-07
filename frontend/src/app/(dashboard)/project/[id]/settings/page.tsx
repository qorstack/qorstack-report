'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardBody,
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
  const { currentProject, updateProject, deleteProject } = useProject()

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
    } catch (error) {
      console.error('Update failed', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!currentProject?.id) return
    setDeleteLoading(true)
    try {
      await deleteProject(currentProject.id)
      router.push('/create-project')
    } catch (error) {
      console.error('Delete failed', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!currentProject) return <div>Loading...</div>

  return (
    <div className='space-y-8 pb-20 pt-8'>
      <div className='mx-auto max-w-2xl'>
        <div className='flex items-center gap-2 text-sm text-default-500'>
          <span>Projects</span>
          <Icon icon='lucide:chevron-right' className='h-3 w-3' />
          <span className='font-medium text-foreground'>{currentProject.name}</span>
        </div>
        <h1 className='mt-2 text-3xl font-bold tracking-tight text-foreground'>Settings</h1>
        <p className='mt-2 text-default-500'>Manage your project preferences and configurations.</p>
      </div>

      <div className='mx-auto max-w-2xl space-y-6'>
        <Card className='border border-default-100 shadow-sm'>
          <div className='border-b border-default-100 px-6 py-4'>
            <h3 className='font-semibold text-foreground'>General Information</h3>
            <p className='text-sm text-default-500'>Basic details about your project.</p>
          </div>
          <CardBody className='space-y-6 p-6'>
            <div className='grid gap-6 md:grid-cols-1'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-default-700'>Project Name</label>
                <Input value={projectName} onValueChange={setProjectName} variant='bordered' className='max-w-full' />
              </div>
            </div>
          </CardBody>
          <div className='border-t border-default-100 bg-content2 px-6 py-3 text-right'>
            <Button color='primary' size='sm' isLoading={loading} onPress={handleUpdate}>
              Save Changes
            </Button>
          </div>
        </Card>

        <Card className='border border-danger-100 shadow-sm'>
          <div className='border-b border-danger-100 bg-danger-50/30 px-6 py-4'>
            <h3 className='font-semibold text-danger'>Danger Zone</h3>
          </div>
          <CardBody className='flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center'>
            <div>
              <h4 className='text-sm font-bold text-foreground'>Delete Project</h4>
              <p className='max-w-lg text-sm text-default-500'>
                Deleting this project will permanently remove all associated templates, history, and API keys. This
                action cannot be undone.
              </p>
            </div>
            <Button color='danger' variant='flat' onPress={onDeleteOpen}>
              Delete Project
            </Button>
          </CardBody>
        </Card>
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
