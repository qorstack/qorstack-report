export interface CodeExamples {
  json?: string
  api?: string
  curl?: string
  nodejs?: string
  ts?: string
  csharp?: string
  dotnet?: string
  go?: string
  python?: string
  java?: string
  php?: string
  rust?: string
  other?: string
  [key: string]: string | undefined
}

export type DocumentType = 'pdf' | 'excel'

/** sync: the call waits and returns the download link. async: the call returns a job id; the result comes by webhook. */
export type RenderMode = 'sync' | 'async'

export const DEFAULT_WEBHOOK_URL = 'https://your-app.example.com/webhooks/qorstack'

export interface CodeGenOptions {
  documentType?: DocumentType
  apiUrl?: string
  mode?: RenderMode
  /** Used when mode is async. */
  webhookUrl?: string
}
