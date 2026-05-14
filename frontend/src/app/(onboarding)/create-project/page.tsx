'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@heroui/react'
import Icon from '@/components/icon'
import { useProject } from '@/providers/ProjectContext'
import { api } from '@/api/generated/main-service'

const HOW_IT_WORKS = [
  { icon: 'lucide:key', label: 'Create a project and get your API key' },
  { icon: 'lucide:file-text', label: 'Upload or design a PDF template' },
  { icon: 'lucide:send', label: 'POST JSON data to the render endpoint' },
  { icon: 'lucide:file-check', label: 'Receive a generated PDF instantly' }
]

export default function CreateProjectPage() {
  const router = useRouter()
  const { createProject, projects } = useProject()
  const isFirstProject = projects.length === 0

  const [loading, setLoading] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [generatedApiKey, setGeneratedApiKey] = useState('')
  const [copied, setCopied] = useState(false)
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

  const handleCopyKey = () => {
    navigator.clipboard.writeText(generatedApiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const codeLines = [
    { prefix: '$', text: 'curl -X POST {BASE_URL}/api/render/template-pdf \\' },
    { prefix: ' ', text: '  -H "X-API-Key: ' + (generatedApiKey || 'YOUR_API_KEY') + '" \\' },
    { prefix: ' ', text: '  -H "Content-Type: application/json" \\' },
    { prefix: ' ', text: "  -d '{\"templateKey\":\"tpl_xxx\",\"replace\":{\"name\":\"John\"}}'" }
  ]

  return (
    <div className='flex h-full flex-col lg:flex-row'>
      {/* ── Left: Form ── */}
      <div className='flex flex-1 flex-col items-center justify-center px-8 py-12 lg:px-16'>
        <div className='w-full max-w-sm'>

          {/* Step indicator */}
          <div className='mb-12 flex items-center gap-3'>
            <span className={`font-label text-[10px] font-bold uppercase tracking-widest transition-colors ${!showApiKey ? 'text-primary' : 'text-default-300'}`}>
              01 — Create
            </span>
            <div className={`h-px flex-1 transition-colors ${showApiKey ? 'bg-primary/50' : 'bg-default-200'}`} />
            <span className={`font-label text-[10px] font-bold uppercase tracking-widest transition-colors ${showApiKey ? 'text-primary' : 'text-default-400'}`}>
              02 — API Key
            </span>
          </div>

          {showApiKey ? (
            /* ── Step 2: API Key ── */
            <div className='space-y-7'>
              <div>
                <p className='mb-2 font-mono text-[11px] font-bold text-success'>✓ project.created</p>
                <h1 className='font-headline text-[26px] font-bold leading-tight tracking-tight text-foreground'>
                  {isFirstProject ? 'Your workspace is live.' : 'Project is live.'}
                </h1>
                <p className='mt-2 text-sm text-default-500'>
                  Copy the API key below before continuing.
                </p>
              </div>

              {/* Key block */}
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='font-label text-[10px] font-bold uppercase tracking-widest text-default-400'>
                    API Key
                  </span>
                  <button
                    onClick={handleCopyKey}
                    className={`flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-semibold transition-all ${
                      copied
                        ? 'text-success-600 dark:text-success-400'
                        : 'text-default-500 hover:bg-default-100 hover:text-default-700'
                    }`}>
                    <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} className='h-3.5 w-3.5' />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className='overflow-hidden rounded-md bg-default-100 dark:bg-default-100/40'>
                  <p className='break-all px-4 py-3.5 font-mono text-[12px] leading-loose text-default-600 dark:text-default-300 select-all'>
                    {generatedApiKey}
                  </p>
                </div>
              </div>

              {/* Warning */}
              <p className='text-xs leading-relaxed text-default-400'>
                <span className='font-semibold text-amber-600 dark:text-amber-400'>Not retrievable after this page.</span>
                {' '}Store it in a password manager or as an environment variable.
              </p>

              <Button
                size='lg'
                color='primary'
                className='w-full rounded-sm font-semibold'
                onPress={() => router.push(`/project/${projectId}`)}>
                Open Dashboard
                <Icon icon='lucide:arrow-right' className='h-4 w-4' />
              </Button>
            </div>
          ) : (
            /* ── Step 1: Name ── */
            <div className='space-y-7'>
              <div>
                <p className='mb-3 font-label text-[10px] font-bold uppercase tracking-widest text-default-400'>
                  {isFirstProject ? 'Getting started' : 'New project'}
                </p>
                <h1 className='font-headline text-[28px] font-bold leading-tight tracking-tight text-foreground'>
                  {isFirstProject ? 'Your first project.' : 'Name your project.'}
                </h1>
                <p className='mt-2 text-sm text-default-500'>
                  {isFirstProject
                    ? 'Projects hold your PDF templates, API keys, and generation history.'
                    : 'Groups your templates, API keys, and generation history.'}
                </p>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault()
                  handleCreate()
                }}
                className='space-y-3'>
                <Input
                  size='lg'
                  variant='flat'
                  label='Project name'
                  placeholder='e.g. Invoice Service'
                  value={projectName}
                  onValueChange={setProjectName}
                  autoFocus
                  classNames={{
                    inputWrapper:
                      'bg-default-100 data-[hover=true]:bg-default-200 group-data-[focus=true]:bg-default-100 dark:bg-default-100/40 dark:data-[hover=true]:bg-default-200/40'
                  }}
                />

                <Button
                  size='lg'
                  color='primary'
                  className='w-full rounded-sm font-semibold'
                  isLoading={loading}
                  onPress={handleCreate}
                  isDisabled={!projectName.trim()}>
                  Continue
                  <Icon icon='lucide:arrow-right' className='h-4 w-4' />
                </Button>

                <button
                  type='button'
                  className='w-full py-2 text-xs text-default-400 transition-colors hover:text-default-600'
                  onClick={() => (isFirstProject ? router.push('/') : router.push(`/project/${projects[0].id}`))}>
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Info / Code ── */}
      <div className='hidden w-[420px] shrink-0 flex-col justify-center border-l border-default-200/70 bg-code-panel px-10 py-12 lg:flex'>
        {showApiKey ? (
          /* Step 2 right: dark terminal */
          <div>
            <p className='mb-1 text-[11px] font-bold uppercase tracking-widest text-code-subtle'>Quick Start</p>
            <h2 className='mb-5 text-lg font-bold text-white'>Make your first API call</h2>

            <div className='overflow-hidden rounded-xl bg-code-body'>
              <div className='flex items-center gap-2 bg-code-chrome px-4 py-2.5'>
                <div className='flex gap-1.5'>
                  <div className='h-2.5 w-2.5 rounded-full bg-danger/50' />
                  <div className='h-2.5 w-2.5 rounded-full bg-warning/50' />
                  <div className='h-2.5 w-2.5 rounded-full bg-success/50' />
                </div>
                <span className='ml-1 text-[11px] text-code-subtle'>Terminal</span>
              </div>
              <div className='p-5'>
                {codeLines.map((line, i) => (
                  <div key={i} className='flex gap-2 font-mono text-[11.5px] leading-relaxed'>
                    <span className='select-none text-code-subtle'>{line.prefix}</span>
                    <span className='break-all text-code-base'>{line.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className='mt-4 flex items-start gap-2.5 rounded-xl bg-code-chrome p-3.5'>
              <Icon icon='lucide:lightbulb' className='mt-0.5 h-4 w-4 shrink-0 text-code-accent' />
              <p className='text-[11.5px] leading-relaxed text-code-base'>
                Replace{' '}
                <code className='rounded bg-code-chip px-1 py-0.5 font-mono text-[11px] text-code-high'>
                  tpl_xxx
                </code>{' '}
                with your template key after uploading a template from the dashboard.
              </p>
            </div>
          </div>
        ) : (
          /* Step 1 right: how it works */
          <div>
            <p className='mb-1 text-[11px] font-bold uppercase tracking-widest text-code-subtle'>How it works</p>
            <h2 className='mb-2 text-lg font-bold text-white'>From data to PDF in seconds.</h2>
            <p className='mb-8 text-sm leading-relaxed text-code-base'>
              Qorstack Report turns JSON data and your templates into pixel-perfect PDFs via a simple REST API.
            </p>

            <div className='space-y-4'>
              {HOW_IT_WORKS.map((item, i) => (
                <div key={i} className='flex items-center gap-3.5'>
                  <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-code-chip'>
                    <Icon icon={item.icon} className='h-4 w-4 text-code-accent' />
                  </div>
                  <p className='text-sm text-code-base'>{item.label}</p>
                </div>
              ))}
            </div>

            <div className='mt-10 border-t border-code-chip pt-6'>
              <div className='flex items-center gap-2 text-sm text-code-subtle'>
                <Icon icon='lucide:zap' className='h-4 w-4 text-code-accent' />
                <span>Free during Beta · Unlimited generations</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
