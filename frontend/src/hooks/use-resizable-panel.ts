'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export const RESIZABLE_PANEL_MIN_WIDTH = 320
export const RESIZABLE_PANEL_MAX_WIDTH = 900
const MIN_WIDTH = RESIZABLE_PANEL_MIN_WIDTH
const MAX_WIDTH = RESIZABLE_PANEL_MAX_WIDTH
const KEY_STEP = 24

const clamp = (n: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n))

export const useResizablePanel = (storageKey: string, defaultWidth: number) => {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return defaultWidth
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = parseInt(saved, 10)
        if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) return parsed
      }
    } catch {
      // Storage unavailable — fall back to default.
    }
    return defaultWidth
  })

  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const persist = useCallback(
    (value: number) => {
      try {
        localStorage.setItem(storageKey, String(value))
      } catch {
        // Storage unavailable — width just won't be remembered.
      }
    },
    [storageKey]
  )

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return
    const delta = e.clientX - startX.current
    setWidth(clamp(startWidth.current + delta))
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    setWidth(prev => {
      persist(prev)
      return prev
    })
  }, [persist])

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      startX.current = e.clientX
      startWidth.current = width
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [width]
  )

  /** Arrow keys resize the panel; Home/End jump to min/max. */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let next: number | null = null
      if (e.key === 'ArrowLeft') next = clamp(width - KEY_STEP)
      else if (e.key === 'ArrowRight') next = clamp(width + KEY_STEP)
      else if (e.key === 'Home') next = MIN_WIDTH
      else if (e.key === 'End') next = MAX_WIDTH
      if (next === null) return
      e.preventDefault()
      setWidth(next)
      persist(next)
    },
    [width, persist]
  )

  return { width, handleMouseDown, handleKeyDown, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH }
}
