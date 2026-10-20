import type { CodeGenOptions } from './types'

const toLiteral = (value: unknown) => JSON.stringify(value, null, 2)

const getRequestType = (documentType: CodeGenOptions['documentType']) =>
  documentType === 'excel' ? 'ExcelFromTemplateRequest' : 'PdfFromTemplateRequest'

const getMethodName = (documentType: CodeGenOptions['documentType']) =>
  documentType === 'excel' ? 'postRenderExcelTemplate' : 'postRenderWordTemplate'

const getApiUrlExpression = (apiUrl?: string) => {
  const fallback =
    apiUrl && !apiUrl.includes('__NEXT_PUBLIC_SERVICE__') ? apiUrl : 'http://localhost:8080/api'
  return `process.env.QORSTACK_API_URL || '${fallback}'`
}

const getTableDataName = (index: number) => `table${index + 1}Data`
const getTableRowsName = (index: number) => `table${index + 1}Rows`

export const generateNodejsExample = (data: any, options: CodeGenOptions = {}): string => {
  const sdkData = normalizeSdkData(data)
  const requestType = getRequestType(options.documentType)
  const methodName = getMethodName(options.documentType)
  const apiUrl = getApiUrlExpression(options.apiUrl)
  const tableDataDeclarations = (sdkData.table || [])
    .map((table: any, index: number) => {
      if (!Array.isArray(table.rows) || table.rows.length === 0) return null
      return formatTableDataDeclaration(table, index)
    })
    .filter(Boolean)
    .join('\n')
  const request = formatNodeRequest(sdkData)

  const isExcel = options.documentType === 'excel'
  const ext = isExcel ? 'xlsx' : 'pdf'
  const renderMethod = isExcel ? 'renderExcel' : 'renderWord'
  const tail =
    options.mode === 'async'
      ? `// Queues the job and answers at once (202 Accepted, Pro feature).
const outcome = await api.${renderMethod}(request);
if (outcome.kind !== 'queued') throw new Error('Expected a queued job — is "async": true set?');

const jobId = outcome.job.jobId!;
// Store jobId with your own record (order, document, …).
// Qorstack POSTs the result to webhookUrl when the job finishes — see "Receive the webhook".
console.log(\`Queued render job \${jobId}\`);

// No webhook endpoint? Wait for the job instead (polls every 2 s, gives up after 10 min):
// const job = await api.waitForJob(jobId);
// console.log(job.downloadUrl);`
      : `// Waits until the file is ready (200 OK).
const response = await api.render.${methodName}(request);
const { downloadUrl, expiresIn, isZipped } = response.data;

// The link works for expiresIn seconds and needs no API key: send it to the browser,
// or download the file on the server:
console.log(\`Link valid for \${expiresIn} s\`);
const file = await fetch(downloadUrl!);
await writeFile(\`\${request.fileName ?? 'output'}.\${isZipped ? 'zip' : '${ext}'}\`, Buffer.from(await file.arrayBuffer()));`

  return `// npm install qorstack-report-sdk
${options.mode === 'async' ? '' : "import { writeFile } from 'node:fs/promises';\n"}import { QorstackApi, ${requestType} } from 'qorstack-report-sdk';

const api = new QorstackApi({
  baseUrl: ${apiUrl},
  securityData: {
    headers: {
      'X-API-Key': process.env.QORSTACK_API_KEY || 'YOUR_API_KEY'
    }
  }
});

${tableDataDeclarations ? `${tableDataDeclarations}\n\n` : ''}const request: ${requestType} = ${request};

${tail}`
}

const formatValue = (value: unknown, level = 0): string => {
  if (Array.isArray(value)) return formatArray(value, level)
  if (value && typeof value === 'object') return formatObject(value as Record<string, unknown>, level)
  return toLiteral(value)
}

const normalizeSdkData = (data: any) => {
  const normalized = JSON.parse(JSON.stringify(data ?? {}))
  if (normalized.image && typeof normalized.image === 'object') {
    Object.values(normalized.image).forEach((image: any) => {
      if (!image || typeof image !== 'object') return
      if (image.fit === undefined && image.objectFit !== undefined) image.fit = image.objectFit
      delete image.objectFit
    })
  }
  return normalized
}

const indent = (level: number) => '  '.repeat(level)

const canUseBareKey = (key: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
const formatPropertyKey = (key: string) => (canUseBareKey(key) ? key : JSON.stringify(key))

const shouldSkipEmptyValue = (key: string, value: unknown) =>
  (key === 'sort' || key === 'verticalMerge' || key === 'collapse' || key === 'conditionalFormat') &&
  Array.isArray(value) &&
  value.length === 0

const formatObject = (obj: Record<string, unknown>, level = 0): string => {
  const entries = Object.entries(obj).filter(([key, value]) => value !== undefined && !shouldSkipEmptyValue(key, value))
  if (entries.length === 0) return '{}'
  const lines = entries.map(([key, value]) => `${indent(level + 1)}${formatPropertyKey(key)}: ${formatValue(value, level + 1)}`)
  return `{\n${lines.join(',\n')}\n${indent(level)}}`
}

const formatArray = (arr: unknown[], level = 0): string => {
  if (arr.length === 0) return '[]'
  const lines = arr.map(value => `${indent(level + 1)}${formatValue(value, level + 1)}`)
  return `[\n${lines.join(',\n')}\n${indent(level)}]`
}

const formatItemAccessor = (col: string) => (canUseBareKey(col) ? `item.${col}` : `item[${JSON.stringify(col)}]`)

// Columns are listed once ({{row:name}} in the template); each row holds the values in that order.
const getColumns = (table: any): string[] => (Array.isArray(table.columns) ? table.columns : [])

const formatTableRowsMap = (table: any, index: number): string => {
  const columns = getColumns(table)
  if (columns.length === 0) return '[]'
  const cells = columns.map(col => `${formatItemAccessor(col)} ?? null`).join(', ')
  return `${getTableDataName(index)}.map(item => [${cells}]);`
}

const formatTableDataDeclaration = (table: any, index: number): string => {
  const rowsName = getTableRowsName(index)
  return `// Example fetching data for table ${index + 1} from your service.
const ${getTableDataName(index)} = await mockService.getExamplesAsync();
const ${rowsName} = ${formatTableRowsMap(table, index)}`
}

const formatTable = (table: any, index: number, level: number): string => {
  const entries = Object.entries(table).filter(([key, value]) => value !== undefined && !shouldSkipEmptyValue(key, value))
  const lines = entries.map(([key, value]) => {
    if (key === 'rows') {
      return `${indent(level + 1)}rows: ${Array.isArray(value) && value.length ? getTableRowsName(index) : '[]'}`
    }
    if (key === 'columns' && Array.isArray(value)) {
      return `${indent(level + 1)}columns: [${value.map(c => JSON.stringify(c)).join(', ')}]`
    }
    return `${indent(level + 1)}${formatPropertyKey(key)}: ${formatValue(value, level + 1)}`
  })
  return `{\n${lines.join(',\n')}\n${indent(level)}}`
}

const formatNodeRequest = (data: any): string => {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined)
  const lines = entries.map(([key, value]) => {
    if (key === 'table' && Array.isArray(value)) {
      const tables = value.map((table, index) => `${indent(2)}${formatTable(table, index, 2)}`).join(',\n')
      return `${indent(1)}table: [\n${tables}\n${indent(1)}]`
    }
    return `${indent(1)}${formatPropertyKey(key)}: ${formatValue(value, 1)}`
  })
  return `{\n${lines.join(',\n')}\n}`
}
