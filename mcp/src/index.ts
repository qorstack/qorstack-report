#!/usr/bin/env node
/**
 * Qorstack Report — MCP server
 *
 * Exposes Qorstack Report's document API to MCP-capable AI agents (Claude, Cursor, …)
 * as first-class tools, so an agent can list templates and generate PDF/DOCX/XLSX
 * without reverse-engineering the REST API.
 *
 * Configuration (environment variables):
 *   QORSTACK_API_URL   Base URL of the Qorstack Report API (default http://localhost:8080/api; /api is appended if missing)
 *   QORSTACK_API_KEY   API key for authentication (sent as the X-API-Key header). Required.
 *
 * Transport: stdio (the standard for locally-launched MCP servers).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const API_BASE = (process.env.QORSTACK_API_URL ?? 'http://localhost:8080/api').replace(/\/+$/, '')
// v2: the API is under /api on the same port as the web UI; accept v1-style URLs too.
const API_URL = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`
const API_KEY = process.env.QORSTACK_API_KEY ?? ''

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean }

const ok = (data: unknown): ToolResult => ({
  content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }]
})

const err = (message: string): ToolResult => ({
  content: [{ type: 'text', text: message }],
  isError: true
})

/** Call the Qorstack API with the configured key. Returns parsed JSON on 2xx, throws otherwise. */
const apiFetch = async (path: string, init: RequestInit = {}): Promise<unknown> => {
  if (!API_KEY) {
    throw new Error('QORSTACK_API_KEY is not set. Create an API key in the Qorstack web UI (Settings → API Keys) and set QORSTACK_API_KEY.')
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} from ${path}\n${text}`)
  }
  return text ? JSON.parse(text) : null
}

const server = new McpServer({ name: 'qorstack-report', version: '0.1.0' })

server.registerTool(
  'qorstack_list_templates',
  {
    title: 'List templates',
    description: 'List the stored Qorstack Report templates available to the current API key. Use the returned templateKey with the generate tools.',
    inputSchema: {}
  },
  async (): Promise<ToolResult> => {
    try {
      return ok(await apiFetch('/templates'))
    } catch (e: any) {
      return err(e.message)
    }
  }
)

server.registerTool(
  'qorstack_get_template',
  {
    title: 'Get template',
    description: 'Get details of a single stored template by its templateKey (variables, sheets, version info).',
    inputSchema: { templateKey: z.string().describe('The stored template key') }
  },
  async ({ templateKey }): Promise<ToolResult> => {
    try {
      return ok(await apiFetch(`/templates/${encodeURIComponent(templateKey)}`))
    } catch (e: any) {
      return err(e.message)
    }
  }
)

// Keyed items: every entry names the template marker it fills via "key".
const keyField = z.string().describe('Marker name in the template, e.g. "logo" for {{image:logo}}')
const cellValue = z.union([z.string(), z.number(), z.boolean(), z.null()])
const columnName = z.string().describe('A name listed in "columns"')

const generateInput = {
  templateKey: z.string().describe('The stored template key to render'),
  templateVersion: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Render this stored version of the template (omit for the current version)'),
  fileName: z.string().optional().describe('Output file name without extension (a UUID is used if omitted)'),
  replace: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .optional()
    .describe('Variable substitution: [{ "key": "customer_name", "value": "ACME" }]'),
  table: z
    .array(
      z
        .object({
          columns: z
            .array(z.string())
            .describe('Column marker names listed once, e.g. ["item", "qty"] for {{row:item}} / {{row:qty}}'),
          rows: z
            .array(z.array(cellValue))
            .describe('Rows; each row is an array of values in "columns" order, e.g. [["Widget", 2]]'),
          sort: z
            .array(z.object({ field: columnName, direction: z.enum(['asc', 'desc']) }))
            .optional()
            .describe('Sort rows: [{ "field": "qty", "direction": "desc" }]'),
          verticalMerge: z.array(columnName).optional().describe('Merge equal adjacent values: ["group"]'),
          collapse: z.array(columnName).optional().describe('Group rows by column: ["category"]')
        })
        .passthrough()
    )
    .optional()
    .describe('Tables in document order: [{ "columns": ["item", "qty"], "rows": [["Widget", 2]], "sort"?, "repeatHeader"? }]'),
  image: z
    .array(z.object({ key: keyField }).passthrough())
    .optional()
    .describe('Images: [{ "key": "logo", "src": "https://… or base64", "width"?, "height"?, "fit"? }]'),
  qrcode: z
    .array(z.object({ key: keyField }).passthrough())
    .optional()
    .describe('QR codes: [{ "key": "payment", "text": "…", "size"? }]'),
  barcode: z
    .array(z.object({ key: keyField }).passthrough())
    .optional()
    .describe('Barcodes: [{ "key": "sku", "text": "…", "format"? }]'),
  async: z
    .boolean()
    .optional()
    .describe(
      'Pro only. Queue the render instead of waiting: returns { jobId, status: "pending", statusUrl }. ' +
        'Then call qorstack_get_job until status is "success" (downloadUrl) or "failed" (errorMessage). Use for large documents.'
    ),
  webhookUrl: z
    .string()
    .url()
    .optional()
    .describe('Pro, with async only. Public https URL that receives POST { jobId, status, downloadUrl?, error? } when the job finishes')
}

/** Drop undefined keys so the request body only carries what the caller provided. */
const compact = (obj: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))

server.registerTool(
  'qorstack_generate_pdf',
  {
    title: 'Generate PDF/DOCX from template',
    description: 'Render a stored Word template to PDF (or DOCX) by merging JSON data. Returns a job id and a downloadUrl, or with async: true (Pro) a queued job to poll with qorstack_get_job.',
    inputSchema: {
      ...generateInput,
      fileType: z.enum(['pdf', 'docx']).default('pdf').describe('Output format')
    }
  },
  async (args): Promise<ToolResult> => {
    try {
      const body = compact({ ...args })
      return ok(await apiFetch('/render/word/template', { method: 'POST', body: JSON.stringify(body) }))
    } catch (e: any) {
      return err(e.message)
    }
  }
)

server.registerTool(
  'qorstack_generate_excel',
  {
    title: 'Generate Excel from template',
    description: 'Render a stored Excel (.xlsx) template by merging JSON data. Output is .xlsx (Excel in, Excel out). Returns a job id and a downloadUrl, or with async: true (Pro) a queued job to poll with qorstack_get_job.',
    inputSchema: generateInput
  },
  async (args): Promise<ToolResult> => {
    try {
      const body = compact({ ...args })
      return ok(await apiFetch('/render/excel/template', { method: 'POST', body: JSON.stringify(body) }))
    } catch (e: any) {
      return err(e.message)
    }
  }
)

server.registerTool(
  'qorstack_get_job',
  {
    title: 'Get render job',
    description: 'Get the status of a render job by id: pending → processing → success (fresh downloadUrl) | failed (errorMessage). Poll this after a generate call with async: true.',
    inputSchema: { jobId: z.string().describe('The render job id returned by a generate tool') }
  },
  async ({ jobId }): Promise<ToolResult> => {
    try {
      return ok(await apiFetch(`/render/jobs/${encodeURIComponent(jobId)}`))
    } catch (e: any) {
      return err(e.message)
    }
  }
)

const main = async (): Promise<void> => {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // stderr is safe for logs; stdout is reserved for the MCP protocol.
  console.error(`qorstack-report MCP server running (API: ${API_URL})`)
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
