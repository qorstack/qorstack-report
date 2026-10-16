'use client'

import { absoluteApiUrl } from '@/api/base-url'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouteParams } from '@/hooks/use-route-params'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { PageHeader, PanelHeader } from '@/components/ui/PageHeader'
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
import Link from 'next/link'

// Same origin as the web UI unless NEXT_PUBLIC_SERVICE says otherwise.
const API_BASE_URL = absoluteApiUrl()

// Smallest working request: the key stays a placeholder so the snippet never leaks it.
const CURL_EXAMPLE = `curl -X POST ${API_BASE_URL}/render/word/template \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "templateKey": "YOUR_TEMPLATE_KEY",
    "replace": [{ "key": "customer", "value": "Siam Tech Co., Ltd." }]
  }'`

export default function ProjectApiKeys() {
  const params = useRouteParams()
  const projectId = typeof params.id === 'string' ? params.id : null
  const { projects } = useProject()
  const currentProject = projects.find(p => p.id === projectId) ?? null
  const { user } = useAuth()
  const userId = user?.id
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  const [activeKey, setActiveKey] = useState<ApiKeyDto | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [showFullKey, setShowFullKey] = useState(false)
  const { copied, copy } = useCopyToClipboard()
  const { copied: curlCopied, copy: copyCurl } = useCopyToClipboard()
  const [loading, setLoading] = useState(true)
  const [regenerateLoading, setRegenerateLoading] = useState(false)
  // Each fetch gets a sequence number; only the latest one may write state (a slow response for the previous
  // project must not overwrite the current one).
  const fetchSeq = useRef(0)

  const fetchProjectKeys = useCallback(async () => {
    if (!userId || !projectId) return
    const seq = ++fetchSeq.current
    try {
      const keys = await api.users.apiKeysDetail(userId)
      if (seq !== fetchSeq.current) return
      const projectKeys = keys?.filter(k => k.projectId === projectId && k.isActive) || []
      projectKeys.sort(
        (a, b) => new Date(b.createdDatetime || 0).getTime() - new Date(a.createdDatetime || 0).getTime()
      )
      setActiveKey(projectKeys[0] ?? null)
    } catch (error) {
      console.error('Failed to fetch keys', error)
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [userId, projectId])

  useEffect(() => {
    // New project: drop the previous project's key before loading this one.
    setActiveKey(null)
    setApiKey('')
    setShowFullKey(false)
    setLoading(true)
    if (userId && projectId) {
      fetchProjectKeys()
    }
  }, [userId, projectId, fetchProjectKeys])

  const handleCopyKey = () => {
    const textToCopy = apiKey || activeKey?.xApiKey || ''
    if (!textToCopy) return
    void copy(textToCopy)
  }

  const handleRegenerateKey = async () => {
    if (!projectId) return
    setRegenerateLoading(true)
    try {
      const res = await api.projects.apiKeysCreate(projectId, {
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

  const keyValue = apiKey || activeKey?.xApiKey || ''
  const hasKey = Boolean(apiKey || activeKey)

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-6'>
      <PageHeader
        breadcrumb={[{ label: currentProject.name || 'Project', href: `/project/${currentProject.id}` }, { label: 'API key' }]}
        title='API key'
        description='Your app sends this key in the X-API-Key header to generate documents from this project.'
      />

      <section className='border border-divider bg-content1'>
        <PanelHeader title='Project key' description='One active key per project. Copy it into your server configuration.' />

        <div className='flex flex-col gap-5 p-5'>
          <div className='flex flex-col gap-2'>
            <label htmlFor='project-api-key' className='font-mono text-[13px] text-default-500'>
              X-API-Key
            </label>
            {loading ? (
              <div className='h-12 animate-pulse border border-divider bg-content2' />
            ) : hasKey ? (
              <div className='flex flex-col gap-2 sm:flex-row sm:items-stretch'>
                <div
                  id='project-api-key'
                  className='flex min-h-12 min-w-0 flex-1 items-center overflow-x-auto border border-default-300 bg-content2 px-4 font-mono text-[14px] text-foreground'>
                  <span className='whitespace-nowrap'>{showFullKey && keyValue ? keyValue : '•'.repeat(32)}</span>
                </div>
                <div className='flex gap-2'>
                  <Button
                    variant='bordered'
                    aria-label={showFullKey ? 'Hide API key' : 'Show API key'}
                    onPress={() => setShowFullKey(!showFullKey)}
                    className='h-12 flex-1 border-default-300 font-medium sm:flex-none'
                    startContent={<Icon icon={showFullKey ? 'lucide:eye-off' : 'lucide:eye'} className='h-4 w-4' />}>
                    {showFullKey ? 'Hide' : 'Show'}
                  </Button>
                  <Button
                    color='primary'
                    onPress={handleCopyKey}
                    aria-label='Copy API key'
                    className='h-12 flex-1 font-medium sm:flex-none'
                    startContent={<Icon icon={copied ? 'lucide:check' : 'lucide:copy'} className='h-4 w-4' />}>
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className='border border-dashed border-default-300 px-4 py-5 text-[14px] text-default-500'>
                This project has no active key yet. Generate one below.
              </div>
            )}
            <p className='text-[13px] text-default-500' aria-live='polite'>
              {apiKey ? 'New key generated. Copy it now and update your apps.' : 'Treat this key like a password.'}
            </p>
          </div>

          <div role='note' className='flex items-start gap-3'>
            <Icon icon='lucide:alert-triangle' className='mt-0.5 h-5 w-5 shrink-0 text-warning' />
            <div className='text-[14px]'>
              <p className='font-semibold text-foreground'>Keep this key secret</p>
              <p className='mt-1 text-default-500'>
                Use it only on your server. Never put it in a public repository, a website or a mobile app — anyone with
                the key can generate documents with your templates.
              </p>
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-3 border-t border-divider px-5 py-4 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-[13px] text-default-500'>
            {hasKey
              ? 'Regenerating creates a new key and the current key stops working immediately.'
              : 'Create the first key for this project.'}
          </p>
          <Button
            variant='bordered'
            color={hasKey ? 'danger' : 'default'}
            className={`h-10 shrink-0 font-medium ${hasKey ? '' : 'border-default-300'}`}
            startContent={<Icon icon='lucide:refresh-cw' className='h-4 w-4' />}
            onPress={onOpen}>
            {hasKey ? 'Regenerate key' : 'Generate key'}
          </Button>
        </div>
      </section>

      <section className='border border-divider bg-content1'>
        <PanelHeader
          title='Try it'
          description='Generate a PDF from your terminal. Replace YOUR_API_KEY and YOUR_TEMPLATE_KEY (copy it from Templates).'
          actions={
            <Button
              variant='bordered'
              className='h-10 border-default-300 font-medium'
              startContent={<Icon icon={curlCopied ? 'lucide:check' : 'lucide:copy'} className='h-4 w-4' />}
              onPress={() => void copyCurl(CURL_EXAMPLE)}>
              {curlCopied ? 'Copied' : 'Copy cURL'}
            </Button>
          }
        />
        <pre className='overflow-x-auto bg-[#0E0E0E] p-5 font-mono text-[13px] leading-relaxed text-[#EDEBE6]'>{CURL_EXAMPLE}</pre>
        <div className='flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-divider px-5 py-4 text-[14px]'>
          <span className='text-default-500'>The response has a downloadUrl to the generated file.</span>
          <Link href='/docs' className='ml-auto font-medium text-foreground underline-offset-4 hover:underline'>
            API docs & SDKs →
          </Link>
        </div>
      </section>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} classNames={{ base: 'border border-divider bg-content1' }}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className='text-[16px] font-semibold'>
                {hasKey ? 'Regenerate API key?' : 'Generate API key?'}
              </ModalHeader>
              <ModalBody>
                {hasKey ? (
                  <div className='flex items-start gap-3 border border-danger/40 p-3 text-[14px]'>
                    <Icon icon='lucide:alert-circle' className='mt-0.5 h-5 w-5 shrink-0 text-danger' />
                    <p className='text-default-500'>
                      The current key stops working <span className='font-semibold text-foreground'>immediately</span>. Every
                      app or script that uses it will get 401 errors until you replace it with the new key.
                    </p>
                  </div>
                ) : (
                  <p className='text-[14px] text-default-500'>A new key will be created for this project.</p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant='light' onPress={onClose} className='h-10 font-medium'>
                  Cancel
                </Button>
                <Button
                  color={hasKey ? 'danger' : 'primary'}
                  variant={hasKey ? 'bordered' : 'solid'}
                  onPress={handleRegenerateKey}
                  isLoading={regenerateLoading}
                  className='h-10 font-medium'>
                  {hasKey ? 'Yes, regenerate' : 'Generate key'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
