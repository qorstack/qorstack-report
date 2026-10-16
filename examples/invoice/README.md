# Example: invoice (DOCX template → PDF)

The smallest end-to-end demo of Qorstack Report: a Word template with
`{{placeholders}}`, a JSON payload, one API call, a finished PDF.

## What's here

| File | What it is |
| --- | --- |
| `invoice.docx` | A Word template. Its text contains `{{invoice_no}}`, `{{date}}`, `{{customer_name}}`, `{{description}}`, `{{amount}}`. |
| `data.json` | The values to merge into those placeholders. |
| `run.sh` | One command that renders the PDF and saves it. |

## The idea

```
invoice.docx                 data.json ("replace")                                invoice.pdf
─────────────                ─────────────────────                                ───────────
Invoice No: {{invoice_no}}   { "key": "invoice_no", "value": "INV-2026-001" }      Invoice No: INV-2026-001
Bill To: {{customer_name}}   { "key": "customer_name", "value": "ACME Co., Ltd." } →  Bill To: ACME Co., Ltd.
Amount Due: {{amount}}       { "key": "amount", "value": "45,000 THB" }            Amount Due: 45,000 THB
```

You design the document once in Word; your app just sends JSON.

## Run it

1. Start the stack and open the web UI (see the repo README).
2. Upload `invoice.docx` in the web UI → copy the **template key** it shows.
3. Create an **API key** (Settings → API Keys).
4. Render:

```bash
QORSTACK_API_KEY=<your-key> TEMPLATE_KEY=<template-key> bash run.sh
```

You'll get `invoice.pdf` in this folder, with the placeholders filled in.

### Or render with a raw `curl`

```bash
curl -X POST http://localhost:8080/api/render/word/template \
  -H "X-API-Key: <your-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "templateKey": "<template-key>",
    "fileType": "pdf",
    "replace": [
      { "key": "invoice_no", "value": "INV-2026-001" },
      { "key": "date", "value": "2026-06-05" },
      { "key": "customer_name", "value": "ACME Co., Ltd." },
      { "key": "description", "value": "Website development — June 2026" },
      { "key": "amount", "value": "45,000 THB" }
    ]
  }'
# → { "jobId": "...", "downloadUrl": "...", "status": "completed" }
```

Want `.docx` out instead of PDF? Set `"fileType": "docx"`.
