import React from 'react'
import Image from 'next/image'
import Icon from '@/components/icon'

interface FileIconProps {
  type?: 'pdf' | 'doc' | 'xls' | 'excel' | 'default'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const FileIcon = ({ type = 'pdf', size = 'md', className = '' }: FileIconProps) => {
  const sizeDimensions = {
    sm: 32,
    md: 40,
    lg: 48
  }

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }

  // Map for new image icons
  const imageMap: Record<string, string> = {
    pdf: '/icons/pdf.png',
    xls: '/icons/excel.png',
    excel: '/icons/excel.png'
  }

  // Fallback for old icons
  const iconMap: Record<string, string> = {
    doc: 'vscode-icons:file-type-word',
    default: 'vscode-icons:default-file'
  }

  const imageSrc = imageMap[type]
  const iconName = iconMap[type] || iconMap.default
  const dimension = sizeDimensions[size]
  const sizeClass = sizeClasses[size]

  if (imageSrc) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Image
          src={imageSrc}
          alt={`${type} icon`}
          width={dimension}
          height={dimension}
          className="object-contain"
        />
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Icon icon={iconName} className={sizeClass} />
    </div>
  )
}

export default FileIcon
