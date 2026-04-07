import { getSdkCodeExamples } from '@/utils/code-gen'
import type { CodeExamples } from '@/utils/code-gen'
import { UiState, DEFAULT_UI_STATE, convertFromUiState } from '@/utils/template-converter'
import { generateId } from '@/components/pdf/SandboxInputs'
import { PdfFromTemplateRequest } from '@/types/pdf-sandbox'

// Local type for docx-file-based generation (used in doc examples only)
interface PdfFromFileRequest extends Omit<PdfFromTemplateRequest, 'templateKey'> {
  fileBase64: string
}

type Endpoint = 'template' | 'docx'

export const getInstallCommand = (lang: 'ts' | 'csharp') => {
  if (lang === 'ts') return `npm install qorstack-sdk\n# or\nyarn add qorstack-sdk`
  return `dotnet add package Qorstack.Sdk`
}

export const getInitClient = (lang: 'ts' | 'csharp') => {
  if (lang === 'ts')
    return `import { QorstackApi } from "qorstack-sdk";\n\nconst qorstackApi = new QorstackApi();\nqorstackApi.setSecurityData({ headers: { "X-API-KEY": "YOUR_API_KEY" } });`
  return `using Qorstack.Sdk;\nusing System.Net.Http;\n\nvar httpClient = new HttpClient();\nhttpClient.DefaultRequestHeaders.Add("X-API-KEY", "YOUR_API_KEY");\nvar qorstackApi = new QorstackApi(httpClient);`
}

const createExampleState = (overrides: Partial<UiState>): UiState => ({
  ...DEFAULT_UI_STATE,
  ...overrides
})

const processRequest = (state: UiState, endpoint: Endpoint): PdfFromTemplateRequest | PdfFromFileRequest => {
  const request = convertFromUiState(state)
  if (endpoint === 'docx') {
    const { templateKey, conditions, ...rest } = request
    const fileRequest: PdfFromFileRequest = {
      ...rest,
      fileBase64: 'BASE64_STRING...'
    }
    return fileRequest
  } else {
    request.templateKey = 'YOUR_TEMPLATE_KEY'
    return request as PdfFromTemplateRequest
  }
}

export const getRequestExamples = (endpoint: Endpoint): CodeExamples => {
  const state = createExampleState({
    fileName: 'sales_report_2024',
    replace: [
      { id: generateId(), key: '{{report_date}}', value: '2024-03-20' },
      { id: generateId(), key: '{{prepared_by}}', value: 'Admin User' }
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
          text: 'ORD-2024-001',
          width: 200,
          height: 50
        }
      }
    ]
  })
  return getSdkCodeExamples(processRequest(state, endpoint))
}

export const getVariableExamples = (endpoint: Endpoint): CodeExamples => {
  const state = createExampleState({
    fileName: 'invoice-001',
    replace: [
      { id: generateId(), key: '{{customer_name}}', value: 'John Doe' },
      { id: generateId(), key: '{{invoice_number}}', value: 'INV-2024-001' },
      { id: generateId(), key: '{{issue_date}}', value: '2024-03-20' },
      { id: generateId(), key: '{{due_date}}', value: '2024-04-20' },
      { id: generateId(), key: '{{subtotal}}', value: '$1,000.00' },
      { id: generateId(), key: '{{tax}}', value: '$70.00' },
      { id: generateId(), key: '{{total}}', value: '$1,070.00' },
      { id: generateId(), key: '{{notes}}', value: 'Thank you for your business!' }
    ]
  })
  return getSdkCodeExamples(processRequest(state, endpoint))
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
  return getSdkCodeExamples(processRequest(state, endpoint))
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
  return getSdkCodeExamples(processRequest(state, endpoint))
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
  return getSdkCodeExamples(processRequest(state, endpoint))
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
          width: 200,
          height: 60
        }
      },
      {
        id: generateId(),
        key: '{{barcode:serial_number}}',
        data: {
          text: 'SN-2024-001-X',
          width: 300,
          height: 80
        }
      }
    ]
  })
  return getSdkCodeExamples(processRequest(state, endpoint))
}
