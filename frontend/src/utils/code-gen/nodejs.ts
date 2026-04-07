export const generateNodejsExample = (data: any): string => {
  // Helper to determine if a key needs quotes
  const formatKey = (key: string) => {
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
      return key
    }
    return `'${key}'`
  }

  // Generate table rows variable code
  const tables = data.table || data.tables
  let tableVarsCode = ''

  if (tables && tables.length > 0) {
    const allRowKeys = new Set<string>()
    let hasTableRows = false

    tables.forEach((t: any) => {
      if (t.rows && t.rows.length > 0) {
        Object.keys(t.rows[0]).forEach(k => allRowKeys.add(k))
        hasTableRows = true
      }
    })

    if (hasTableRows) {
      let selectBody = ''
      Array.from(allRowKeys).forEach(key => {
        let valStr = ''
        if (key.toLowerCase() === 'no' || key.toLowerCase() === 'index') {
          valStr = 'index + 1'
        } else {
          const propName = key
            .split(/_|\s+/)
            .map(s => s.charAt(0).toUpperCase() + s.slice(1))
            .join('')
          valStr = `item.${propName}`
        }
        selectBody += `  ${formatKey(key)}: ${valStr},\n`
      })
      selectBody = selectBody.trimEnd().replace(/,$/, '')

      tableVarsCode += `const tableRows = data.map((item, index) => ({\n${selectBody}\n}));\n\n`
    }
  }

  // Format tables
  let tablesFormatted = ''
  if (tables && tables.length > 0) {
    tablesFormatted = tables
      .map((t: any) => {
        let tStr = `    {\n`
        if (t.name) tStr += `      name: '${t.name}',\n`

        if (t.columns && t.columns.length > 0) {
          tStr += `      columns: [${t.columns.map((c: string) => `'${c}'`).join(', ')}],\n`
        }

        if (t.rows && t.rows.length > 0) {
          tStr += `      rows: tableRows,\n`
        }

        if (t.sort && t.sort.length > 0) {
          tStr += `      sort: [\n`
          t.sort.forEach((s: any) => {
            tStr += `        { field: '${s.field || s.key}', direction: '${s.direction || s.order}' },\n`
          })
          tStr += `      ],\n`
        }

        if (t.verticalMerge && t.verticalMerge.length > 0) {
          tStr += `      verticalMerge: [${t.verticalMerge.map((c: string) => `'${c}'`).join(', ')}],\n`
        }

        if (t.collapse && t.collapse.length > 0) {
          tStr += `      collapse: [${t.collapse.map((c: string) => `'${c}'`).join(', ')}]\n`
        }

        // Clean up trailing comma
        if (tStr.endsWith(',\n')) tStr = tStr.slice(0, -2) + '\n'

        tStr += `    }`
        return tStr
      })
      .join(',\n')
  }

  // Format replace variables
  let replaceFormatted = ''
  if (data.replace && Object.keys(data.replace).length > 0) {
    replaceFormatted = Object.entries(data.replace)
      .map(([k, v]) => {
        return `    ${formatKey(k)}: '${v}'`
      })
      .join(',\n')
  }

  // Format Images
  let imagesFormatted = ''
  const images = data.image || data.images
  if (images && (Array.isArray(images) ? images.length > 0 : Object.keys(images).length > 0)) {
    // Helper for formatting image props
    const formatImgProps = (img: any) => {
      let props = []
      // Add backticks to URL/src if present, similar to C# update
      if (img.url || img.src) props.push(`src: '\`${img.url || img.src}\`'`)
      if (img.width) props.push(`width: ${img.width}`)
      if (img.height) props.push(`height: ${img.height}`)
      if (img.extension) props.push(`extension: '${img.extension}'`)
      if (img.fit) props.push(`fit: '${img.fit}'`)
      return props.join(', ')
    }

    if (Array.isArray(images)) {
      imagesFormatted = images.map((img: any) => `    ${formatKey(img.name)}: { ${formatImgProps(img)} }`).join(',\n')
    } else {
      imagesFormatted = Object.entries(images)
        .map(([k, v]: [string, any]) => `    ${formatKey(k)}: { ${formatImgProps(v)} }`)
        .join(',\n')
    }
  }

  // Format QrCode
  let qrcodesFormatted = ''
  const qrcodes = data.qrcode || data.qrcodes
  if (qrcodes && (Array.isArray(qrcodes) ? qrcodes.length > 0 : Object.keys(qrcodes).length > 0)) {
    // Helper for formatting qr props
    const formatQrProps = (qr: any) => {
      let props = []
      // Add backticks to text/data if present
      if (qr.data || qr.text) props.push(`text: '\`${qr.data || qr.text}\`'`)
      if (qr.width || qr.size) props.push(`size: ${qr.width || qr.size}`)
      return props.join(', ')
    }

    if (Array.isArray(qrcodes)) {
      qrcodesFormatted = qrcodes.map((qr: any) => `    ${formatKey(qr.name)}: { ${formatQrProps(qr)} }`).join(',\n')
    } else {
      qrcodesFormatted = Object.entries(qrcodes)
        .map(([k, v]: [string, any]) => `    ${formatKey(k)}: { ${formatQrProps(v)} }`)
        .join(',\n')
    }
  }

  // Format Barcode
  let barcodesFormatted = ''
  const barcodes = data.barcode || data.barcodes
  if (barcodes && (Array.isArray(barcodes) ? barcodes.length > 0 : Object.keys(barcodes).length > 0)) {
    const formatBcProps = (bc: any) => {
      let props = []
      if (bc.data || bc.text) props.push(`text: '${bc.data || bc.text}'`)
      if (bc.format) props.push(`format: '${bc.format}'`)
      if (bc.width) props.push(`width: ${bc.width}`)
      if (bc.height) props.push(`height: ${bc.height}`)
      return props.join(', ')
    }

    if (Array.isArray(barcodes)) {
      barcodesFormatted = barcodes.map((bc: any) => `    ${formatKey(bc.name)}: { ${formatBcProps(bc)} }`).join(',\n')
    } else {
      barcodesFormatted = Object.entries(barcodes)
        .map(([k, v]: [string, any]) => `    ${formatKey(k)}: { ${formatBcProps(v)} }`)
        .join(',\n')
    }
  }

  // Assemble JS object string
  let objStr = `{\n`
  if (data.templateKey) objStr += `  templateKey: '${data.templateKey}',\n`
  if (data.fileName) objStr += `  fileName: '${data.fileName}',\n`

  if (replaceFormatted) {
    objStr += `  replace: {\n${replaceFormatted}\n  },\n`
  }

  if (tablesFormatted) {
    objStr += `  table: [\n${tablesFormatted}\n  ],\n`
  }

  if (imagesFormatted) {
    objStr += `  image: {\n${imagesFormatted}\n  },\n`
  }

  if (qrcodesFormatted) {
    objStr += `  qrcode: {\n${qrcodesFormatted}\n  },\n`
  }

  if (barcodesFormatted) {
    objStr += `  barcode: {\n${barcodesFormatted}\n  }\n`
  }

  // Remove trailing comma from last property
  if (objStr.endsWith(',\n')) {
    objStr = objStr.slice(0, -2) + '\n'
  }
  objStr += `}`

  return `// npm install qorstackReport-sdk or yarn add qorstackReport-sdk
import { QorstackReport, PdfFromTemplateRequest } from 'qorstackReport-sdk';

const api = new QorstackReport();
api.setSecurityData({ headers: { 'X-API-KEY': 'YOUR_API_KEY' } });

// Example fetching data from service or database
const data = await mockService.getExamplesAsync();
${tableVarsCode}const request: PdfFromTemplateRequest = ${objStr};

const response = await api.render.postRenderTemplatePdf(request);`
}
