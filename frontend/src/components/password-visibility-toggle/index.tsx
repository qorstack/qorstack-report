'use client'

import React from 'react'
import { Icon } from '@iconify/react'

type PasswordVisibilityToggleProps = {
  isVisible: boolean
  toggleVisibility: () => void
}

const PasswordVisibilityToggle: React.FC<PasswordVisibilityToggleProps> = ({ isVisible, toggleVisibility }) => {
  return (
    <button
      type='button'
      className='focus:outline-none'
      onClick={toggleVisibility}
      aria-label='toggle password visibility'>
      <Icon
        icon={isVisible ? 'ri:eye-off-fill' : 'ri:eye-fill'}
        className='pointer-events-none text-2xl text-default-400'
      />
    </button>
  )
}

export default PasswordVisibilityToggle
