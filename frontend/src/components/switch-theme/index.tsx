'use client'

import { useTheme } from 'next-themes'
import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const KNOB_SIZE = 18
const TRACK_PADDING = 3
const TRACK_WIDTH = 48
const KNOB_LEFT = TRACK_PADDING
const KNOB_RIGHT = TRACK_WIDTH - KNOB_SIZE - TRACK_PADDING

const SwitchTheme = () => {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = theme === 'dark'
  const toggle = () => setTheme(isDark ? 'light' : 'dark')

  if (!mounted) {
    return <div className='h-6 w-12 rounded-md bg-default-200' />
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-md ring-1 ring-default-200/70 transition-colors duration-300 dark:ring-white/10 ${
        isDark ? 'bg-content3' : 'bg-content2'
      }`}>
      {/* Icons */}
      <div className='relative z-10 flex w-full items-center justify-between px-2'>
        <Icon
          icon='mingcute:sun-fill'
          className={`h-2.5 w-2.5 transition-colors ${isDark ? 'text-default-500' : 'text-primary-foreground'}`}
        />
        <Icon
          icon='ph:moon-fill'
          className={`h-2.5 w-2.5 transition-colors ${isDark ? 'text-primary-foreground' : 'text-primary'}`}
        />
      </div>

      {/* Sliding knob */}
      <motion.div
        className='absolute top-[3px] h-[18px] w-[18px] rounded-[4px] bg-primary shadow-sm transition-colors duration-300'
        initial={false}
        animate={{ x: isDark ? KNOB_RIGHT : KNOB_LEFT }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{ left: 0 }}
      />
    </button>
  )
}

export default SwitchTheme
