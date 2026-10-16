# Render Endpoint Usage

This document reflects the current public render API and SDK methods.

## Endpoints

| Output                        | Endpoint                                           | Node.js SDK                                   | .NET SDK                                    |
| ----------------------------- | -------------------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| PDF/DOCX from Word template   | `POST /render/word/template`                       | `api.render.postRenderWordTemplate(request)`  | `api.PostRenderWordTemplateAsync(request)`  |
| Excel from Excel template     | `POST /render/excel/template`                      | `api.render.postRenderExcelTemplate(request)` | `api.PostRenderExcelTemplateAsync(request)` |
| Saved sandbox payload preview | `POST /render/word/template-sandbox/{templateKey}` | generated client method, if exposed           | frontend/internal sandbox flow              |

Authentication uses the `X-API-KEY` header.

`replace`, `table`, `image`, `qrcode` and `barcode` are **keyed arrays** — each item
names the template marker it fills via `key`. Table rows are arrays of
`{ "key", "value" }` cells (values may be string, number, boolean or null);
`replace` values are strings. Duplicate or empty keys return `400`.

> The v1 object-map form (`"replace": { "customer_name": "..." }`, rows as objects,
> `"image": { "logo": { ... } }`) was removed in API v2.0 / SDK 1.0 and now returns `400`.

## Word/PDF Request

```json
{
  "templateKey": "invoice-q4",
  "fileName": "invoice-101",
  "fileType": "pdf",
  "replace": [
    { "key": "customer_name", "value": "John Doe" },
    { "key": "invoice_date", "value": "2026-04-07" }
  ],
  "table": [
    {
      "columns": ["desc", "qty", "price"],
      "rows": [
        ["Item A", 1, 100],
        ["Item B", 2, 50]
      ],
      "sort": [{ "field": "desc", "direction": "asc" }],
      "verticalMerge": ["desc"],
      "collapse": []
    }
  ],
  "image": [
    {
      "key": "logo",
      "src": "https://example.com/logo.png",
      "width": 100,
      "height": 50,
      "fit": "contain"
    }
  ],
  "qrcode": [
    {
      "key": "payment",
      "text": "https://example.com/pay/invoice-101",
      "size": 120
    }
  ],
  "barcode": [
    {
      "key": "order_id",
      "text": "ORD-2026-001",
      "format": "Code128",
      "width": 200,
      "height": 50,
      "includeText": true
    }
  ]
}
```

Set `fileType` to `"docx"` when you want the generated Word file instead of PDF.

## Excel Request

```json
{
  "templateKey": "sales-report",
  "fileName": "sales-report-q4",
  "replace": [
    { "key": "report_date", "value": "2026-04-07" }
  ],
  "table": [
    {
      "columns": ["category", "name", "qty", "price"],
      "rows": [
        ["Services", "Service A", 2, 100],
        ["Services", "Service B", 1, 200]
      ],
      "autoFilter": true,
      "freezeHeader": true,
      "autoFitColumns": true,
      "generateTotals": [ { "key": "price", "value": "sum" } ],
      "numberFormat": [ { "key": "price", "value": "#,##0.00" } ]
    }
  ]
}
```

## Success Response

```json
{
  "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "downloadUrl": "https://example.com/presigned-download-url",
  "expiresIn": 3600,
  "fileType": "pdf",
  "status": "Completed",
  "isZipped": false
}
```

## Node.js SDK

```ts
import { QorstackApi, PdfFromTemplateRequest } from "qorstack-report-sdk";

const api = new QorstackApi({
  baseUrl: process.env.QORSTACK_API_URL || "http://localhost:8080/api",
  securityData: {
    headers: {
      "X-API-KEY": process.env.QORSTACK_API_KEY || "YOUR_API_KEY",
    },
  },
});

const request: PdfFromTemplateRequest = {
  templateKey: "invoice-q4",
  fileName: "invoice-101",
  replace: [{ key: "customer_name", value: "John Doe" }],
};

const response = await api.render.postRenderWordTemplate(request);
const { downloadUrl } = response.data;
```

## .NET SDK

```csharp
using Qorstack.Report.Sdk;

var apiUrl = Environment.GetEnvironmentVariable("QORSTACK_API_URL") ?? "http://localhost:8080/api";
var apiKey = Environment.GetEnvironmentVariable("QORSTACK_API_KEY") ?? "YOUR_API_KEY";
var api = new QorstackApi(apiUrl, apiKey);

var request = new PdfFromTemplateRequest
{
    TemplateKey = "invoice-q4",
    FileName = "invoice-101",
    Replace = new List<KeyValueRequest>
    {
        new KeyValueRequest { Key = "customer_name", Value = "John Doe" }
    }
};

var response = await api.PostRenderWordTemplateAsync(request);
var downloadUrl = response.DownloadUrl;
```

## Async renders (Pro)

Send `"async": true` (optional `"webhookUrl"`) to queue the render. The API answers `202`
`{ jobId, status: "pending", statusUrl }`; poll `GET /render/jobs/{jobId}` until `status` is
`success` (then `downloadUrl` is set) or `failed` (`errorMessage`). `429` with `Retry-After`
means too many of your async renders are still pending.

| | Node.js | .NET |
|---|---|---|
| Render (200 or 202) | `api.renderWord(req)` / `api.renderExcel(req)` → `{ kind: "download" \| "queued" }` | `RenderWordAsync` / `RenderExcelAsync` → `RenderOutcome<T>` (`Download` / `Job`) |
| Job status | `api.getRenderJob(jobId)` | `GetRenderJobAsync(jobId)` |
| Wait until done | `api.waitForJob(jobId, { intervalMs, timeoutMs })` | `WaitForJobAsync(jobId, pollInterval, timeout)` |
| 429 | `RenderQueueFullError.retryAfterSeconds` | `RenderQueueFullException.RetryAfter` |
| Job failed | `RenderJobFailedError.job` | `RenderJobFailedException.Job` |

