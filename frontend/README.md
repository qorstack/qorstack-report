# Qorstack Report — Frontend

The web application for [Qorstack Report](https://qorstack.dev), a powerful API for generating PDF and Excel reports from Microsoft Word (DOCX) templates.

## Local development

No frontend env is needed. From the repo root: `cp .env.dev.example .env`, `make infra-up`, `make dev`,
then open http://localhost:3000. `pnpm dev` proxies `/api/*` to `DEV_BACKEND_URL` (root `.env`,
default `http://localhost:5000`). `frontend/.env.example` lists the optional Vercel/marketing variables only.

## SDK Integration

The frontend uses the official [`qorstack-report-sdk`](https://www.npmjs.com/package/qorstack-report-sdk) for type-safe API access.

### Installation

```bash
pnpm add qorstack-report-sdk
# or
npm install qorstack-report-sdk
```

### .NET (C#)

```bash
dotnet add package Qorstack.Report.Sdk
```

---

## Authentication

To use the SDK, you need an **API Key** from the Qorstack Portal.

1. Log in to [Qorstack Portal](https://qorstack.dev).
2. Navigate to **Settings > API Keys**.
3. Create a new API Key.

---

## Getting Started

### Node.js Setup

```typescript
import { QorstackApi } from 'qorstack-report-sdk'

// 1. Initialize the client
// By default, it connects to http://localhost:8080/api/api
const qorstackApi = new QorstackApi({
  // baseUrl: "https://your-custom-url.com" // Optional: Override Base URL
})

// 2. Set your API Key
qorstackApi.setSecurityData({
  headers: {
    'X-API-KEY': 'YOUR_API_KEY_HERE'
  }
})
```

### .NET Setup

```csharp
using Qorstack.Report.Sdk;
using System.Net.Http;

// 1. Configure HttpClient with your API Key
var httpClient = new HttpClient();
httpClient.DefaultRequestHeaders.Add("X-API-KEY", "YOUR_API_KEY_HERE");

// 2. Initialize the Client
// By default, it connects to http://localhost:8080
var qorstackApi = new QorstackApi(httpClient: httpClient);

// Optional: Override Base URL
// var qorstackApi = new QorstackApi("https://your-custom-url.com", httpClient);
```

---

## Usage Guide

### 1. Generate PDF from Saved Template

Use `postRenderTemplatePdf` when you have already uploaded a DOCX template to Qorstack Report.

**Node.js Example:**

```typescript
try {
  const data = await mockService.getExamplesAsync(123)

  // Column names ({{row:<name>}} markers) are listed once; each row holds the values in that order
  const columns = ['description', 'quantity', 'price']
  const tableRows = data.map(item => [item.description, item.quantity, item.price])

  const response = await qorstackApi.render.postRenderTemplatePdf({
    templateKey: 'invoice-template-v1',
    fileName: 'Invoice-INV001',
    replace: [
      { key: 'customerName', value: 'John Doe' },
      { key: 'invoiceNumber', value: 'INV-001' },
      { key: 'date', value: '2023-10-25' }
    ],
    table: [
      {
        columns,
        rows: tableRows
      }
    ]
  })

  console.log('Success! Download PDF here:', response.data.downloadUrl)
} catch (error) {
  console.error('Error generating PDF:', error)
}
```

**C# Example:**

```csharp
var data = await _exampleService.GetDataAsync(id);

// Column names ({{row:<name>}} markers) are listed once; each row holds the values in that order
var columns = new List<string> { "no", "category", "description", "qty", "unit_price", "amount" };
var tableRows = data.Select((item, index) => (ICollection<object>)new List<object>
{
    index + 1, item.Category, item.Description, item.Quantity, item.Price, item.Total
}).ToList();

var request = new PdfFromTemplateRequest
{
    TemplateKey = "QORSTACK-7326-758-974-2067",
    FileName = "Full_Report_Example",
    Replace = new List<KeyValueRequest>
    {
        new KeyValueRequest { Key = "customer_name", Value = "บริษัท ตัวอย่าง จำกัด" },
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
```

### 2. Generate PDF from DOCX File (On-the-fly)

Use `postRenderDocxPdf` to send raw DOCX content (as Base64) per request.

**Node.js Example:**

```typescript
import * as fs from 'fs'

const fileBuffer = fs.readFileSync('./my-template.docx')
const base64File = fileBuffer.toString('base64')

const response = await qorstackApi.render.postRenderDocxPdf({
  fileBase64: base64File,
  fileName: 'Dynamic-Report',
  replace: [{ key: 'title', value: 'Monthly Report' }]
})
```

**C# Example:**

```csharp
var fileBytes = await File.ReadAllBytesAsync("./my-template.docx");
var base64File = Convert.ToBase64String(fileBytes);

var response = await qorstackApi.PostRenderDocxPdfAsync(new PdfFromFileRequest
{
    FileBase64 = base64File,
    FileName = "Dynamic-Report",
    Replace = new List<KeyValueRequest>
    {
        new KeyValueRequest { Key = "title", Value = "Monthly Report" }
    }
});
```

---

## Data Binding Reference

`replace`, `table`, `image`, `qrcode` and `barcode` are **keyed arrays**: every item
names the template marker it fills via `key`. Duplicate or empty keys return `400`.
The v1 object-map form (`"replace": { "customerName": "..." }`) was removed in v2.0 and
now returns `400` with the field name.

### Text Replacement (`replace`)

```json
"replace": [
  { "key": "customerName", "value": "Acme Corp" },
  { "key": "totalAmount", "value": "$1,050.00" }
]
```

### Tables (`table`)

```json
"table": [
  {
    "columns": ["name", "last_name"],
    "rows": [
      ["Value A", "Value B"],
      ["Value C", "Value D"]
    ]
  }
]
```

### Images (`image`)

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

### QR Codes (`qrcode`)

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

```json
"barcode": [
  {
    "key": "productId",
    "text": "1234567890",
    "format": "Code128",
    "includeText": true
  }
]
```

### Conditional Logic (`condition`)

```json
"condition": {
  "isPaid": true,
  "hasDiscount": false
}
```

---

## Error Handling

- **Node.js**: The promise rejects with the error response.
- **.NET**: `ApiException` or `ApiException<ProblemDetails>` is thrown. Access `ex.Result` for detailed error messages.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
