'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardBody,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@heroui/react'
import Icon from '@/components/icon'
import { useProject } from '@/providers/ProjectContext'
import { useAuth } from '@/providers/AuthContext'
import { api } from '@/api/generated/main-service'
import { ApiKeyDto } from '@/api/generated/main-service/apiGenerated'

export default function ProjectApiKeys() {
  const { currentProject } = useProject()
  const { user } = useAuth()
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  const [activeKey, setActiveKey] = useState<ApiKeyDto | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [showFullKey, setShowFullKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [regenerateLoading, setRegenerateLoading] = useState(false)

  const fetchProjectKeys = useCallback(async () => {
    if (!user?.id || !currentProject?.id) return
    try {
      const keys = await api.users.apiKeysDetail(user.id)
      const projectKeys = keys?.filter(k => k.projectId === currentProject.id && k.isActive) || []
      projectKeys.sort(
        (a, b) => new Date(b.createdDatetime || 0).getTime() - new Date(a.createdDatetime || 0).getTime()
      )

      if (projectKeys.length > 0) {
        setActiveKey(projectKeys[0])
      }
    } catch (error) {
      console.error('Failed to fetch keys', error)
    } finally {
      setLoading(false)
    }
  }, [user, currentProject])

  useEffect(() => {
    if (user?.id && currentProject?.id) {
      fetchProjectKeys()
    }
  }, [user, currentProject, fetchProjectKeys])

  const handleCopyKey = () => {
    const textToCopy = apiKey || activeKey?.xApiKey || ''
    if (!textToCopy) return

    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerateKey = async () => {
    if (!currentProject?.id) return
    setRegenerateLoading(true)
    try {
      const res = await api.projects.apiKeysCreate(currentProject.id, {
        name: 'Project Key'
      })
      if (res && res.apiKey) {
        setApiKey(res.apiKey)
        setShowFullKey(true)
        await fetchProjectKeys()
        onOpenChange()
      }
    } catch (error) {
      console.error('Regenerate key failed', error)
    } finally {
      setRegenerateLoading(false)
    }
  }

  if (!currentProject) return null

  return (
    <div className='space-y-8 pb-20 pt-8'>
      <div className='mx-auto max-w-2xl'>
        <div className='flex items-center gap-2 text-sm text-default-500'>
          <span>Projects</span>
          <Icon icon='lucide:chevron-right' className='h-3 w-3' />
          <span className='font-medium text-foreground'>{currentProject.name}</span>
        </div>
        <h1 className='mt-2 text-3xl font-bold tracking-tight text-foreground'>API Keys</h1>
        <p className='mt-2 text-default-500'>Manage your project&apos;s API authentication key.</p>
      </div>

      <div className='mx-auto max-w-2xl space-y-6'>
        <Card className='border border-default-100 shadow-sm'>
          <div className='border-b border-default-100 px-6 py-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-semibold text-foreground'>Active Key</h3>
                <p className='text-sm text-default-500'>Use this key to authenticate your requests.</p>
              </div>
            </div>
          </div>
          <CardBody className='p-6'>
            <div className='rounded-lg border border-default-200 bg-content2 p-6'>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <label className='text-xs font-medium uppercase tracking-wider text-default-500'>Your API Key</label>
                  <div className='flex items-center gap-3'>
                    <div className='relative flex-1 overflow-hidden text-ellipsis rounded-md border border-default-300 bg-background px-4 py-3 font-mono text-sm text-foreground'>
                      {apiKey && showFullKey ? apiKey : '••••••••••••••••••••••••••••'}
                    </div>
                    {(apiKey || activeKey) && (
                      <div className='flex gap-1'>
                        {apiKey && (
                          <Button
                            isIconOnly
                            size='sm'
                            variant='light'
                            onPress={() => setShowFullKey(!showFullKey)}
                            className='text-default-500'>
                            <Icon icon={showFullKey ? 'lucide:eye-off' : 'lucide:eye'} className='h-4 w-4' />
                          </Button>
                        )}
                        <Button isIconOnly color='primary' size='sm' onPress={handleCopyKey} className='shrink-0'>
                          <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} className='h-4 w-4' />
                        </Button>
                      </div>
                    )}
                  </div>
                  {!apiKey && activeKey && (
                    <p className='text-xs text-default-400'>Key is hidden. Regenerate to see a new one.</p>
                  )}
                </div>

                <div className='flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4'>
                  <Icon icon='lucide:alert-triangle' className='mt-0.5 h-5 w-5 shrink-0 text-amber-600' />
                  <div className='text-xs text-amber-800'>
                    <p className='font-semibold'>Keep your API key secure</p>
                    <p className='mt-1'>
                      {`Don't share your API key in public repositories or client-side code. Regenerating will invalidate
                      the current key immediately.`}
                    </p>
                  </div>
                </div>

                <div className='flex justify-end border-t border-default-200 pt-4'>
                  <Button
                    variant='flat'
                    color='danger'
                    startContent={<Icon icon='lucide:refresh-cw' className='h-4 w-4' />}
                    onPress={onOpen}>
                    Regenerate Key
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className='flex flex-col gap-1'>Regenerate API Key?</ModalHeader>
              <ModalBody>
                <p className='text-sm text-default-500'>
                  Are you sure you want to regenerate your API key? The old key will stop working immediately, and you
                  will need to update any applications using it.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color='default' variant='light' onPress={onClose}>
                  Cancel
                </Button>
                <Button color='danger' onPress={handleRegenerateKey} isLoading={regenerateLoading}>
                  Yes, Regenerate
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
