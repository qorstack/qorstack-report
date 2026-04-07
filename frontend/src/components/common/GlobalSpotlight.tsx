'use client'

import { useEffect, useState } from 'react'

/**
 * Full-page mouse spotlight for dark mode.
 * Fixed overlay — covers every section of the landing page.
 * Small radius (360px), distinctly blue to feel like a torch beam.
 */
export const GlobalSpotlight = () => {
  const [pos, setPos] = useState({ x: -9999, y: -9999 })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY })
      setVisible(true)
    }
    const onLeave = () => setVisible(false)

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div
      className='pointer-events-none fixed inset-0 z-[9] hidden dark:block'
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        // 360px radius — small torch beam, distinctly blue (#4A82E8 @ 9%)
        background: `radial-gradient(360px circle at ${pos.x}px ${pos.y}px, rgba(74,130,232,0.09), transparent 70%)`
      }}
    />
  )
}
