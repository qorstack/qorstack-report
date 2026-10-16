'use client'

import { ReactNode } from 'react'
import { cn } from '@heroui/react'

type Elevation = 1 | 2 | 3
type Radius = 'lg' | 'xl' | '2xl' | '3xl'

interface GlassCardProps {
  children: ReactNode
  elevation?: Elevation
  /** Kept for API compatibility — Press panels are always square. */
  radius?: Radius
  className?: string
}

const elevationClass: Record<Elevation, string> = {
  1: 'bg-content1',
  2: 'bg-content2',
  3: 'bg-content3'
}

/** Plain bordered panel (Press). The name is kept so existing imports keep compiling. */
export const GlassCard = ({ children, elevation = 2, className }: GlassCardProps) => (
  <div className={cn('border border-divider', elevationClass[elevation], className)}>{children}</div>
)
