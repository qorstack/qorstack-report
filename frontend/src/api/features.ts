import { api } from '@/api/generated/main-service'

export type FeatureFlags = {
  pdfPasswordProtection: boolean
  pdfWatermark: boolean
  projectMembers: boolean
}

export const fetchFeatureFlags = async (): Promise<FeatureFlags> => {
  const response = await api.instance.get<FeatureFlags>('/features')
  return response.data
}
