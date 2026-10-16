'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** Synchronous check for event handlers and timers. */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches

const subscribeReducedMotion = (onChange: () => void): (() => void) => {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

export const useReducedMotion = (): boolean =>
  useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false)

const noopSubscribe = (): (() => void) => () => undefined

/** true only after hydration on the client — use for client-only rendering. */
export const useIsClient = (): boolean =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )

/** Becomes true once the element scrolls into view (and stays true). */
export const useInView = <T extends Element>(threshold = 0.15): [RefObject<T | null>, boolean] => {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      entries => {
        if (!entries.some(e => e.isIntersecting)) return
        setInView(true)
        io.disconnect()
      },
      { threshold }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return [ref, inView]
}
