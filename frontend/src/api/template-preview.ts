import { api } from '@/api/generated/main-service'
import type { TemplateResponse } from '@/api/generated/main-service/apiGenerated'

export interface RegeneratePreviewResult {
  templateKey: string
  version: number
  previewFilePathPresigned?: string | null
}

/** Re-renders a template's preview with the fonts the renderer has now (POST /templates/{key}/preview). */
export const regenerateTemplatePreview = async (templateKey: string): Promise<RegeneratePreviewResult> => {
  const response = await api.instance.post<RegeneratePreviewResult>(`/templates/${encodeURIComponent(templateKey)}/preview`)
  return response.data
}

/** Every template of a project (all pages), for bulk actions that must not stop at the loaded page. */
export const listAllProjectTemplates = async (projectId: string): Promise<TemplateResponse[]> => {
  const all: TemplateResponse[] = []
  for (let pageNumber = 1; pageNumber <= 100; pageNumber++) {
    const res = await api.templates.templatesList({ projectId, pageNumber, pageSize: 100 })
    const items = res?.items ?? []
    all.push(...items)
    if (!res?.hasNextPage || items.length === 0) break
  }
  return all
}
