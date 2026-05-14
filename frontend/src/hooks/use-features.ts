'use client'

import { useEffect, useState } from 'react'
import { fetchFeatureFlags, type FeatureFlags } from '@/api/features'

// Module-level cache so the API is called only once per page load
let cache: FeatureFlags | null = null

type UseFeaturesResult = {
  features: FeatureFlags | null
  isLoading: boolean
}

/**
 * Returns the server-reported feature flags.
 * Cached in memory — only one HTTP request per page load.
 * Defaults all features to false on error so the UI degrades gracefully.
 */
export const useFeatures = (): UseFeaturesResult => {
  const [features, setFeatures] = useState<FeatureFlags | null>(cache)

  useEffect(() => {
    if (cache !== null) return

    fetchFeatureFlags()
      .then(data => {
        cache = data
        setFeatures(data)
      })
      .catch(() => {
        const fallback: FeatureFlags = {
          pdfPasswordProtection: false,
          pdfWatermark: false,
          livePreview: false,
          projectMembers: false,
          isDemo: false,
          isSelfhost: true,
          maxTemplateVersions: 10,
          autoDetectVariables: true,
          customTemplateKey: true
        }
        cache = fallback
        setFeatures(fallback)
      })
  }, [])

  return { features, isLoading: features === null }
}
