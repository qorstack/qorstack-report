import { CodeExamples } from './types'
import { generateCsharpExample } from './csharp'
import { generateNodejsExample } from './nodejs'
import { generateApiExample } from './api'

export const getSdkCodeExamples = (data: any): CodeExamples => {
  const prettyJson = JSON.stringify(data, null, 2)

  return {
    json: prettyJson,
    api: generateApiExample(data),
    nodejs: generateNodejsExample(data),
    csharp: generateCsharpExample(data)
  }
}

export * from './types'
export { generateCsharpExample } from './csharp'
export { generateNodejsExample } from './nodejs'
export { generateApiExample } from './api'
