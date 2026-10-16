import { getSdkCodeExamples } from '@/utils/code-gen'
import type { CodeExamples } from '@/utils/code-gen'
import { UiState, DEFAULT_UI_STATE, convertFromUiState } from '@/utils/template-converter'
import { generateId } from '@/components/pdf/SandboxInputs'
import { PdfFromTemplateRequest } from '@/types/pdf-sandbox'

type Endpoint = 'template'

export const getInstallCommand = (lang: 'ts' | 'csharp') => {
  if (lang === 'ts') return `npm install qorstack-report-sdk\n# or\npnpm add qorstack-report-sdk`
  return `dotnet add package Qorstack.Report.Sdk`
}

export const getInitClient = (lang: 'ts' | 'csharp') => {
  if (lang === 'ts')
    return `import { QorstackApi } from "qorstack-report-sdk";

const qorstackApi = new QorstackApi({
  baseUrl: process.env.QORSTACK_API_URL || "http://localhost:8080/api",
  securityData: {
    headers: {
      "X-API-Key": process.env.QORSTACK_API_KEY || "YOUR_API_KEY"
    }
  }
});`
  return `using Qorstack.Report.Sdk;

var apiUrl = Environment.GetEnvironmentVariable("QORSTACK_API_URL") ?? "http://localhost:8080/api";
var apiKey = Environment.GetEnvironmentVariable("QORSTACK_API_KEY") ?? "YOUR_API_KEY";
var qorstackApi = new QorstackApi(apiUrl, apiKey);`
}

const createExampleState = (overrides: Partial<UiState>): UiState => ({
  ...DEFAULT_UI_STATE,
  ...overrides
})

const processRequest = (state: UiState, _endpoint: Endpoint): PdfFromTemplateRequest => {
  const request = convertFromUiState(state)
  request.templateKey = 'YOUR_TEMPLATE_KEY'
  return request as PdfFromTemplateRequest
}

export const getRequestExamples = (endpoint: Endpoint): CodeExamples => {
  const state = createExampleState({
    fileName: 'sales_report_2026',
    replace: [
      { id: generateId(), key: '{{report_date}}', value: '2026-05-20' },
      { id: generateId(), key: '{{prepared_by}}', value: 'Operations Team' }
    ],
    table: [
      {
        id: generateId(),
        columns: ['{{row:item}}', '{{row:qty}}', '{{row:price}}'],
        rows: [
          { '{{row:item}}': 'Product A', '{{row:qty}}': '10', '{{row:price}}': '100' },
          { '{{row:item}}': 'Product B', '{{row:qty}}': '5', '{{row:price}}': '200' }
        ]
      }
    ],
    image: [
      {
        id: generateId(),
        key: '{{image:header_logo}}',
        data: {
          src: 'https://example.com/logo.png',
          width: 150,
          height: 50,
          fit: 'contain'
        }
      }
    ],
    qrcode: [
      {
        id: generateId(),
        key: '{{qrcode:scan_me}}',
        data: {
          text: 'https://qorstack.dev',
          size: 100
        }
      }
    ],
    barcode: [
      {
        id: generateId(),
        key: '{{barcode:order_id}}',
        data: {
          text: 'ORD-2026-001',
          format: 'Code128',
          width: 200,
          height: 50,
          includeText: true,
          color: '#111827',
          backgroundColor: '#FFFFFF'
        }
      }
    ],
    pdfPassword: {
      userPassword: 'viewer-pass',
      ownerPassword: 'owner-pass',
      restrictPrinting: true,
      restrictCopying: true,
      restrictModifying: true
    },
    watermark: {
      text: 'CONFIDENTIAL',
      fontSize: 48,
      fontFamily: 'Helvetica',
      fontWeight: 700,
      fontItalic: false,
      color: '#64748B',
      opacity: 0.14,
      rotation: -45,
      positionX: 'center',
      positionY: 'center',
      pages: [1]
    },
    zipOutput: false
  })
  return getSdkCodeExamples(processRequest(state, endpoint), { documentType: 'pdf' })
}

export const getVariableExamples = (endpoint: Endpoint): CodeExamples => {
  const state = createExampleState({
    fileName: 'invoice-2026-001',
    replace: [
      { id: generateId(), key: '{{customer_name}}', value: 'Acme Co., Ltd.' },
      { id: generateId(), key: '{{invoice_number}}', value: 'INV-2026-001' },
      { id: generateId(), key: '{{issue_date}}', value: '2026-05-20' },
      { id: generateId(), key: '{{due_date}}', value: '2026-06-20' },
      { id: generateId(), key: '{{subtotal}}', value: '7200' },
      { id: generateId(), key: '{{tax}}', value: '504' },
      { id: generateId(), key: '{{total}}', value: '7704' },
      { id: generateId(), key: '{{notes}}', value: 'Generated from the current render API.' }
    ]
  })
  return getSdkCodeExamples(processRequest(state, endpoint), { documentType: 'pdf' })
}

export const getTableExamples = (endpoint: Endpoint): CodeExamples => {
  const state = createExampleState({
    fileName: 'product-catalog',
    table: [
      {
        id: generateId(),
        columns: ['{{row:category}}', '{{row:name}}', '{{row:stock}}', '{{row:price}}'],
        rows: [
          {
            '{{row:category}}': 'Electronics',
            '{{row:name}}': 'Laptop Pro',
            '{{row:stock}}': '15',
            '{{row:price}}': '1200'
          },
          {
            '{{row:category}}': 'Electronics',
            '{{row:name}}': 'Wireless Mouse',
            '{{row:stock}}': '50',
            '{{row:price}}': '25'
          },
          {
            '{{row:category}}': 'Furniture',
            '{{row:name}}': 'Ergo Chair',
            '{{row:stock}}': '8',
            '{{row:price}}': '350'
          },
          {
            '{{row:category}}': 'Furniture',
            '{{row:name}}': 'Standing Desk',
            '{{row:stock}}': '12',
            '{{row:price}}': '500'
          }
        ],
        sort: [
          { field: 'category', direction: 'asc' },
          { field: 'price', direction: 'desc' }
        ],
        verticalMerge: ['category'],
        collapse: ['category']
      }
    ]
  })
  return getSdkCodeExamples(processRequest(state, endpoint), { documentType: 'pdf' })
}

export const getImageExamples = (endpoint: Endpoint): CodeExamples => {
  const state = createExampleState({
    fileName: 'company-profile',
    image: [
      {
        id: generateId(),
        key: '{{image:company_logo}}',
        data: {
          src: 'https://example.com/logo.png',
          width: 150,
          height: 50,
          fit: 'contain'
        }
      },
      {
        id: generateId(),
        key: '{{image:signature}}',
        data: {
          src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          width: 200,
          height: 100,
          fit: 'contain'
        }
      }
    ]
  })
  return getSdkCodeExamples(processRequest(state, endpoint), { documentType: 'pdf' })
}

export const getQrExamples = (endpoint: Endpoint): CodeExamples => {
  const state = createExampleState({
    fileName: 'ticket-001',
    qrcode: [
      {
        id: generateId(),
        key: '{{qrcode:ticket_qr}}',
        data: {
          text: 'https://event.com/ticket/123456',
          size: 200
        }
      },
      {
        id: generateId(),
        key: '{{qrcode:wifi_access}}',
        data: {
          text: 'WIFI:S:MyNetwork;T:WPA;P:password123;;',
          size: 150
        }
      }
    ]
  })
  return getSdkCodeExamples(processRequest(state, endpoint), { documentType: 'pdf' })
}

export const getBarcodeExamples = (endpoint: Endpoint): CodeExamples => {
  const state = createExampleState({
    fileName: 'inventory-label',
    barcode: [
      {
        id: generateId(),
        key: '{{barcode:sku_barcode}}',
        data: {
          text: 'SKU-99887766',
          format: 'Code128',
          width: 200,
          height: 60,
          includeText: true,
          color: '#111827',
          backgroundColor: '#FFFFFF'
        }
      },
      {
        id: generateId(),
        key: '{{barcode:serial_number}}',
        data: {
          text: 'SN-2026-001-X',
          format: 'Code128',
          width: 300,
          height: 80,
          includeText: true,
          color: '#111827',
          backgroundColor: '#FFFFFF'
        }
      }
    ]
  })
  return getSdkCodeExamples(processRequest(state, endpoint), { documentType: 'pdf' })
}

export const getFileSettingsExamples = (endpoint: Endpoint): CodeExamples => {
  const state = createExampleState({
    fileName: 'protected_contract',
    replace: [
      { id: generateId(), key: '{{customer_name}}', value: 'Acme Co., Ltd.' },
      { id: generateId(), key: '{{contract_date}}', value: '2026-05-20' }
    ],
    pdfPassword: {
      userPassword: 'viewer-pass',
      ownerPassword: 'owner-pass',
      restrictPrinting: true,
      restrictCopying: true,
      restrictModifying: true
    },
    watermark: {
      text: 'CONFIDENTIAL',
      fontSize: 48,
      fontFamily: 'Helvetica',
      fontWeight: 700,
      fontItalic: false,
      color: '#64748B',
      opacity: 0.14,
      rotation: -45,
      positionX: 'center',
      positionY: 'center',
      pages: [1, 2]
    },
    zipOutput: true
  })
  return getSdkCodeExamples(processRequest(state, endpoint), { documentType: 'pdf' })
}
