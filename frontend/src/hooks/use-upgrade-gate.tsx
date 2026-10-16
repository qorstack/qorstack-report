'use client'

import React, { useCallback, useState } from 'react'
import { useFeatures } from '@/hooks/use-features'
import { UpgradeToProModal } from '@/components/pro'
import type { FeatureFlags } from '@/api/features'

type GateableFeature = 'pdfPasswordProtection' | 'pdfWatermark' | 'downloadAsZip' | 'projectTransfer'

type ModalCopy = {
  eyebrow: string
  title: string
  description: string
  features: string[]
}

const FEATURE_COPY: Record<GateableFeature, ModalCopy> = {
  pdfPasswordProtection: {
    eyebrow: 'Document security',
    title: 'Upgrade to Pro',
    description:
      'PDF Password Protection lets you secure rendered documents with user/owner passwords and access restrictions. Available on Pro plans.',
    features: ['User & owner password lock', 'Restrict printing, copying, modifying', 'Per-template policy']
  },
  pdfWatermark: {
    eyebrow: 'Document branding',
    title: 'Upgrade to Pro',
    description:
      'Watermark stamps every rendered page with a custom text overlay — perfect for CONFIDENTIAL or DRAFT marks. Available on Pro plans.',
    features: ['Custom text, opacity, rotation', 'Position & font family control', 'Applied on every render']
  },
  downloadAsZip: {
    eyebrow: 'Output packaging',
    title: 'Upgrade to Pro',
    description:
      'Wrap rendered outputs in a .zip archive automatically — ideal for batch deliveries and protected file transfers. Available on Pro plans.',
    features: ['Auto-zip every render', 'Smaller transfer sizes', 'Bundle multi-file outputs']
  },
  projectTransfer: {
    eyebrow: 'Deployments',
    title: 'Upgrade to Pro',
    description:
      'Export a whole project as one .zip and import it into another Qorstack deployment — e.g. promote templates from staging to production. Available on Pro plans.',
    features: ['Templates, test data, images and fonts in one file', 'Preview every change before importing', 'Keeps template keys, so API callers need no change']
  }
}

/**
 * Gate a Pro-only action behind the upgrade modal.
 *
 * Usage:
 *   const { requireFeature, gateModal } = useUpgradeGate()
 *   ...
 *   <Switch onValueChange={v => { if (!requireFeature('pdfPasswordProtection')) return; onChange(v) }} />
 *   {gateModal}
 *
 * `requireFeature(key)` returns `true` if the feature is enabled (proceed),
 * `false` if not (modal opens automatically — caller should early-return).
 */
export const useUpgradeGate = () => {
  const { features, isLoading } = useFeatures()
  const [openKey, setOpenKey] = useState<GateableFeature | null>(null)

  const requireFeature = useCallback(
    (key: GateableFeature): boolean => {
      if (isLoading) return false
      if (features?.[key as keyof FeatureFlags]) return true
      setOpenKey(key)
      return false
    },
    [features, isLoading]
  )

  const gateModal = (
    <UpgradeToProModal
      isOpen={openKey !== null}
      onOpenChange={open => {
        if (!open) setOpenKey(null)
      }}
      {...(openKey ? FEATURE_COPY[openKey] : {})}
    />
  )

  return { requireFeature, gateModal, isLoading, features }
}
