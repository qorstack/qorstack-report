import { CodeExamples, CodeGenOptions, DEFAULT_WEBHOOK_URL } from './types'
import { generateCsharpExample } from './csharp'
import { generateNodejsExample } from './nodejs'
import { generateApiExample } from './api'
import { absoluteApiUrl } from '@/api/base-url'
import { toExcelRenderRequest, toWordRenderRequest } from '@/utils/keyed-request'

/**
 * Builds request examples from a builder (sandbox) payload. The payload is converted to the
 * render API's keyed-array shape first, so every example shows the documented request format.
 */
export const getSdkCodeExamples = (data: any, options: CodeGenOptions = {}): CodeExamples => {
  const hasExcelOptions = (data.table || []).some(
    (table: any) => table.freezeHeader || table.autoFilter || table.autoFitColumns
  )
  const documentType = options.documentType || (hasExcelOptions ? 'excel' : 'pdf')
  const apiUrl = options.apiUrl || absoluteApiUrl()
  const mode = options.mode || 'sync'
  const base = documentType === 'excel' ? toExcelRenderRequest(data) : toWordRenderRequest(data)
  const request =
    mode === 'async' ? { ...base, async: true, webhookUrl: options.webhookUrl?.trim() || DEFAULT_WEBHOOK_URL } : base
  const opts = { documentType, apiUrl, mode }

  return {
    json: JSON.stringify(request, null, 2),
    api: generateApiExample(request, opts),
    curl: generateApiExample(request, opts),
    nodejs: generateNodejsExample(request, opts),
    csharp: generateCsharpExample(request, opts),
    dotnet: generateCsharpExample(request, opts)
  }
}

export * from './types'
export { generateCsharpExample } from './csharp'
export { generateNodejsExample } from './nodejs'
export { generateApiExample } from './api'
export { getWebhookReceiverExamples } from './webhook'
