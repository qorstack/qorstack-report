import type { CodeGenOptions } from './types'

const INDENT = '    '

const getRequestType = (documentType: CodeGenOptions['documentType']) =>
  documentType === 'excel' ? 'ExcelFromTemplateRequest' : 'PdfFromTemplateRequest'

const getTableType = (documentType: CodeGenOptions['documentType']) =>
  documentType === 'excel' ? 'ExcelTableDataRequest' : 'WordTableDataRequest'

const getMethodName = (documentType: CodeGenOptions['documentType']) =>
  documentType === 'excel' ? 'PostRenderExcelTemplateAsync' : 'PostRenderWordTemplateAsync'

const resolveBaseUrl = (apiUrl?: string) => {
  if (apiUrl && !apiUrl.includes('__NEXT_PUBLIC_SERVICE__')) return apiUrl
  return 'http://localhost:8080/api'
}

const getTableDataName = (index: number) => `table${index + 1}Data`
const getTableRowsName = (index: number) => `table${index + 1}Rows`

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

const escapeString = (value: unknown) =>
  String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n')

const csString = (value: unknown) => (value === null || value === undefined ? 'null' : `"${escapeString(value)}"`)

const canUseMemberAccess = (key: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)

const formatItemAccessor = (key: string) => (canUseMemberAccess(key) ? `item.${key}` : `item[${csString(key)}]`)

const indentBlock = (content: string, level = 1) =>
  content
    .split('\n')
    .map((line) => (line.length ? INDENT.repeat(level) + line : line))
    .join('\n')

const formatPrimitive = (value: unknown): string => {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return csString(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(value)
  return csString(String(value))
}

const formatKeyValueList = (items: Array<{ key: string; value: unknown }>): string => {
  if (!items || items.length === 0) return 'new List<KeyValueRequest>()'
  const inner = items
    .map(i => `new KeyValueRequest { Key = ${csString(i.key)}, Value = ${csString(i.value ?? '')} }`)
    .join(',\n')
  return `new List<KeyValueRequest>\n{\n${indentBlock(inner)}\n}`
}

const formatStringList = (arr: string[]): string => {
  if (!arr || arr.length === 0) return 'new List<string>()'
  return `new List<string> { ${arr.map(csString).join(', ')} }`
}

const formatSortList = (arr: Array<{ field: string; direction: string }>): string => {
  if (!arr || arr.length === 0) return 'new List<SortDefinition>()'
  const items = arr
    .map((s) => `new SortDefinition { Field = ${csString(s.field)}, Direction = SortDefinitionDirection.${pascal(s.direction || 'asc')} }`)
    .join(',\n')
  return `new List<SortDefinition>\n{\n${indentBlock(items)}\n}`
}

const formatObject = (typeName: string, props: string[]): string => {
  if (props.length === 0) return `new ${typeName}()`
  return `new ${typeName}\n{\n${indentBlock(props.join(',\n'))}\n}`
}

const formatConditionalFormatRules = (rules: Array<Record<string, unknown>>): string => {
  if (!rules || rules.length === 0) return 'new List<ConditionalFormatRuleRequest>()'
  const items = rules
    .map(r => {
      const rProps: string[] = []
      if (r.value !== undefined && r.value !== null) rProps.push(`Value = ${formatPrimitive(r.value)}`)
      if (r.operator !== undefined) rProps.push(`Operator = ${csString(r.operator)}`)
      if (r.fontColor !== undefined) rProps.push(`FontColor = ${csString(r.fontColor)}`)
      if (r.backgroundColor !== undefined) rProps.push(`BackgroundColor = ${csString(r.backgroundColor)}`)
      if (typeof r.bold === 'boolean') rProps.push(`Bold = ${r.bold}`)
      if (typeof r.italic === 'boolean') rProps.push(`Italic = ${r.italic}`)
      return formatObject('ConditionalFormatRuleRequest', rProps)
    })
    .join(',\n')
  return `new List<ConditionalFormatRuleRequest>\n{\n${indentBlock(items)}\n}`
}

const formatConditionalFormats = (configs: Array<Record<string, unknown>>): string => {
  if (!configs || configs.length === 0) return 'new List<ConditionalFormatConfigRequest>()'
  const items = configs
    .map(c => {
      const cProps: string[] = []
      if (c.field !== undefined) cProps.push(`Field = ${csString(c.field)}`)
      if (Array.isArray(c.rules)) cProps.push(`Rules = ${formatConditionalFormatRules(c.rules as Array<Record<string, unknown>>)}`)
      return formatObject('ConditionalFormatConfigRequest', cProps)
    })
    .join(',\n')
  return `new List<ConditionalFormatConfigRequest>\n{\n${indentBlock(items)}\n}`
}

// Columns are listed once ({{row:name}} in the template); each row holds the values in that order.
const getColumns = (table: any): string[] => (Array.isArray(table.columns) ? table.columns : [])

const formatTableRowsMap = (table: any, index: number): string => {
  const columns = getColumns(table)
  if (columns.length === 0) return 'new List<ICollection<object>>();'
  const cells = columns.map(col => formatItemAccessor(col)).join(', ')
  return `${getTableDataName(index)}.Select(item => (ICollection<object>)new List<object> { ${cells} }).ToList();`
}

// SDK enums: "docx" → Docx, "desc" → Desc, "cover" → Cover
const pascal = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()

const formatTableDataDeclaration = (table: any, index: number): string => {
  return `// Example fetching data for table ${index + 1} from your service.
var ${getTableDataName(index)} = await mockService.GetExamplesAsync();
var ${getTableRowsName(index)} = ${formatTableRowsMap(table, index)}`
}

const formatTableItem = (table: any, tableType: string, index: number): string => {
  const props: string[] = []
  if (getColumns(table).length) props.push(`Columns = ${formatStringList(getColumns(table))}`)
  if (Array.isArray(table.rows) && table.rows.length) props.push(`Rows = ${getTableRowsName(index)}`)
  if (Array.isArray(table.sort) && table.sort.length) props.push(`Sort = ${formatSortList(table.sort)}`)
  if (Array.isArray(table.verticalMerge) && table.verticalMerge.length)
    props.push(`VerticalMerge = ${formatStringList(table.verticalMerge)}`)
  if (Array.isArray(table.collapse) && table.collapse.length)
    props.push(`Collapse = ${formatStringList(table.collapse)}`)
  if (typeof table.freezeHeader === 'boolean') props.push(`FreezeHeader = ${table.freezeHeader}`)
  if (typeof table.autoFilter === 'boolean') props.push(`AutoFilter = ${table.autoFilter}`)
  if (typeof table.autoFitColumns === 'boolean') props.push(`AutoFitColumns = ${table.autoFitColumns}`)
  if (typeof table.asExcelTable === 'boolean') props.push(`AsExcelTable = ${table.asExcelTable}`)
  if (typeof table.repeatHeader === 'boolean') props.push(`RepeatHeader = ${table.repeatHeader}`)
  // Excel-only fields
  if (typeof table.outline === 'boolean') props.push(`Outline = ${table.outline}`)
  if (Array.isArray(table.generateTotals) && table.generateTotals.length)
    props.push(`GenerateTotals = ${formatKeyValueList(table.generateTotals)}`)
  if (Array.isArray(table.numberFormat) && table.numberFormat.length)
    props.push(`NumberFormat = ${formatKeyValueList(table.numberFormat)}`)
  if (Array.isArray(table.conditionalFormat) && table.conditionalFormat.length)
    props.push(`ConditionalFormat = ${formatConditionalFormats(table.conditionalFormat)}`)
  if (table.splitToSheets?.field) {
    const stProps: string[] = [`Field = ${csString(table.splitToSheets.field)}`]
    if (table.splitToSheets.templateSheet) stProps.push(`TemplateSheet = ${csString(table.splitToSheets.templateSheet)}`)
    props.push(`SplitToSheets = ${formatObject('SplitToSheetsConfigRequest', stProps)}`)
  }
  if (table.excelTableStyle) props.push(`ExcelTableStyle = ${csString(table.excelTableStyle)}`)
  return formatObject(tableType, props)
}

const formatImage = (data: any): string => {
  const props: string[] = [`Key = ${csString(data.key)}`]
  if (data.src !== undefined) props.push(`Src = ${csString(data.src)}`)
  if (data.width !== undefined) props.push(`Width = ${data.width}`)
  if (data.height !== undefined) props.push(`Height = ${data.height}`)
  if (data.fit) props.push(`Fit = ImageDataRequestFit.${pascal(String(data.fit))}`)
  return formatObject('ImageDataRequest', props)
}

const formatQr = (data: any): string => {
  const props: string[] = [`Key = ${csString(data.key)}`]
  if (data.text !== undefined) props.push(`Text = ${csString(data.text)}`)
  if (data.size !== undefined) props.push(`Size = ${data.size}`)
  if (data.color !== undefined) props.push(`Color = ${csString(data.color)}`)
  if (data.backgroundColor !== undefined) props.push(`BackgroundColor = ${csString(data.backgroundColor)}`)
  if (data.logo !== undefined) props.push(`Logo = ${csString(data.logo)}`)
  return formatObject('QrCodeDataRequest', props)
}

const formatBarcode = (data: any): string => {
  const props: string[] = [`Key = ${csString(data.key)}`]
  if (data.text !== undefined) props.push(`Text = ${csString(data.text)}`)
  if (data.format !== undefined) props.push(`Format = ${csString(data.format)}`)
  if (data.width !== undefined) props.push(`Width = ${data.width}`)
  if (data.height !== undefined) props.push(`Height = ${data.height}`)
  if (typeof data.includeText === 'boolean') props.push(`IncludeText = ${data.includeText}`)
  if (data.color !== undefined) props.push(`Color = ${csString(data.color)}`)
  if (data.backgroundColor !== undefined) props.push(`BackgroundColor = ${csString(data.backgroundColor)}`)
  return formatObject('BarcodeDataRequest', props)
}

const formatTypedList = (items: any[], itemType: string, formatter: (v: any) => string): string => {
  if (!items || items.length === 0) return `new List<${itemType}>()`
  return `new List<${itemType}>\n{\n${indentBlock(items.map(formatter).join(',\n'))}\n}`
}

const formatRequest = (data: any, requestType: string, tableType: string): string => {
  const props: string[] = []
  if (data.templateKey !== undefined) props.push(`TemplateKey = ${csString(data.templateKey)}`)
  if (data.fileName !== undefined) props.push(`FileName = ${csString(data.fileName)}`)
  if (data.fileType) props.push(`FileType = PdfFromTemplateRequestFileType.${pascal(String(data.fileType))}`)
  if (typeof data.zipOutput === 'boolean') props.push(`ZipOutput = ${data.zipOutput}`)
  if (Array.isArray(data.replace) && data.replace.length)
    props.push(`Replace = ${formatKeyValueList(data.replace)}`)
  if (Array.isArray(data.table) && data.table.length) {
    const items = data.table.map((t: any, index: number) => formatTableItem(t, tableType, index)).join(',\n')
    props.push(`Table = new List<${tableType}>\n{\n${indentBlock(items)}\n}`)
  }
  if (Array.isArray(data.image) && data.image.length)
    props.push(`Image = ${formatTypedList(data.image, 'ImageDataRequest', formatImage)}`)
  if (Array.isArray(data.qrcode) && data.qrcode.length)
    props.push(`Qrcode = ${formatTypedList(data.qrcode, 'QrCodeDataRequest', formatQr)}`)
  if (Array.isArray(data.barcode) && data.barcode.length)
    props.push(`Barcode = ${formatTypedList(data.barcode, 'BarcodeDataRequest', formatBarcode)}`)
  if (data.pdfPassword) {
    const pw = data.pdfPassword
    const pwProps: string[] = []
    if (pw.userPassword !== undefined) pwProps.push(`UserPassword = ${csString(pw.userPassword)}`)
    if (pw.ownerPassword !== undefined) pwProps.push(`OwnerPassword = ${csString(pw.ownerPassword)}`)
    if (typeof pw.restrictPrinting === 'boolean') pwProps.push(`RestrictPrinting = ${pw.restrictPrinting}`)
    if (typeof pw.restrictCopying === 'boolean') pwProps.push(`RestrictCopying = ${pw.restrictCopying}`)
    if (typeof pw.restrictModifying === 'boolean') pwProps.push(`RestrictModifying = ${pw.restrictModifying}`)
    if (pwProps.length) props.push(`PdfPassword = ${formatObject('PdfPasswordRequest', pwProps)}`)
  }
  if (data.watermark) {
    const wm = data.watermark
    const wmProps: string[] = []
    if (wm.text !== undefined) wmProps.push(`Text = ${csString(wm.text)}`)
    if (wm.fontSize !== undefined && wm.fontSize !== null) wmProps.push(`FontSize = ${wm.fontSize}`)
    if (wm.fontFamily !== undefined) wmProps.push(`FontFamily = ${csString(wm.fontFamily)}`)
    if (wm.fontWeight !== undefined && wm.fontWeight !== null) wmProps.push(`FontWeight = ${wm.fontWeight}`)
    if (typeof wm.fontItalic === 'boolean') wmProps.push(`FontItalic = ${wm.fontItalic}`)
    if (wm.color !== undefined) wmProps.push(`Color = ${csString(wm.color)}`)
    if (wm.opacity !== undefined && wm.opacity !== null) wmProps.push(`Opacity = ${wm.opacity}`)
    if (wm.rotation !== undefined && wm.rotation !== null) wmProps.push(`Rotation = ${wm.rotation}`)
    if (wm.positionX !== undefined) wmProps.push(`PositionX = ${csString(wm.positionX)}`)
    if (wm.positionY !== undefined) wmProps.push(`PositionY = ${csString(wm.positionY)}`)
    if (Array.isArray(wm.pages) && wm.pages.length) wmProps.push(`Pages = new List<int> { ${wm.pages.join(', ')} }`)
    if (wmProps.length) props.push(`Watermark = ${formatObject('PdfWatermarkRequest', wmProps)}`)
  }
  return formatObject(requestType, props)
}

export const generateCsharpExample = (data: any, options: CodeGenOptions = {}): string => {
  const sdkData = normalizeSdkData(data)
  const requestType = getRequestType(options.documentType)
  const tableType = getTableType(options.documentType)
  const methodName = getMethodName(options.documentType)
  const defaultUrl = resolveBaseUrl(options.apiUrl)
  const requestObj = formatRequest(sdkData, requestType, tableType)
  const tableDataDeclarations = (sdkData.table || [])
    .map((table: any, index: number) => {
      if (!Array.isArray(table.rows) || table.rows.length === 0) return null
      return formatTableDataDeclaration(table, index)
    })
    .filter(Boolean)
    .join('\n')

  return `// dotnet add package Qorstack.Report.Sdk
using Qorstack.Report.Sdk;
using System.Collections.Generic;
using System.Linq;

// Reads from IConfiguration (appsettings.json, environment variables, user secrets, etc.)
var apiUrl = _configuration["QORSTACK_API_URL"] ?? "${defaultUrl}";
var apiKey = _configuration["QORSTACK_API_KEY"] ?? "YOUR_API_KEY";
var api = new QorstackApi(apiUrl, apiKey);

${tableDataDeclarations ? `${tableDataDeclarations}\n\n` : ''}var request = ${requestObj};

var response = await api.${methodName}(request);
var downloadUrl = response.DownloadUrl;`
}
