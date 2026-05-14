import i18n from 'i18next'
import Backend from 'i18next-http-backend'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import { th } from './locales/th'
import { en } from './locales/en'

const resources = {
  th: {
    translation: {
      ...th
    }
  },
  en: {
    translation: {
      ...en
    }
  }
}

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'th',
    resources,
    fallbackLng: 'th',
    debug: false,
    react: {
      useSuspense: false
    },
    interpolation: {
      escapeValue: false,
      formatSeparator: ','
    }
  })

export default i18n
