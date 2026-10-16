'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@heroui/react'
import Icon from '@/components/icon'
import { useProject } from '@/providers/ProjectContext'
import { api } from '@/api/generated/main-service'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { absoluteApiUrl } from '@/api/base-url'

const HOW_IT_WORKS = [
  { icon: 'lucide:folder', label: 'Create a project — it holds templates, the API key and history' },
  { icon: 'lucide:file-text', label: 'Upload a Word or Excel template with {{placeholders}}' },
  { icon: 'lucide:key', label: 'Copy the project API key into your app' },
  { icon: 'lucide:send', label: 'Generate: POST JSON → PDF / DOCX (Word) or XLSX (Excel)' }
]

export default function CreateProjectPage() {
  const router = useRouter()
  const { createProject, projects } = useProject()
  const isFirstProject = projects.length === 0

  const [loading, setLoading] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [generatedApiKey, setGeneratedApiKey] = useState('')
  const { copied, copy } = useCopyToClipboard()
  const [projectId, setProjectId] = useState<string>('')

  const handleCreate = async () => {
    if (!projectName.trim()) return
    setLoading(true)
    try {
      const newProject = await createProject({ name: projectName, description: null })
      if (newProject && newProject.id) {
        setProjectId(newProject.id)
        const response = await api.projects.apiKeysCreate(newProject.id, { name: 'Default Key' })
        if (response && response.apiKey) {
          setGeneratedApiKey(response.apiKey)
          setShowApiKey(true)
        } else {
          router.push(`/project/${newProject.id}`)
        }
      }
    } catch (error) {
      console.error('Failed to create project', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyKey = () => void copy(generatedApiKey)

  const codeLines = [
    { prefix: '$', text: `curl -X POST ${absoluteApiUrl()}/render/word/template \\` },
    { prefix: ' ', text: '  -H "X-API-Key: ' + (generatedApiKey || 'YOUR_API_KEY') + '" \\' },
    { prefix: ' ', text: '  -H "Content-Type: application/json" \\' },
    {
      prefix: ' ',
      text: `  -d '{"templateKey":"tpl_xxx","replace":[{"key":"customer","value":"ACME"}]}'`
    }
  ]

  const stepClass = (active: boolean): string =>
    `text-[13px] font-medium transition-colors ${active ? 'text-foreground' : 'text-default-500'}`

  return (
    <div className='flex min-h-full flex-col lg:flex-row'>
      {/* ── Left: Form ── */}
      <div className='flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8 lg:px-16'>
        <div className='w-full max-w-md'>
          {/* Step indicator */}
          <ol aria-label='Setup progress' className='mb-12 flex items-center gap-3'>
            <li className={stepClass(!showApiKey)} aria-current={!showApiKey ? 'step' : undefined}>
              1. Create
            </li>
            <li
              aria-hidden='true'
              className={`h-px flex-1 transition-colors ${showApiKey ? 'bg-default-400' : 'bg-divider'}`}
            />
            <li className={stepClass(showApiKey)} aria-current={showApiKey ? 'step' : undefined}>
              2. API key
            </li>
          </ol>

          {showApiKey ? (
            /* ── Step 2: API Key ── */
            <div className='space-y-8'>
              <div>
                <p className='mb-2 flex items-center gap-1.5 text-[13px] font-medium text-default-500'>
                  <Icon icon='lucide:check' aria-hidden='true' className='h-3.5 w-3.5 text-success' />
                  Project created
                </p>
                <h1 className='text-[26px] font-extrabold uppercase leading-tight tracking-[-0.01em] text-foreground [font-variation-settings:"wdth"_72] sm:text-[28px]'>
                  {isFirstProject ? 'Your workspace is live' : 'Project is live'}
                </h1>
                <p className='mt-2 text-[14px] text-default-500'>Copy the API key below before continuing.</p>
              </div>

              {/* Key block */}
              <div>
                <div className='border border-divider bg-content2'>
                  <div className='flex items-center justify-between border-b border-divider bg-content1 py-1.5 pl-4 pr-1.5'>
                    <span className='text-[13px] text-default-500'>API key</span>
                    <button
                      type='button'
                      onClick={handleCopyKey}
                      aria-label={copied ? 'API key copied' : 'Copy API key'}
                      className='inline-flex h-8 items-center gap-1.5 px-2.5 text-[13px] font-medium text-default-500 transition-colors hover:bg-content2 hover:text-foreground'>
                      <Icon
                        icon={copied ? 'lucide:check' : 'lucide:copy'}
                        aria-hidden='true'
                        className={`h-3.5 w-3.5 ${copied ? 'text-success' : ''}`}
                      />
                      <span className={copied ? 'text-success' : ''}>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className='select-all break-all px-4 py-4 font-mono text-[13px] leading-relaxed text-foreground'>
                    {generatedApiKey}
                  </p>
                </div>
              </div>

              {/* Warning */}
              <div
                role='note'
                className='flex items-start gap-3'>
                <Icon
                  icon='lucide:triangle-alert'
                  aria-hidden='true'
                  className='mt-0.5 h-4 w-4 shrink-0 text-warning'
                />
                <p className='text-[14px] leading-relaxed text-default-500'>
                  <span className='font-semibold text-foreground'>Keep this key secret.</span> Store it in a password
                  manager or as an environment variable. You can view, copy or regenerate it later on the project&apos;s
                  API key page.
                </p>
              </div>

              <Button
                size='lg'
                color='primary'
                className='w-full font-medium'
                onPress={() => router.push(`/project/${projectId}`)}
                endContent={<Icon icon='lucide:arrow-right' aria-hidden='true' className='h-4 w-4' />}>
                Open dashboard
              </Button>
            </div>
          ) : (
            /* ── Step 1: Name ── */
            <div className='space-y-8'>
              <div>
                <p className='mb-2 text-[13px] font-medium text-default-500'>{isFirstProject ? 'Getting started' : 'New project'}</p>
                <h1 className='text-[26px] font-extrabold uppercase leading-tight tracking-[-0.01em] text-foreground [font-variation-settings:"wdth"_72] sm:text-[28px]'>
                  {isFirstProject ? 'Your first project' : 'Name your project'}
                </h1>
                <p className='mt-2 text-[14px] text-default-500'>
                  {isFirstProject
                    ? 'Project → Template → API key → Generate. A project holds your Word and Excel templates, its API key and the generation history.'
                    : 'Groups your templates, API keys, and generation history.'}
                </p>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault()
                  handleCreate()
                }}
                className='space-y-4'>
                <Input
                  size='lg'
                  variant='bordered'
                  label='Project name'
                  labelPlacement='outside'
                  placeholder='e.g. Invoice Service'
                  value={projectName}
                  onValueChange={setProjectName}
                  autoFocus
                  classNames={{
                    label: 'text-[13px] font-medium text-foreground',
                    inputWrapper:
                      'bg-content2 border-default-300 data-[hover=true]:border-default-500 group-data-[focus=true]:border-foreground'
                  }}
                />

                <Button
                  size='lg'
                  color='primary'
                  className='w-full font-medium'
                  isLoading={loading}
                  onPress={handleCreate}
                  isDisabled={!projectName.trim()}
                  endContent={<Icon icon='lucide:arrow-right' aria-hidden='true' className='h-4 w-4' />}>
                  Continue
                </Button>

                <button
                  type='button'
                  className='w-full py-2 text-[14px] font-medium text-default-500 transition-colors hover:text-foreground'
                  onClick={() => (isFirstProject ? router.push('/') : router.push(`/project/${projects[0].id}`))}>
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Info / Code ── */}
      {/* The first-call snippet (step 2) shows on every screen size; the step-1 explainer only on large screens. */}
      <aside
        className={`${showApiKey ? 'flex' : 'hidden'} w-full shrink-0 flex-col justify-center border-t border-divider bg-content1 px-4 py-12 sm:px-8 lg:flex lg:w-[460px] lg:border-l lg:border-t-0 lg:px-10`}>
        {showApiKey ? (
          /* Step 2 right: first API call */
          <div>
            <p className='mb-2 text-[13px] font-medium text-default-500'>Quick start</p>
            <h2 className='mb-6 text-[20px] font-semibold text-foreground'>Make your first API call</h2>

            <div>
              <div className='border border-divider bg-[#0E0E0E]'>
                <div className='flex items-center justify-between border-b border-white/10 bg-[#161616] px-4 py-2'>
                  <span className='text-[13px] text-[#A9A59F]'>Terminal</span>
                  <span className='font-mono text-[12px] text-[#A9A59F]'>POST</span>
                </div>
                <div className='overflow-x-auto p-4 font-mono text-[12px] leading-[1.75]'>
                  {codeLines.map((line, i) => (
                    <div key={i} className='flex gap-2'>
                      <span aria-hidden='true' className='select-none text-[#8C8882]'>
                        {line.prefix}
                      </span>
                      <span className='whitespace-pre-wrap break-all text-[#EDEBE6]'>{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className='mt-6 flex items-start gap-3'>
              <Icon icon='lucide:lightbulb' aria-hidden='true' className='mt-0.5 h-4 w-4 shrink-0 text-default-500' />
              <p className='text-[14px] leading-relaxed text-default-500'>
                Replace{' '}
                <code className='bg-content2 px-1 py-0.5 font-mono text-[13px] text-foreground'>
                  tpl_xxx
                </code>{' '}
                with your template key after uploading a template from the dashboard.
              </p>
            </div>
          </div>
        ) : (
          /* Step 1 right: how it works */
          <div>
            <p className='mb-2 text-[13px] font-medium text-default-500'>How it works</p>
            <h2 className='mb-3 text-[20px] font-semibold text-foreground'>From template to document</h2>
            <p className='mb-8 text-[14px] leading-relaxed text-default-500'>
              Qorstack Report fills your Word or Excel template with JSON data and returns the finished document through a REST API.
            </p>

            <ol className='divide-y divide-divider border-y border-divider'>
              {HOW_IT_WORKS.map((item, i) => (
                <li key={item.label} className='flex items-center gap-4 py-3.5'>
                  <span className='font-mono text-[12px] text-default-500'>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Icon icon={item.icon} aria-hidden='true' className='h-4 w-4 shrink-0 text-default-500' />
                  <p className='text-[14px] text-foreground'>{item.label}</p>
                </li>
              ))}
            </ol>

            <p className='mt-8 flex items-center gap-2 text-[13px] text-default-500'>
              <Icon icon='lucide:zap' aria-hidden='true' className='h-4 w-4' />
              Self-hosted · Unlimited generations
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
