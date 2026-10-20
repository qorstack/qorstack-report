'use client'

import React, { useMemo, useState } from 'react'
import { CodeSwitcher } from '@/components/docs/CodeSwitcher'
import { getWebhookReceiverExamples } from '@/utils/code-gen'
import { DEFAULT_WEBHOOK_URL } from '@/utils/code-gen/types'
import type { CodeExamples, RenderMode } from '@/utils/code-gen/types'
import { cn } from '@/utils/cn'

const MODES: readonly { id: RenderMode; label: string; hint: string }[] = [
  { id: 'sync', label: 'Sync — wait for the file', hint: 'One call, the answer holds the download link' },
  { id: 'async', label: 'Async + webhook', hint: 'Queue a job, get the result on your webhook (Pro)' }
]

const StepTitle = ({ step, children }: { step: number; children: React.ReactNode }) => (
  <h3 className='flex items-center gap-2 text-[14px] font-semibold text-foreground'>
    <span className='inline-flex h-5 w-5 items-center justify-center bg-content4 font-mono text-[11px]'>{step}</span>
    {children}
  </h3>
)

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className='text-[13px] leading-relaxed text-default-500'>{children}</p>
)

/**
 * Code tab of the template builders: complete examples for both ways of calling the render API.
 * Sync waits for the file; async queues a job and delivers the result to the caller's webhook.
 */
export const RenderCodePanel = ({
  buildExamples
}: {
  /** Examples for the current test values in the given mode. */
  buildExamples: (options: { mode: RenderMode; webhookUrl: string }) => CodeExamples
}) => {
  const [mode, setMode] = useState<RenderMode>('sync')
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK_URL)
  const receiverExamples = useMemo(() => getWebhookReceiverExamples(), [])

  return (
    <div className='flex flex-col gap-4'>
      <div role='tablist' aria-label='How to call the API' className='flex flex-wrap gap-1 border border-divider p-1'>
        {MODES.map(item => (
          <button
            key={item.id}
            type='button'
            role='tab'
            aria-selected={mode === item.id}
            title={item.hint}
            onClick={() => setMode(item.id)}
            className={cn(
              'h-8 flex-1 whitespace-nowrap px-3 text-[13px] font-medium transition-colors',
              mode === item.id ? 'bg-content4 text-foreground' : 'text-default-500 hover:bg-content2 hover:text-foreground'
            )}>
            {item.label}
          </button>
        ))}
      </div>

      {mode === 'sync' ? (
        <>
          <Note>
            The call waits until the document is ready and answers <code>200</code> with a <code>downloadUrl</code>. The
            link works for <code>expiresIn</code> seconds and needs no API key, so you can hand it straight to the browser.
            Best for one document at a time that renders in a few seconds.
          </Note>
          <CodeSwitcher examples={buildExamples({ mode, webhookUrl })} defaultLanguage='api' isDisableMarginY={true} />
        </>
      ) : (
        <>
          <Note>
            <b className='font-semibold text-foreground'>Pro.</b> The call answers <code>202</code> with a{' '}
            <code>jobId</code> at once; the document is built in the background. When it is done, Qorstack sends{' '}
            <code>POST</code> to your <code>webhookUrl</code> with the status and a <code>downloadUrl</code>. Use it for
            large documents, batches, or callers that must not wait. No webhook endpoint? Poll{' '}
            <code>GET /render/jobs/{'{jobId}'}</code> instead (shown at the end of step 1).
          </Note>

          <label className='flex flex-col gap-1.5'>
            <span className='text-[12px] font-medium text-default-500'>Your webhook URL (fills the examples)</span>
            <input
              type='url'
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder={DEFAULT_WEBHOOK_URL}
              spellCheck={false}
              className='h-9 border border-divider bg-content1 px-3 font-mono text-[13px] text-foreground outline-none transition-colors focus:border-foreground'
            />
          </label>

          <StepTitle step={1}>Send the render job</StepTitle>
          <CodeSwitcher examples={buildExamples({ mode, webhookUrl })} defaultLanguage='api' isDisableMarginY={true} />

          <StepTitle step={2}>Receive the webhook in your app</StepTitle>
          <Note>
            Any http(s) address works, internal hosts included. Answer <code>2xx</code> within 10 seconds; other answers
            are retried after 10 s and 60 s (3 attempts), so handle a repeated <code>jobId</code>. If the server sets{' '}
            <code>WEBHOOK_SIGNING_SECRET</code>, check the <code>X-Qorstack-Signature</code> header as shown.
          </Note>
          <CodeSwitcher examples={receiverExamples} defaultLanguage='api' isDisableMarginY={true} />
        </>
      )}
    </div>
  )
}
