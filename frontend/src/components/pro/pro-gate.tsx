'use client'

import React, { type ReactNode } from 'react'
import { useFeatures } from '@/hooks/use-features'
import type { FeatureFlags } from '@/api/features'
import { ProRequiredCard } from './pro-required-card'

type ProGateProps = {
  /** The feature key from FeatureFlags to check (e.g. "pdfPasswordProtection") */
  feature: keyof FeatureFlags
  /** Human-readable label shown in the "requires Pro" card (e.g. "PDF Password Protection") */
  featureLabel: string
  /** Optional description shown under the label */
  description?: string
  /** Content to render when the feature is available */
  children: ReactNode
}

/**
 * Renders children when the feature is enabled, or a ProRequiredCard otherwise.
 * While feature flags are loading, renders nothing to avoid layout flash.
 *
 * Usage:
 *   <ProGate feature="pdfPasswordProtection" featureLabel="PDF Password Protection">
 *     <PdfPasswordForm />
 *   </ProGate>
 */
export const ProGate = ({ feature, featureLabel, description, children }: ProGateProps) => {
  const { features, isLoading } = useFeatures()

  if (isLoading || features === null) return null

  if (features[feature]) return <>{children}</>

  return <ProRequiredCard featureLabel={featureLabel} description={description} />
}
