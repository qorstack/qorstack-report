import type { CodeGenOptions } from './types'

const getEndpoint = (documentType: CodeGenOptions['documentType']) =>
  documentType === 'excel' ? '/render/excel/template' : '/render/word/template'

const getApiUrl = (apiUrl?: string) => (apiUrl || '$QORSTACK_API_URL').replace(/\/+$/, '')

/**
 * REST example as a runnable cURL command. The body is passed through a quoted heredoc so the
 * JSON needs no shell escaping; the API key stays a placeholder environment variable.
 * Sync: shows the 200 answer and how to download the file. Async: shows the 202 answer,
 * the webhook body and how to check the job yourself.
 */
export const generateApiExample = (data: unknown, options: CodeGenOptions = {}): string => {
  const prettyJson = JSON.stringify(data, null, 2)
  const endpoint = getEndpoint(options.documentType)
  const baseUrl = getApiUrl(options.apiUrl)
  const urlLine = options.apiUrl ? '' : '\nexport QORSTACK_API_URL="https://your-host/api"'
  const ext = options.documentType === 'excel' ? 'xlsx' : 'pdf'

  const head = `# Create an API key on the API key page, then:
export QORSTACK_API_KEY="your-api-key"${urlLine}`

  const send = (comment: string) => `${comment}
curl -X POST "${baseUrl}${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $QORSTACK_API_KEY" \\
  --data-binary @- <<'JSON'
${prettyJson}
JSON`

  if (options.mode === 'async') {
    return `${head}

${send('# 1) Queue the render. The call answers at once with a job id (Pro feature).')}

# Answer: 202 Accepted
# { "jobId": "6f1c2a8e-…", "status": "pending", "statusUrl": "/render/jobs/6f1c2a8e-…" }

# 2) When the job finishes, Qorstack POSTs JSON to webhookUrl:
#    { "jobId": "6f1c2a8e-…", "status": "success", "downloadUrl": "https://…", "expiresIn": 3600 }
#    { "jobId": "6f1c2a8e-…", "status": "failed", "error": "…" }
#    Headers: X-Qorstack-Event: render.completed
#             X-Qorstack-Signature: sha256=<HMAC>   (only when the server sets WEBHOOK_SIGNING_SECRET)
#    Answer 2xx within 10 s; otherwise it is retried after 10 s and 60 s (3 attempts in total).

# 3) Optional: check the job yourself (pending → processing → success | failed).
#    Once the status is "success" the answer has a fresh downloadUrl.
curl "${baseUrl}/render/jobs/JOB_ID" -H "X-API-Key: $QORSTACK_API_KEY"`
  }

  return `${head}

${send('# The call waits until the file is ready.')}

# Answer: 200 OK
# { "jobId": "6f1c2a8e-…", "downloadUrl": "https://…", "expiresIn": 3600, "status": "success", "fileType": "${ext}" }

# Download the file (the link works for expiresIn seconds and needs no API key):
curl -L -o output.${ext} "DOWNLOAD_URL"`
}
