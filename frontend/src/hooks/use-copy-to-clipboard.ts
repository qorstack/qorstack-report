'use client'

import { useCallback, useRef, useState } from 'react'
import { copyText } from '@/utils/copy-text'

type Options = {
  /** How long the `copied` flag stays true after a successful copy. Default 2000ms. */
  resetMs?: number
  /** Called when the copy fails (e.g. clipboard API rejects). */
  onError?: (err: unknown) => void
}

type Result = {
  copied: boolean
  /** Copy the given text. Returns true on success. */
  copy: (text: string) => Promise<boolean>
}

/**
 * Shared clipboard helper with a self-resetting `copied` flag.
 *
 * Replaces the pattern of:
 *   const [copied, setCopied] = useState(false)
 *   navigator.clipboard.writeText(text); setCopied(true); setTimeout(..., 2000)
 *
 * Cancels stale timers on consecutive copies so the flag tracks the most recent action.
 * Works on plain-HTTP installs too (see copyText).
 */
export const useCopyToClipboard = ({ resetMs = 2000, onError }: Options = {}): Result => {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      const ok = await copyText(text)
      if (!ok) {
        onError?.(new Error('Copy to clipboard failed'))
        return false
      }
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), resetMs)
      return true
    },
    [resetMs, onError]
  )

  return { copied, copy }
}
