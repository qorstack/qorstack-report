# Qorstack Report SDK

The official SDK for **Qorstack Report** — a REST API for generating **PDF**, **DOCX**, and **XLSX** reports from Microsoft Word and Excel templates.
This SDK simplifies integration into your **Node.js** and **.NET** applications.

## Features

- **Word template rendering** — generate PDF or DOCX from a stored DOCX template.
- **Excel template rendering** — generate XLSX from a stored XLSX template (Excel in, Excel out), with auto-filter, freeze header, table styles, and conditional formatting.
- **Sandbox rendering** — render a template using its configured sample payload (great for previews).
- **Render job history** — list and inspect past render jobs.
- **Rich data binding:**
  - Text replacement
  - Dynamic tables (with vertical merge / column collapse on Word; auto-filter / freeze / split-to-sheets on Excel)
  - Images (URL or Base64)
  - QR codes and barcodes
- **Pro features** *(require a Pro license on your Qorstack Report server)*:
  - PDF password protection
  - PDF watermarking
  - Async renders with webhooks (`async: true`, then poll or `waitForJob`)
  - Zip output — the rendered file inside a `.zip`
- **Cross-platform** — fully typed clients for TypeScript/Node.js and C#/.NET 8.0+.

---

## Installation

### Node.js (TypeScript/JavaScript)

```bash
npm install qorstack-report-sdk
# or
pnpm add qorstack-report-sdk
```

### .NET (C#)

```bash
dotnet add package Qorstack.Report.Sdk
```

---

## Authentication

You need an **API key** from your Qorstack Report server (one per project).

1. Sign in to the web UI of your Qorstack Report server.
2. Open the project, then **API key** in the sidebar.
3. Copy the key and send it as the `X-API-Key` header.

---

## Getting Started

### Node.js Setup

```typescript
import { QorstackApi } from "qorstack-report-sdk";

// Initialize the client with API Key
const qorstackApi = new QorstackApi({
  securityData: {
    headers: {
      "X-API-Key": "YOUR_API_KEY_HERE",
    },
  },
});

// OR: with custom Base URL (e.g. self-hosted instance)
const qorstackApiCustom = new QorstackApi({
  baseUrl: "https://your-host/api", // v2: the API lives under /api (appended automatically if missing)
  securityData: {
    headers: {
      "X-API-Key": "YOUR_API_KEY_HERE",
    },
  },
});
```

### .NET Setup

```csharp
using Qorstack.Report.Sdk;

// Initialize with API Key
var qorstackApi = new QorstackApi(apiKey: "YOUR_API_KEY_HERE");

// OR: with custom Base URL
var qorstackApiCustom = new QorstackApi("https://your-host/api", "YOUR_API_KEY_HERE"); // /api appended if missing
```

---

## Usage Examples

### 1. Render Word/PDF from template (`PdfFromTemplateRequest`)

Endpoint: `POST /render/word/template`
Method: `render.postRenderWordTemplate` (Node) / `PostRenderWordTemplateAsync` (.NET)

Use `fileType: "pdf"` (default) to get a PDF, or `"docx"` to get the rendered Word document.

#### Full feature example (text, table, image, QR, barcode)

```typescript
// Node.js (TypeScript)
// Column names ({{row:<name>}} markers) are listed once; each row holds the values in that order
const columns = ["no", "category", "description", "qty", "unit_price", "amount"];
const tableRows = data.map((item, index) => [
  index + 1, item.category, item.description, item.quantity, item.price, item.total,
]);

const response = await qorstackApi.render.postRenderWordTemplate({
  templateKey: "RENDOX-7326-758-974-2067",
  fileName: "Full_Report_Example",
  fileType: "pdf", // "pdf" | "docx"
  replace: [
    { key: "customer_name", value: "Example Company Ltd." },
    { key: "document_date", value: new Date().toLocaleDateString("en-GB") },
    { key: "total_amount", value: "1,500.00" },
  ],
  table: [
    {
      columns,
      rows: tableRows,
      verticalMerge: ["category"],
      collapse: ["description"],
    },
  ],
  image: [
    { key: "header_logo", src: "https://example.com/logo.png", width: 200, fit: "contain" },
  ],
  qrcode: [
    { key: "payment_qr", text: "https://payment.link/123456", size: 150 },
  ],
  barcode: [
    { key: "product_barcode", text: "PROD-123456789", format: "Code128", width: 300, height: 80 },
  ],
});

console.log("Download URL:", response.data.downloadUrl);
```

```csharp
// C# (.NET)
var data = await _exampleService.GetDataAsync(id);

// Column names ({{row:<name>}} markers) are listed once; each row holds the values in that order
var columns = new List<string> { "no", "category", "description", "qty", "unit_price", "amount" };
var tableRows = data.Select((item, index) => (ICollection<object>)new List<object>
{
    index + 1, item.Category, item.Description, item.Quantity, item.Price, item.Total
}).ToList();

var request = new PdfFromTemplateRequest
{
    TemplateKey = "RENDOX-7326-758-974-2067",
    FileName = "Full_Report_Example",
    FileType = PdfFromTemplateRequestFileType.Pdf,
    Replace = new List<KeyValueRequest>
    {
        new KeyValueRequest { Key = "customer_name", Value = "Example Company Ltd." },
        new KeyValueRequest { Key = "document_date", Value = DateTime.Now.ToString("dd/MM/yyyy") },
        new KeyValueRequest { Key = "total_amount", Value = "1,500.00" }
    },
    Table = new()
    {
        new()
        {
            Columns = columns,
          Rows = tableRows,
            VerticalMerge = new() { "category" },
            Collapse = new() { "description" }
        }
    },
    Image = new List<ImageDataRequest>
    {
        new ImageDataRequest { Key = "header_logo", Src = "https://example.com/logo.png", Width = 200, Fit = ImageDataRequestFit.Contain }
    },
    Qrcode = new List<QrCodeDataRequest>
    {
        new QrCodeDataRequest { Key = "payment_qr", Text = "https://payment.link/123456", Size = 150 }
    },
    Barcode = new List<BarcodeDataRequest>
    {
        new BarcodeDataRequest { Key = "product_barcode", Text = "PROD-123456789", Format = "Code128", Width = 300, Height = 80 }
    }
};

var response = await qorstackApi.PostRenderWordTemplateAsync(request);
Console.WriteLine($"Download URL: {response.DownloadUrl}");
```

---

### 2. Render Excel from template (`ExcelFromTemplateRequest`)

Endpoint: `POST /render/excel/template`
Method: `render.postRenderExcelTemplate` (Node) / `PostRenderExcelTemplateAsync` (.NET)

```typescript
// Node.js (TypeScript)
const response = await qorstackApi.render.postRenderExcelTemplate({
  templateKey: "XLSX-1234-5678",
  fileName: "Sales_Report_Q1",
  replace: [
    { key: "report_period", value: "Q1 2026" },
    { key: "generated_by", value: "Sales Team" },
  ],
  table: [
    {
      columns: ['region', 'product', 'qty', 'total'],
      rows: [
        ['North', 'A', 10, 1000],
        ['North', 'B', 5, 500],
        ['South', 'A', 8, 800]
      ],
      autoFilter: true,
      freezeHeader: true,
      autoFitColumns: true,
      asExcelTable: true,
      excelTableStyle: "TableStyleMedium2",
      generateTotals: [
        { key: "total", value: "SUM" },
        { key: "qty", value: "SUM" },
      ],
      numberFormat: [{ key: "total", value: "#,##0.00" }],
    },
  ],
});

console.log("Download URL:", response.data.downloadUrl);
```

```csharp
// C# (.NET)
var request = new ExcelFromTemplateRequest
{
    TemplateKey = "XLSX-1234-5678",
    FileName = "Sales_Report_Q1",
    Replace = new List<KeyValueRequest>
    {
        new KeyValueRequest { Key = "report_period", Value = "Q1 2026" },
        new KeyValueRequest { Key = "generated_by", Value = "Sales Team" }
    },
    Table = new List<ExcelTableDataRequest>
    {
        new ExcelTableDataRequest
        {
            Columns = new List<string> { "region", "product", "qty", "total" },
            Rows = new List<ICollection<object>>
            {
                new List<object> { "North", "A", 10, 1000 },
                new List<object> { "North", "B", 5, 500 },
                new List<object> { "South", "A", 8, 800 }
            },
            AutoFilter = true,
            FreezeHeader = true,
            AutoFitColumns = true,
            AsExcelTable = true,
            ExcelTableStyle = "TableStyleMedium2",
            GenerateTotals = new List<KeyValueRequest>
            {
                new KeyValueRequest { Key = "total", Value = "SUM" },
                new KeyValueRequest { Key = "qty", Value = "SUM" }
            },
            NumberFormat = new List<KeyValueRequest> { new KeyValueRequest { Key = "total", Value = "#,##0.00" } }
        }
    }
};

var response = await qorstackApi.PostRenderExcelTemplateAsync(request);
```

---

### 3. PDF password protection *(Pro)*

```typescript
const response = await qorstackApi.render.postRenderWordTemplate({
  templateKey: "RENDOX-7326-758-974-2067",
  fileName: "Confidential_Report",
  fileType: "pdf",
  pdfPassword: {
    userPassword: "open-me",
    ownerPassword: "owner-secret",
    restrictPrinting: true,
    restrictCopying: true,
    restrictModifying: true,
  },
});
```

---

### 4. PDF watermark *(Pro)*

```typescript
const response = await qorstackApi.render.postRenderWordTemplate({
  templateKey: "RENDOX-7326-758-974-2067",
  fileName: "Draft_Report",
  fileType: "pdf",
  watermark: {
    text: "DRAFT",
    fontSize: 72,
    fontFamily: "Arial",
  },
});
```

---

### 5. Sandbox render (preview using template's sample payload)

Endpoint: `POST /render/word/template-sandbox/{templateKey}`
Useful for previewing a template without supplying real data.

```typescript
const response = await qorstackApi.render.postRenderWordTemplateSandbox(
  "RENDOX-7326-758-974-2067",
  { fileName: "Preview" },
  /* body */ null, // or a JSON object to override the sandbox payload
);
```

---

### 6. Async renders *(Pro)* and job status

With `"async": true` the API queues the render and answers `202` with a job id instead of the file.
Use the helpers below — they handle both answers, poll the job, and turn `429` (too many pending
jobs) into a typed error. Without a Pro license the API answers `403`.

```typescript
import { QorstackApi, RenderQueueFullError } from "qorstack-report-sdk";

const outcome = await qorstackApi.renderWord({ templateKey: "invoice", async: true, replace: [/* … */] });

if (outcome.kind === "queued") {
  const job = await qorstackApi.waitForJob(outcome.job.jobId!, { intervalMs: 2000, timeoutMs: 600_000 });
  console.log(job.downloadUrl); // fresh link once status is "success"
} else {
  console.log(outcome.download.downloadUrl); // rendered in this request (async not set)
}

// const job = await qorstackApi.getRenderJob(jobId);   // single status check
// catch (e) { if (e instanceof RenderQueueFullError) retry after e.retryAfterSeconds }
```

```csharp
var outcome = await qorstackApi.RenderWordAsync(new PdfFromTemplateRequest { TemplateKey = "invoice", Async = true });

var link = outcome.IsQueued
    ? (await qorstackApi.WaitForJobAsync(outcome.Job!.JobId, TimeSpan.FromSeconds(2), TimeSpan.FromMinutes(10))).DownloadUrl
    : outcome.Download!.DownloadUrl;

// RenderQueueFullException.RetryAfter on 429 · RenderJobFailedException when the job fails
// var job = await qorstackApi.GetRenderJobAsync(jobId);
```

`renderWord` / `renderExcel` (`RenderWordAsync` / `RenderExcelAsync`) also work without `async` —
they then always return the download. The generated `render.postRender…` methods stay available.

---

## Data Binding Reference

`replace`, `image`, `qrcode` and `barcode` are **keyed arrays**: every item names the
template marker it fills via `key` (SDK types: `KeyValueRequest`, `ImageDataRequest`,
`QrCodeDataRequest`, `BarcodeDataRequest`). Tables list their column names once in
`columns`; each row in `rows` holds the values in that order.

The API validates the whole request first and returns every problem in one `400`,
keyed by JSON path (`replace[3].key`, `table[0].rows[12]`, `image[0].fit`).

Set `templateVersion` to render an older stored version of the template (omit it for the
current version; an unknown version returns `404`).

> **SDK 1.0 / API v2.0:** the v1 forms were removed and now return `400`: object maps
> (`"replace": { "customerName": "..." }`), rows as objects or `{ key, value }` cells,
> single-string `sort` / `verticalMerge` / `collapse`, and `fileType` on the Excel endpoint.
> Upgrading from SDK 0.x? See
> [Migrating from v1](../backend/documents/10_RENDER-API-SUMMARY.md#migrating-from-v1).

### Text replacement (`replace`)

Replaces `{{variable}}` placeholders with strings (`KeyValueRequest[]`).

```json
"replace": [
  { "key": "customerName", "value": "Acme Corp" },
  { "key": "totalAmount", "value": "$1,050.00" }
]
```

### Word table (`table` — `WordTableDataRequest[]`)

```json
"table": [
  {
    "columns": ["category", "description", "amount"],
    "rows": [
      ["Hardware", "Laptop", 1200],
      ["Hardware", "Monitor", 300]
    ],
    "verticalMerge": ["category"],
    "collapse": ["description"]
  }
]
```

| Field | Description |
| --- | --- |
| `columns` | Column names, listed once — each matches a `{{row:<name>}}` placeholder. Unique; required when there are rows. |
| `rows` | Array of rows; each row is an array of values in `columns` order (string, number, boolean or null). A row with the wrong number of values returns `400` naming the row. |
| `sort` | `[{ "field": column, "direction": "asc" \| "desc" }]`. |
| `verticalMerge` | Columns whose adjacent identical values are merged vertically. |
| `collapse` | Columns whose empty/duplicate values collapse to keep layout tidy. |

### Excel table (`table` — `ExcelTableDataRequest[]`)

```json
"table": [
  {
    "columns": ["region", "qty"],
    "rows": [
      ["North", 10]
    ],
    "autoFilter": true,
    "freezeHeader": true,
    "autoFitColumns": true,
    "asExcelTable": true,
    "excelTableStyle": "TableStyleMedium2",
    "generateTotals": [ { "key": "qty", "value": "SUM" } ],
    "numberFormat": [ { "key": "qty", "value": "#,##0" } ]
  }
]
```

| Field | Description |
| --- | --- |
| `autoFilter` | Enable Excel auto-filter on the header row. |
| `freezeHeader` | Freeze the header row. |
| `autoFitColumns` | Auto-fit column widths to content. |
| `asExcelTable` / `excelTableStyle` | Render as native Excel table with style. |
| `generateTotals` | Per-column aggregation: `[{ "key": column, "value": "SUM" }]` (`SUM`, `AVERAGE`, `COUNT`, `MIN`, `MAX`). |
| `numberFormat` | Excel number format per column: `[{ "key": column, "value": "#,##0.00" }]`. |
| `conditionalFormat` | Conditional formatting rules. |
| `splitToSheets` | Split rows into multiple sheets by a column value. |
| `sort` | Sort rows before render. |

### Images (`image`)

Replaces `{{image:logo}}`. Accepts URL or Base64.

```json
"image": [
  {
    "key": "logo",
    "src": "https://example.com/logo.png",
    "width": 150,
    "height": 50,
    "fit": "contain"
  }
]
```

### QR codes (`qrcode`)

Replaces `{{qr:website}}`.

```json
"qrcode": [
  {
    "key": "website",
    "text": "https://qorstack.dev",
    "size": 200,
    "color": "#000000"
  }
]
```

### Barcodes (`barcode`)

Replaces `{{barcode:productId}}`. Default format: `Code128`.

```json
"barcode": [
  {
    "key": "productId",
    "text": "1234567890",
    "format": "Code128",
    "includeText": true,
    "width": 300,
    "height": 80
  }
]
```

### Output options

| Field | Type | Description |
| --- | --- | --- |
| `fileName` | string | Output file name (without extension). |
| `templateVersion` | integer | Render this stored version of the template; omit for the current version (unknown → `404`). |
| `fileType` | string | Word only: `"pdf"` (default) or `"docx"`. |
| `zipOutput` | boolean | If `true`, bundle the output into a `.zip` archive. |
| `pdfPassword` | object | *(Pro)* Encrypt the PDF and set permissions. |
| `watermark` | object | *(Pro)* Apply a text watermark to the PDF. |

---

## Response shape

All render endpoints return a download URL plus metadata:

```jsonc
{
  "downloadUrl": "https://.../output.pdf",
  "fileName": "Full_Report_Example.pdf",
  "fileSize": 102400,
  "fileType": "pdf",
  "status": "Success",
  "isZipped": false
}
```

---

## Error Handling

The SDK throws when the API returns 4xx/5xx (`ProblemDetails` payload).

- **Node.js** — the promise rejects; `error.error` contains the `ProblemDetails` body.
- **.NET** — `ApiException<ProblemDetails>` is thrown; access `ex.Result` for the body.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
