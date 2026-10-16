import type { CodeGenOptions } from './types'

const getEndpoint = (documentType: CodeGenOptions['documentType']) =>
  documentType === 'excel' ? '/render/excel/template' : '/render/word/template'

const getApiUrl = (apiUrl?: string) => (apiUrl || '$QORSTACK_API_URL').replace(/\/+$/, '')

/**
 * REST example as a runnable cURL command. The body is passed through a quoted heredoc so the
 * JSON needs no shell escaping; the API key stays a placeholder environment variable.
 */
export const generateApiExample = (data: unknown, options: CodeGenOptions = {}): string => {
  const prettyJson = JSON.stringify(data, null, 2)
  const endpoint = getEndpoint(options.documentType)
  const baseUrl = getApiUrl(options.apiUrl)
  const urlLine = options.apiUrl ? '' : '\nexport QORSTACK_API_URL="https://your-host/api"'

  return `# Create an API key on the API key page, then:
export QORSTACK_API_KEY="your-api-key"${urlLine}

curl -X POST "${baseUrl}${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $QORSTACK_API_KEY" \\
  --data-binary @- <<'JSON'
${prettyJson}
JSON`
}
