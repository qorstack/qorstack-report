'use client'

import React from 'react'
import { Button } from "@heroui/react"
import { useTranslation } from 'react-i18next'

const SwitchLanguage = () => {
  const { i18n } = useTranslation()
  const currentLang = i18n.language

  const handleLangItemClick = (lang: 'en' | 'th') => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang)
    }
  }

  return (
    <div className='relative flex'>
      <Button
        isIconOnly
        color='primary'
        variant='light'
        onClick={() => handleLangItemClick(currentLang === 'th' ? 'en' : 'th')}>
        {currentLang === 'th' ? 'EN' : 'TH'}
      </Button>
    </div>
  )
}

export default SwitchLanguage
