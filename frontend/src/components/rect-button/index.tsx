import Icon from '@/components/icon'
import { motion } from 'framer-motion'
import React from 'react'

const RectButton = ({
  children,
  variant = 'primary',
  onClick,
  className = '',
  icon,
  disabled = false
}: {
  children?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'outline' | 'ghost' | 'disabled'
  onClick?: () => void
  className?: string
  icon?: string
  disabled?: boolean
}) => {
  const variants = {
    primary: 'bg-primary hover:bg-primary-600 text-primary-foreground border border-transparent shadow-sm', // primary for PDF/Main
    secondary: 'bg-content1 hover:bg-content2 text-foreground border border-default-200',
    success: 'bg-secondary-600 hover:bg-secondary-700 text-white border border-transparent', // Green for Excel/Success
    outline: 'bg-transparent hover:bg-primary-50 text-primary border border-primary-200',
    ghost: 'bg-transparent hover:bg-content3 text-default-600',
    disabled: 'bg-content3 text-default-400 border border-default-200 cursor-not-allowed'
  }

  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={disabled ? undefined : onClick}
      className={`
        flex items-center justify-center gap-2 rounded-sm px-6 py-3 text-sm font-medium tracking-wide transition-colors
        ${variants[disabled ? 'disabled' : variant]}
        ${className}
      `}>
      {icon && <Icon icon={icon} className='h-[18px] w-[18px]' />}
      {children}
    </motion.button>
  )
}

export default RectButton
