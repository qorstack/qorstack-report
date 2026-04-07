# Qorstack Report — Frontend

The web application for [Qorstack Report](https://qorstack.dev), a powerful API for generating PDF and Excel reports from Microsoft Word (DOCX) templates.

## SDK Integration

The frontend uses the official [`qorstack-report-sdk`](https://www.npmjs.com/package/qorstack-report-sdk) for type-safe API access.

### Installation

```bash
yarn add qorstack-report-sdk
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
// By default, it connects to https://api.qorstack.dev
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
// By default, it connects to https://api.qorstack.dev
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

  const tableRows = data.map(item => ({
    description: item.description,
    quantity: item.quantity,
    price: item.price
  }))

  const response = await qorstackApi.render.postRenderTemplatePdf({
    templateKey: 'invoice-template-v1',
    fileName: 'Invoice-INV001',
    replace: {
      customerName: 'John Doe',
      invoiceNumber: 'INV-001',
      date: '2023-10-25'
    },
    table: [
      {
        name: 'items',
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

var tableRows = data.Select((item, index) => new
{
    no = index + 1,
    category = item.Category,
    description = item.Description,
    qty = item.Quantity,
    unit_price = item.Price,
    amount = item.Total
}).ToList();

var request = new PdfFromTemplateRequest
{
    TemplateKey = "QORSTACK-7326-758-974-2067",
    FileName = "Full_Report_Example",
    Replace = new()
    {
        { "customer_name", "บริษัท ตัวอย่าง จำกัด" },
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
        {
            "header_logo",
            new() { Src = "https://example.com/logo.png", Width = 200, Fit = "contain" }
        }
    },
    QrCode = new()
    {
        {
            "payment_qr",
            new() { Text = "https://payment.link/123456", Size = 150 }
        }
    },
    Barcode = new()
    {
        {
            "product_barcode",
            new() { Text = "PROD-123456789", Format = "Code128", Width = 300, Height = 80 }
        }
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
  replace: {
    title: 'Monthly Report'
  }
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
    Replace = new()
    {
        { "title", "Monthly Report" }
    }
});
```

---

## Data Binding Reference

### Text Replacement (`replace`)

```json
"replace": {
  "customerName": "Acme Corp",
  "totalAmount": "$1,050.00"
}
```

### Tables (`table`)

```json
"table": [
  {
    "rows": [
      { "name": "Value A", "last_name": "Value B" },
      { "name": "Value C", "last_name": "Value D" }
    ]
  }
]
```

### Images (`image`)

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

### QR Codes (`qrcode`)

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

```json
"barcode": {
  "productId": {
    "text": "1234567890",
    "format": "Code128",
    "includeText": true
  }
}
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
