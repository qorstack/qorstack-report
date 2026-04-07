'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@heroui/react'
import Icon from '@/components/icon'
import { useProject } from '@/providers/ProjectContext'
import { api } from '@/api/generated/main-service'

const STEPS = ['Create Project', 'Get API Key']

const HOW_IT_WORKS = [
  { n: '01', label: 'Create a project & get your API key' },
  { n: '02', label: 'Upload or design a PDF template' },
  { n: '03', label: 'Send JSON data via REST API' },
  { n: '04', label: 'Receive a generated PDF instantly' }
]

const CODE_SNIPPET = `curl -X POST https://api.qorstack.io/v1/render \\
  -H "X-API-Key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"templateId":"tpl_xxx","data":{}}'`

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

  const currentStep = showApiKey ? 1 : 0

  return (
    <div className='grid h-full grid-cols-1 lg:grid-cols-[1fr_420px]'>
      {/* Left — Form */}
      <div className='flex flex-col items-center justify-center px-8 py-12 lg:px-16'>
        <div className='w-full max-w-md'>
          {/* Step indicator */}
          <div className='mb-10 flex items-center gap-0'>
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <div className='flex flex-col items-center gap-1.5'>
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold transition-all ${
                      i < currentStep
                        ? 'bg-foreground text-background'
                        : i === currentStep
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-default-200 bg-transparent text-default-400'
                    }`}>
                    {i < currentStep ? <Icon icon='lucide:check' className='h-3.5 w-3.5' /> : i + 1}
                  </div>
                  <span
                    className={`text-[11px] font-medium ${i <= currentStep ? 'text-foreground' : 'text-default-400'}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mb-4 h-px flex-1 transition-colors ${
                      i < currentStep ? 'bg-foreground' : 'bg-default-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Heading */}
          <div className='mb-8'>
            {showApiKey ? (
              <div className='flex items-center gap-2.5'>
                <div className='flex h-7 w-7 items-center justify-center rounded-full bg-success-100 dark:bg-success-900/40'>
                  <Icon icon='lucide:check' className='h-4 w-4 text-success-600 dark:text-success-400' />
                </div>
                <h1 className='text-2xl font-bold tracking-tight text-default-800'>Your project is ready.</h1>
              </div>
            ) : (
              <h1 className='text-2xl font-bold tracking-tight text-default-800'>
                {isFirstProject ? 'Create your first project.' : 'Create a new project.'}
              </h1>
            )}
            <p className='mt-2 text-sm text-default-500'>
              {showApiKey
                ? 'Your default API key has been generated.'
                : 'A project holds your templates, API keys, and generation history.'}
            </p>
          </div>

          {/* Form */}
          {showApiKey ? (
            <div className='space-y-3'>
              {/* API Key card */}
              <div className='overflow-hidden rounded-xl border border-default-200 bg-content2/50'>
                <div className='flex items-center justify-between border-b border-default-200 bg-content2 px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <Icon icon='lucide:key' className='h-3.5 w-3.5 text-default-400' />
                    <span className='text-xs font-semibold text-default-500'>API Key</span>
                  </div>
                  <Button
                    size='sm'
                    variant='flat'
                    onPress={handleCopyKey}
                    startContent={<Icon icon={copied ? 'lucide:check' : 'lucide:copy'} className='h-3.5 w-3.5' />}
                    className={`h-7 rounded-md px-3 text-xs font-medium transition-all ${
                      copied
                        ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                        : 'bg-default-100 text-default-600 hover:bg-default-200'
                    }`}>
                    {copied ? 'Copied!' : 'Copy key'}
                  </Button>
                </div>
                <div className='cursor-pointer select-all px-4 py-5' onClick={handleCopyKey} title='Click to copy'>
                  <p className='break-all font-mono text-sm leading-relaxed tracking-wide text-default-700'>
                    {generatedApiKey}
                  </p>
                </div>
              </div>

              {/* Warning banner */}
              <div className='flex gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30'>
                <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40'>
                  <Icon icon='lucide:shield-alert' className='h-4 w-4 text-amber-600 dark:text-amber-400' />
                </div>
                <div>
                  <p className='text-sm font-semibold text-amber-800 dark:text-amber-300'>Save this key now</p>
                  <p className='mt-0.5 text-xs leading-relaxed text-amber-600 dark:text-amber-400'>
                    This is the only time you&apos;ll see it. Once you leave this page, it cannot be retrieved.
                  </p>
                </div>
              </div>

              <Button
                size='lg'
                color='primary'
                className='w-full font-semibold'
                onPress={() => router.push(`/project/${projectId}`)}>
                Go to Dashboard
                <Icon icon='lucide:arrow-right' className='h-4 w-4' />
              </Button>
            </div>
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault()
                handleCreate()
              }}
              className='space-y-3'>
              <Input
                size='lg'
                variant='bordered'
                label='Project Name'
                placeholder='e.g. My Awesome App'
                value={projectName}
                onValueChange={setProjectName}
                autoFocus
                classNames={{
                  inputWrapper:
                    'bg-background border-default-200 data-[hover=true]:border-default-400 group-data-[focus=true]:border-foreground'
                }}
              />

              <Button
                size='lg'
                color='primary'
                className='w-full font-semibold'
                isLoading={loading}
                onPress={handleCreate}
                isDisabled={!projectName.trim()}>
                Continue
                <Icon icon='lucide:arrow-right' className='h-4 w-4' />
              </Button>

              <Button
                size='lg'
                variant='light'
                className='w-full text-sm text-default-400'
                onPress={() => (isFirstProject ? router.push('/') : router.push(`/project/${projects[0].id}`))}>
                Cancel
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Right — Info panel */}
      <div className='hidden flex-col justify-center border-l border-default-100 bg-content2/60 px-10 py-12 lg:flex'>
        {showApiKey ? (
          <div>
            <p className='mb-1 text-xs font-semibold uppercase tracking-widest text-default-400'>Example request</p>
            <h2 className='mb-5 text-lg font-bold text-default-700'>Start generating PDFs</h2>

            <div className='overflow-hidden border border-default-200'>
              <div className='flex items-center gap-2 border-b border-default-200 bg-content3 px-3 py-2'>
                <div className='flex gap-1'>
                  <div className='h-2 w-2 rounded-full bg-default-300' />
                  <div className='h-2 w-2 rounded-full bg-default-300' />
                  <div className='h-2 w-2 rounded-full bg-default-300' />
                </div>
                <span className='text-[10px] font-medium text-default-400'>Terminal</span>
              </div>
              <pre className='overflow-x-auto bg-content1 p-4 font-mono text-[11px] leading-relaxed text-default-500'>
                {CODE_SNIPPET}
              </pre>
            </div>

            <div className='mt-6 flex items-center gap-2 text-sm text-default-400'>
              <Icon icon='lucide:book-open' className='h-4 w-4' />
              <span>View the full API docs to get started</span>
            </div>
          </div>
        ) : (
          <div>
            <p className='mb-1 text-xs font-semibold uppercase tracking-widest text-default-400'>How it works</p>
            <h2 className='mb-2 text-lg font-bold text-default-700'>From data to PDF in seconds.</h2>
            <p className='mb-8 text-sm leading-relaxed text-default-400'>
              Qorstack Report turns JSON data and your templates into pixel-perfect PDFs via a simple REST API.
            </p>

            <div className='space-y-5'>
              {HOW_IT_WORKS.map(item => (
                <div key={item.n} className='flex items-start gap-3.5'>
                  <span className='mt-0.5 w-8 shrink-0 font-mono text-lg font-black leading-none text-default-300'>
                    {item.n}
                  </span>
                  <p className='text-sm text-default-500'>{item.label}</p>
                </div>
              ))}
            </div>

            <div className='mt-10 border-t border-default-200 pt-6'>
              <div className='flex items-center gap-2 text-sm text-default-400'>
                <Icon icon='lucide:zap' className='h-4 w-4 text-primary' />
                <span>Free during Beta · Unlimited generations</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
