'use client'

import { cn } from "@heroui/react"
import { ReactNode, CSSProperties } from 'react'

import ModernDrawer from 'react-modern-drawer'
import 'react-modern-drawer/dist/index.css'

type Props = {
  children: ReactNode
  direction: 'right' | 'left' | 'top' | 'bottom'
  open: boolean
  onClose: () => void
  size?: number | string
  style?: CSSProperties
  duration?: number
  overlayOpacity?: number
  overlayColor?: string
  enableOverlay?: boolean
  zIndex?: number
  className?: string
  overlayClassName?: string
  customIdSuffix?: string
  lockBackgroundScroll?: boolean
}

const Drawer = ({ className, ...props }: Props) => {
  return (
    <ModernDrawer
      className={cn('!bg-background !drop-shadow-xl', className)}
      overlayClassName='!bg-background !opacity-80'
      lockBackgroundScroll={true}
      duration={200}
      {...props}>
      {props.children}
    </ModernDrawer>
  )
}

export default Drawer
