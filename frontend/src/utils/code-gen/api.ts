export const generateApiExample = (data: any): string => {
  const prettyJson = JSON.stringify(data, null, 2)

  return `Method: POST
URL: https://api.qorstackReport.dev/render/template-pdf
Headers:
  Content-Type: application/json
  X-API-KEY: YOUR_API_KEY

Body (JSON):
${prettyJson}`
}
