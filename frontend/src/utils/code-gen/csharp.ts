export const generateCsharpExample = (data: any, indent = 4): string => {
  const pad = ' '.repeat(indent)
  const padInner = ' '.repeat(indent + 4)
  const padInner2 = ' '.repeat(indent + 8)

  // Generate table rows variable code
  const tables = data.table || data.tables
  let tableVarsCode = ''

  if (tables && tables.length > 0) {
    tables.forEach((t: any, idx: number) => {
      if (t.rows && t.rows.length > 0) {
        const varName = tables.length > 1 ? `tableRows${idx + 1}` : 'tableRows'
        const firstRow = t.rows[0]

        let selectBody = ''
        Object.keys(firstRow).forEach(key => {
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
          selectBody += `    ${key} = ${valStr},\n`
        })
        selectBody = selectBody.trimEnd().replace(/,$/, '')

        tableVarsCode += `var ${varName} = data.Select((item, index) => new \n{\n${selectBody
          .split('\n')
          .map(l => '    ' + l)
          .join('\n')}\n}).ToList();\n\n`
      }
    })
  }

  let csharpStr = 'new PdfFromTemplateRequest\n' + pad + '{\n'
  if (data.templateKey) csharpStr += padInner + `TemplateKey = "${data.templateKey}",\n`
  if (data.fileName) csharpStr += padInner + `FileName = "${data.fileName}",\n`

  if (data.replace && Object.keys(data.replace).length > 0) {
    csharpStr += padInner + 'Replace = new()\n' + padInner + '{\n'
    Object.entries(data.replace).forEach(([k, v]) => {
      csharpStr += padInner2 + `{ "${k}", "${v}" },\n`
    })
    csharpStr += padInner + '},\n'
  }

  if (tables && tables.length > 0) {
    csharpStr += padInner + 'Table = new()\n' + padInner + '{\n'
    tables.forEach((t: any, idx: number) => {
      csharpStr += padInner2 + 'new()\n' + padInner2 + '{\n'
      if (t.name) csharpStr += padInner2 + `    Name = "${t.name}",\n`
      if (t.columns && t.columns.length > 0) {
        csharpStr += padInner2 + `    Columns = new() { ${t.columns.map((c: string) => `"${c}"`).join(', ')} },\n`
      }
      if (t.rows && t.rows.length > 0) {
        const varName = tables.length > 1 ? `tableRows${idx + 1}` : 'tableRows'
        csharpStr += padInner2 + `    Rows = ${varName},\n`
      }
      if (t.sort && t.sort.length > 0) {
        csharpStr += padInner2 + '    Sort = new()\n' + padInner2 + '    {\n'
        t.sort.forEach((s: any) => {
          if (s.field)
            csharpStr +=
              padInner2 + `        new() { Field = "${s.field || s.key}", Direction = "${s.direction || s.order}" },\n`
        })
        csharpStr += padInner2 + '    },\n'
      }
      if (t.verticalMerge && t.verticalMerge.length > 0) {
        csharpStr +=
          padInner2 + `    VerticalMerge = new() { ${t.verticalMerge.map((c: string) => `"${c}"`).join(', ')} },\n`
      }
      if (t.collapse && t.collapse.length > 0) {
        csharpStr += padInner2 + `    Collapse = new() { ${t.collapse.map((c: string) => `"${c}"`).join(', ')} }\n`
      }

      // Remove trailing comma from last property if exists
      if (csharpStr.endsWith(',\n')) {
        csharpStr = csharpStr.slice(0, -2) + '\n'
      }

      csharpStr += padInner2 + '},\n'
    })
    csharpStr += padInner + '},\n'
  }

  const images = data.image || data.images
  if (images && (Array.isArray(images) ? images.length > 0 : Object.keys(images).length > 0)) {
    csharpStr += padInner + 'Image = new()\n' + padInner + '{\n'

    const processImage = (name: string, img: any) => {
      let props = []
      if (img.src || img.url) props.push(`Src = "\`${img.src || img.url}\`"`)
      if (img.width) props.push(`Width = ${img.width}`)
      if (img.height) props.push(`Height = ${img.height}`)
      if (img.extension) props.push(`Extension = "${img.extension}"`)
      if (img.fit) props.push(`Fit = "${img.fit}"`)

      csharpStr +=
        padInner2 + `{\n${padInner2}    "${name}",\n${padInner2}    new() { ${props.join(', ')} }\n${padInner2}},\n`
    }

    if (Array.isArray(images)) {
      images.forEach((img: any) => processImage(img.name, img))
    } else {
      Object.entries(images).forEach(([k, v]) => processImage(k, v))
    }

    csharpStr += padInner + '},\n'
  }

  const qrcodes = data.qrcode || data.qrcodes
  if (qrcodes && (Array.isArray(qrcodes) ? qrcodes.length > 0 : Object.keys(qrcodes).length > 0)) {
    csharpStr += padInner + 'QrCode = new()\n' + padInner + '{\n'

    const processQr = (name: string, qr: any) => {
      let props = []
      if (qr.text || qr.data) props.push(`Text = "\`${qr.text || qr.data}\`"`)
      if (qr.width || qr.size) props.push(`Size = ${qr.width || qr.size}`)

      csharpStr +=
        padInner2 + `{\n${padInner2}    "${name}",\n${padInner2}    new() { ${props.join(', ')} }\n${padInner2}},\n`
    }

    if (Array.isArray(qrcodes)) {
      qrcodes.forEach((qr: any) => processQr(qr.name, qr))
    } else {
      Object.entries(qrcodes).forEach(([k, v]) => processQr(k, v))
    }

    csharpStr += padInner + '},\n'
  }

  const barcodes = data.barcode || data.barcodes
  if (barcodes && (Array.isArray(barcodes) ? barcodes.length > 0 : Object.keys(barcodes).length > 0)) {
    csharpStr += padInner + 'Barcode = new()\n' + padInner + '{\n'

    const processBarcode = (name: string, bc: any) => {
      let props = []
      if (bc.text || bc.data) props.push(`Text = "${bc.text || bc.data}"`)
      if (bc.format) props.push(`Format = "${bc.format}"`)
      if (bc.width) props.push(`Width = ${bc.width}`)
      if (bc.height) props.push(`Height = ${bc.height}`)

      csharpStr +=
        padInner2 + `{\n${padInner2}    "${name}",\n${padInner2}    new() { ${props.join(', ')} }\n${padInner2}},\n`
    }

    if (Array.isArray(barcodes)) {
      barcodes.forEach((bc: any) => processBarcode(bc.name, bc))
    } else {
      Object.entries(barcodes).forEach(([k, v]) => processBarcode(k, v))
    }

    csharpStr += padInner + '},\n'
  }

  // Ensure last property doesn't have trailing comma
  if (csharpStr.endsWith(',\n')) {
    csharpStr = csharpStr.slice(0, -2) + '\n'
  }

  csharpStr += pad + '};'

  const code = `// dotnet add package QorstackReport.Sdk
using System.Net.Http;
using System.Collections.Generic;
using System.Linq;
using QorstackReport.Sdk;
using QorstackReport.Sdk.Models;

var httpClient = new HttpClient();
httpClient.DefaultRequestHeaders.Add("X-API-KEY", "YOUR_API_KEY");
var api = new QorstackReport(httpClient);

// Example fetching data from service or database
var data = await mockService.GetExamplesAsync();
${tableVarsCode}var request = ${csharpStr}

var response = await api.Render.PostRenderTemplatePdfAsync(request);`

  return code
}
