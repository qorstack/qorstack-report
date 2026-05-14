'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
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
    <div className='dashboard-page mx-auto w-full max-w-2xl pb-20 pt-4'>
      <div className='dashboard-panel'>
        <div className='dashboard-header'>
          <div>
            <div className='flex items-center gap-2 text-[11.5px] font-semibold text-default-500'>
              <span>Projects</span>
              <Icon icon='lucide:chevron-right' className='h-3 w-3' />
              <span className='text-foreground'>{currentProject.name}</span>
            </div>
            <h1 className='dashboard-title mt-2'>API Keys</h1>
            <p className='dashboard-subtitle mt-1'>Manage your project&apos;s API authentication key.</p>
          </div>
        </div>
      </div>

      <div className='dashboard-panel'>
        <div className='dashboard-header'>
          <div>
            <h3 className='font-label text-[10.5px] font-black uppercase tracking-[0.2em] text-default-600'>Active Key</h3>
            <p className='mt-0.5 text-[11.5px] text-default-500'>Use this key to authenticate your requests.</p>
          </div>
        </div>
          <div className='p-5 pt-0'>
            <div className='dashboard-soft p-5'>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <label className='font-label text-[9.5px] font-black uppercase tracking-[0.18em] text-default-500'>Your API Key</label>
                  <div className='flex items-center gap-2'>
                    <div className='ring-hairline relative flex-1 overflow-hidden text-ellipsis rounded-lg bg-content3 px-4 py-3 font-mono text-sm text-foreground'>
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

                <div className='flex items-start gap-3 rounded-lg border border-warning/20 bg-warning-50 p-3.5 dark:bg-warning-50/10'>
                  <Icon icon='lucide:alert-triangle' className='mt-0.5 h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400' />
                  <div className='text-[11.5px] text-warning-700 dark:text-warning-300'>
                    <p className='font-bold'>Keep your API key secure</p>
                    <p className='mt-1'>
                      {`Don't share your API key in public repositories or client-side code. Regenerating will invalidate
                      the current key immediately.`}
                    </p>
                  </div>
                </div>

                <div className='flex justify-end pt-1'>
                  <Button
                    variant='flat'
                    color='danger'
                    radius='md'
                    size='sm'
                    className='h-9 rounded-lg px-4 text-[12px] font-bold'
                    startContent={<Icon icon='lucide:refresh-cw' className='h-3.5 w-3.5' />}
                    onPress={onOpen}>
                    Regenerate Key
                  </Button>
                </div>
              </div>
            </div>
        </div>
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
