# Qorstack Report SDK

The official SDK for **Qorstack Report** — a REST API for generating **PDF**, **DOCX**, and **XLSX** reports from Microsoft Word and Excel templates.
This SDK simplifies integration into your **Node.js** and **.NET** applications.

## Features

- **Word template rendering** — generate PDF or DOCX from a stored DOCX template.
- **Excel template rendering** — generate XLSX (or PDF) from a stored XLSX template, with auto-filter, freeze header, table styles, and conditional formatting.
- **Sandbox rendering** — render a template using its configured sample payload (great for previews).
- **Render job history** — list and inspect past render jobs.
- **Rich data binding:**
  - Text replacement
  - Dynamic tables (with vertical merge / column collapse on Word; auto-filter / freeze / split-to-sheets on Excel)
  - Images (URL or Base64)
  - QR codes and barcodes
- **Pro features** *(requires Pro license on self-hosted, included on cloud Pro plans)*:
  - PDF password protection
  - PDF watermarking
- **Zip output** — bundle multiple output files into a `.zip`.
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

You need an **API Key** from the Qorstack Portal.

1. Log in to the Qorstack Portal.
2. Navigate to **Settings → API Keys**.
3. Create a new API Key (scoped per project).

---

## Getting Started

### Node.js Setup

```typescript
import { QorstackApi } from "qorstack-report-sdk";

// Initialize the client with API Key
const qorstackApi = new QorstackApi({
  securityData: {
    headers: {
      "X-API-KEY": "YOUR_API_KEY_HERE",
    },
  },
});

// OR: with custom Base URL (e.g. self-hosted instance)
const qorstackApiCustom = new QorstackApi({
  baseUrl: "https://your-custom-url.com",
  securityData: {
    headers: {
      "X-API-KEY": "YOUR_API_KEY_HERE",
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
var qorstackApiCustom = new QorstackApi("https://your-custom-url.com", "YOUR_API_KEY_HERE");
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
const tableRows = data.map((item, index) => ({
  no: index + 1,
  category: item.category,
  description: item.description,
  qty: item.quantity,
  unit_price: item.price,
  amount: item.total,
}));

const response = await qorstackApi.render.postRenderWordTemplate({
  templateKey: "RENDOX-7326-758-974-2067",
  fileName: "Full_Report_Example",
  fileType: "pdf", // "pdf" | "docx"
  replace: {
    customer_name: "Example Company Ltd.",
    document_date: new Date().toLocaleDateString("en-GB"),
    total_amount: "1,500.00",
  },
  table: [
    {
      rows: tableRows,
      verticalMerge: ["category"],
      collapse: ["description"],
    },
  ],
  image: {
    header_logo: {
      src: "https://example.com/logo.png",
      width: 200,
      fit: "contain",
    },
  },
  qrcode: {
    payment_qr: {
      text: "https://payment.link/123456",
      size: 150,
    },
  },
  barcode: {
    product_barcode: {
      text: "PROD-123456789",
      format: "Code128",
      width: 300,
      height: 80,
    },
  },
});

console.log("Download URL:", response.data.downloadUrl);
```

```csharp
// C# (.NET)
var data = await _exampleService.GetDataAsync(id);

var tableRows = data.Select((item, index) => new Dictionary<string, object>
{
    { "no", index + 1 },
    { "category", item.Category },
    { "description", item.Description },
    { "qty", item.Quantity },
    { "unit_price", item.Price },
    { "amount", item.Total }
}).ToList();

var request = new PdfFromTemplateRequest
{
    TemplateKey = "RENDOX-7326-758-974-2067",
    FileName = "Full_Report_Example",
    FileType = "pdf",
    Replace = new()
    {
        { "customer_name", "Example Company Ltd." },
        { "document_date", DateTime.Now.ToString("dd/MM/yyyy") },
        { "total_amount", "1,500.00" }
    },
    Table = new()
    {
        new()
        {
            Rows = tableRows,
            VerticalMerge = new() { "category" },
            Collapse = new() { "description" }
        }
    },
    Image = new()
    {
        { "header_logo", new() { Src = "https://example.com/logo.png", Width = 200, Fit = "contain" } }
    },
    QrCode = new()
    {
        { "payment_qr", new() { Text = "https://payment.link/123456", Size = 150 } }
    },
    Barcode = new()
    {
        { "product_barcode", new() { Text = "PROD-123456789", Format = "Code128", Width = 300, Height = 80 } }
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
  replace: {
    report_period: "Q1 2026",
    generated_by: "Sales Team",
  },
  table: [
    {
      rows: [
        { region: "North", product: "A", qty: 10, total: 1000 },
        { region: "North", product: "B", qty: 5, total: 500 },
        { region: "South", product: "A", qty: 8, total: 800 },
      ],
      autoFilter: true,
      freezeHeader: true,
      autoFitColumns: true,
      asExcelTable: true,
      excelTableStyle: "TableStyleMedium2",
      generateTotals: { total: "sum", qty: "sum" },
      numberFormat: { total: "#,##0.00" },
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
    Replace = new()
    {
        { "report_period", "Q1 2026" },
        { "generated_by", "Sales Team" }
    },
    Table = new()
    {
        new()
        {
            Rows = new()
            {
                new Dictionary<string, object> { { "region", "North" }, { "product", "A" }, { "qty", 10 }, { "total", 1000 } },
                new Dictionary<string, object> { { "region", "North" }, { "product", "B" }, { "qty", 5 },  { "total", 500 } },
                new Dictionary<string, object> { { "region", "South" }, { "product", "A" }, { "qty", 8 },  { "total", 800 } }
            },
            AutoFilter = true,
            FreezeHeader = true,
            AutoFitColumns = true,
            AsExcelTable = true,
            ExcelTableStyle = "TableStyleMedium2",
            GenerateTotals = new() { { "total", "sum" }, { "qty", "sum" } },
            NumberFormat = new() { { "total", "#,##0.00" } }
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

### 6. Inspect render jobs

```typescript
// List jobs
const jobs = await qorstackApi.render.getRenderJobs({
  page: 1,
  pageSize: 20,
  // templateKey: "...", status: "Success" | "Failed" | "Pending"
});

// Get one
const job = await qorstackApi.render.getRenderJobById("job-id-here");
```

---

## Data Binding Reference

### Text replacement (`replace`)

Replaces `{{variable}}` placeholders with strings.

```json
"replace": {
  "customerName": "Acme Corp",
  "totalAmount": "$1,050.00"
}
```

### Word table (`table` — `WordTableDataRequest[]`)

```json
"table": [
  {
    "rows": [
      { "name": "Value A", "last_name": "Value B" },
      { "name": "Value C", "last_name": "Value D" }
    ],
    "verticalMerge": ["category"],
    "collapse": ["description"]
  }
]
```

| Field | Description |
| --- | --- |
| `rows` | Array of row objects. Keys match column placeholders. |
| `verticalMerge` | Columns whose adjacent identical values are merged vertically. |
| `collapse` | Columns whose empty/duplicate values collapse to keep layout tidy. |

### Excel table (`table` — `ExcelTableDataRequest[]`)

```json
"table": [
  {
    "rows": [{ "region": "North", "qty": 10 }],
    "autoFilter": true,
    "freezeHeader": true,
    "autoFitColumns": true,
    "asExcelTable": true,
    "excelTableStyle": "TableStyleMedium2",
    "generateTotals": { "qty": "sum" },
    "numberFormat": { "qty": "#,##0" }
  }
]
```

| Field | Description |
| --- | --- |
| `autoFilter` | Enable Excel auto-filter on the header row. |
| `freezeHeader` | Freeze the header row. |
| `autoFitColumns` | Auto-fit column widths to content. |
| `asExcelTable` / `excelTableStyle` | Render as native Excel table with style. |
| `generateTotals` | Per-column aggregation (`sum`, `avg`, `count`, `min`, `max`). |
| `numberFormat` | Excel number format string per column. |
| `conditionalFormat` | Conditional formatting rules. |
| `splitToSheets` | Split rows into multiple sheets by a column value. |
| `sort` | Sort rows before render. |

### Images (`image`)

Replaces `{{image:logo}}`. Accepts URL or Base64.

```json
"image": {
  "logo": {
    "src": "https://example.com/logo.png",
    "width": 150,
    "height": 50,
    "fit": "contain"
  }
}
```

### QR codes (`qrcode`)

Replaces `{{qr:website}}`.

```json
"qrcode": {
  "website": {
    "text": "https://qorstack.dev",
    "size": 200,
    "color": "#000000"
  }
}
```

### Barcodes (`barcode`)

Replaces `{{barcode:productId}}`. Default format: `Code128`.

```json
"barcode": {
  "productId": {
    "text": "1234567890",
    "format": "Code128",
    "includeText": true,
    "width": 300,
    "height": 80
  }
}
```

### Output options

| Field | Type | Description |
| --- | --- | --- |
| `fileName` | string | Output file name (without extension). |
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
