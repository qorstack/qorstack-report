import { api } from '@/api/generated/main-service'

export type FeatureFlags = {
  pdfPasswordProtection: boolean
  pdfWatermark: boolean
  livePreview: boolean
  downloadAsZip: boolean
  projectMembers: boolean
  maxTemplateVersions: number
  autoDetectVariables: boolean
  customTemplateKey: boolean
  asyncRender?: boolean
  projectTransfer?: boolean
}

export const fetchFeatureFlags = async (): Promise<FeatureFlags> => {
  const response = await api.instance.get<FeatureFlags>('/features')
  return response.data
}
