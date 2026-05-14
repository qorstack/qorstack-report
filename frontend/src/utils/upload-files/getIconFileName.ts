import path from 'path'

export const getIconFileName = (fileName: string) => {
  const fileExtension = path.extname(fileName).toLowerCase()
  switch (fileExtension) {
    case '.pdf':
      return 'vscode-icons:file-type-pdf2'
    case '.doc':
    case '.docx':
      return 'vscode-icons:file-type-word'
    case '.xlsx':
      return 'vscode-icons:file-type-excel'

    default:
      return 'solar:document-bold'
  }
}
