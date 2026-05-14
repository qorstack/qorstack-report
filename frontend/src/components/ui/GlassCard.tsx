'use client'

import { ReactNode } from 'react'

type Elevation = 1 | 2 | 3
type Radius = 'lg' | 'xl' | '2xl' | '3xl'

interface GlassCardProps {
  children: ReactNode
  elevation?: Elevation
  radius?: Radius
  className?: string
}

const elevationClass: Record<Elevation, string> = {
  1: 'bg-content1',
  2: 'bg-content2',
  3: 'bg-content3'
}

const radiusClass: Record<Radius, string> = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl'
}

export const GlassCard = ({ children, elevation = 2, radius = 'xl', className }: GlassCardProps) => (
  <div className={`ring-hairline ${elevationClass[elevation]} ${radiusClass[radius]} ${className ?? ''}`}>
    {children}
  </div>
)
