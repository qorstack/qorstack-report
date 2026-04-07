# Qorstack Report SDK

The official SDK for Qorstack Report, a powerful API for generating PDF reports from Microsoft Word (DOCX) templates.
This SDK simplifies the integration of Qorstack Report into your **Node.js** and **.NET** applications.

## Features

- **Template-Based Rendering**: Generate PDFs from templates stored in your Qorstack Report account.
- **Dynamic File Rendering**: Generate PDFs directly from a base64-encoded DOCX file.
- **Comprehensive Data Binding**:
  - Text replacement
  - Dynamic tables (with merge and collapse support)
  - Images (from URL or Base64)
  - QR Codes and Barcodes
  - Conditional logic (hide/show sections)
- **Cross-Platform Support**: Fully typed libraries for TypeScript/Node.js and C#/.NET 8.0+.

---

## Installation

### Node.js (TypeScript/JavaScript)

```bash
npm install qorstack-report-sdk
# or
yarn add qorstack-report-sdk
```

### .NET (C#)

```bash
dotnet add package Qorstack.Report.Sdk
```

---

## Authentication

To use the SDK, you need an **API Key** from the Qorstack Portal.

1. Log in to the Qorstack Portal.
2. Navigate to **Settings > API Keys**.
3. Create a new API Key.

---

## Getting Started

### Node.js Setup

```typescript
import { QorstackApi } from "qorstack-report-sdk";

// 1. Initialize the client with API Key
const qorstackApi = new QorstackApi({
  securityData: {
    headers: {
      "X-API-KEY": "YOUR_API_KEY_HERE",
    },
  },
});

// OR: Initialize with custom Base URL and API Key
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
using System.Net.Http;

// 1. Initialize the Client with API Key
var qorstackApi = new QorstackApi(apiKey: "YOUR_API_KEY_HERE");

// OR: Initialize with custom Base URL and API Key
var qorstackApiCustom = new QorstackApi("https://your-custom-url.com", "YOUR_API_KEY_HERE");
```

---

## Usage Examples

This section demonstrates how to construct request objects for various scenarios.

### 1. Generate PDF from Template (`PdfFromTemplateRequest`)

This is the most common use case. You reference a `templateKey` stored in the system.

#### Full Feature Example (Text, Table, Image, QR, Barcode)

**Node.js (TypeScript)**

```typescript
// Prepare table rows
const tableRows = data.map((item, index) => ({
  no: index + 1,
  category: item.category,
  description: item.description,
  qty: item.quantity,
  unit_price: item.price,
  amount: item.total,
}));

const response = await qorstackApi.render.postRenderTemplatePdf({
  templateKey: "RENDOX-7326-758-974-2067",
  fileName: "Full_Report_Example",
  replace: {
    customer_name: "Example Company Ltd.",
    document_date: new Date().toLocaleDateString("en-GB"), // dd/MM/yyyy
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

**C# (.NET)**

```csharp
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

var response = await qorstackApi.PostRenderTemplatePdfAsync(request);
```

---

### 2. Generate PDF from File (`PdfFromFileRequest`)

Use this when you want to send the DOCX template file directly with the request.

**Node.js (TypeScript)**

```typescript
import * as fs from "fs";

// Read local file as Base64
const fileBuffer = fs.readFileSync("template.docx");
const base64File = fileBuffer.toString("base64");

const response = await qorstackApi.render.postRenderDocxPdf({
  fileBase64: base64File,
  fileName: "OnDemand_Report",
  replace: {
    title: "Report Title",
  },
  table: [
    {
      rows: [
        { item: "Item A", price: 100 },
        { item: "Item B", price: 200 },
      ],
    },
  ],
});
```

**C# (.NET)**

```csharp
byte[] fileBytes = await File.ReadAllBytesAsync("template.docx");

var request = new PdfFromFileRequest
{
    FileBase64 = Convert.ToBase64String(fileBytes),
    FileName = "OnDemand_Report",
    Replace = new()
    {
        { "title", "Report Title" }
    },
    Table = new()
    {
        new()
        {
            Rows = new()
            {
                new Dictionary<string, object> { { "item", "Item A" }, { "price", 100 } },
                new Dictionary<string, object> { { "item", "Item B" }, { "price", 200 } }
            }
        }
    }
};

var response = await qorstackApi.PostRenderDocxPdfAsync(request);
```

---

## Data Binding Reference

The Qorstack Report engine supports various data types. Here is how to structure your request object.

### Text Replacement (`replace`)

Simple key-value pairs to replace text placeholders like `{{customerName}}`.

```json
"replace": {
  "customerName": "Acme Corp",
  "totalAmount": "$1,050.00"
}
```

### Tables (`table`)

Populates rows in a table. The `rows` array contains objects where keys match the columns in your Word table.

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

### Images (`image`)

Replaces placeholders like `{{image:logo}}`. Supports URLs or Base64.

- `src`: Image URL or Base64 string.
- `width`, `height`: Optional dimensions in pixels.
- `fit`: Optional ("contain", "cover", "fill").

```json
"image": {
  "logo": {
    "src": "https://example.com/logo.png",
    "width": 150,
    "height": 50
  }
}
```

### QR Codes (`qrcode`)

Generates QR codes for placeholders like `{{qr:website}}`.

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

Generates barcodes for placeholders like `{{barcode:productId}}`.

- `format`: Default is "Code128".

```json
"barcode": {
  "productId": {
    "text": "1234567890",
    "format": "Code128",
    "includeText": true
  }
}
```

---

## Error Handling

The SDK throws exceptions when the API returns an error (e.g., 400 Bad Request, 401 Unauthorized).

- **Node.js**: The promise will reject with the error response.
- **.NET**: `ApiException` or `ApiException<ProblemDetails>` will be thrown. You can access `ex.Result` to get detailed error messages from the server.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
