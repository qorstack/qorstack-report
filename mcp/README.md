# Qorstack Report — MCP server

A [Model Context Protocol](https://modelcontextprotocol.io) server that gives AI
agents (Claude Desktop, Claude Code, Cursor, …) first-class tools for generating
documents with [Qorstack Report](https://github.com/qorstack/qorstack-report) —
so an agent can list templates and produce PDF/DOCX/XLSX without reverse-engineering
the REST API.

## Tools

| Tool | What it does |
| --- | --- |
| `qorstack_list_templates` | List stored templates available to your API key |
| `qorstack_get_template` | Get one template's details by `templateKey` |
| `qorstack_generate_pdf` | Render a Word template → PDF/DOCX from JSON; returns a `downloadUrl` |
| `qorstack_generate_excel` | Render an Excel template → XLSX from JSON; returns a `downloadUrl` |
| `qorstack_get_job` | Get a render job's status by id: `pending` → `processing` → `success` (fresh `downloadUrl`) or `failed` (`errorMessage`) |

**Async renders (Pro):** pass `async: true` (optionally `webhookUrl`) to either generate tool to queue the
render; it returns `{ jobId, status: "pending" }` right away. Poll `qorstack_get_job` with that `jobId`.
Without a Pro license the API answers 403; with too many pending jobs it answers 429 (retry later).

## Build

```bash
cd mcp
pnpm install
pnpm build      # emits dist/index.js
```

## Configure

The server needs your running Qorstack Report API and an API key (created in the
web UI under Settings → API Keys; sent as the `X-API-Key` header).

| Env var | Default | Notes |
| --- | --- | --- |
| `QORSTACK_API_URL` | `http://localhost:8080/api` | Base URL of the Qorstack Report API (`/api` is appended if missing) |
| `QORSTACK_API_KEY` | _(required)_ | API key for authentication |

### Claude Desktop / Claude Code (`mcpServers` config)

```json
{
  "mcpServers": {
    "qorstack-report": {
      "command": "node",
      "args": ["/absolute/path/to/qorstack-report/mcp/dist/index.js"],
      "env": {
        "QORSTACK_API_URL": "http://localhost:8080/api",
        "QORSTACK_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Example

> "Generate a PDF from template `invoice-v1` with customer_name = ACME Co. and invoice_no = INV-2026-001."

The agent calls `qorstack_generate_pdf` and gets back `{ jobId, downloadUrl, status }`.

The generate tools take the same body as the REST render endpoints: `replace`,
`table`, `image`, `qrcode` and `barcode` are **keyed arrays** — each item names the
template marker it fills via `key`. Tables list their column names once in `columns`,
and each row in `rows` holds the values in that order:

```json
{
  "templateKey": "invoice-v1",
  "fileType": "pdf",
  "replace": [
    { "key": "customer_name", "value": "ACME Co." },
    { "key": "invoice_no", "value": "INV-2026-001" }
  ],
  "table": [
    { "columns": ["item", "qty"], "rows": [ ["Widget", 2], ["Gadget", 5] ], "repeatHeader": true }
  ],
  "image": [ { "key": "logo", "src": "https://example.com/logo.png", "width": 120, "fit": "contain" } ],
  "qrcode": [ { "key": "payment", "text": "https://pay.example.com/INV-2026-001", "size": 120 } ],
  "barcode": [ { "key": "sku", "text": "123456", "format": "Code128" } ]
}
```

`replace` values are strings; table cell values may be string, number, boolean or
null. Duplicate or empty keys, rows whose length differs from `columns`, and
references to unknown columns are rejected with `400`. Add `templateVersion` to
render an older stored version of the template. `qorstack_generate_excel` always
returns `.xlsx`.
