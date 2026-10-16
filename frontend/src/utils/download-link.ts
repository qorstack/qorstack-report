// Download links from the API look like `{api}/files/{payload}.{signature}`, where `payload` is
// base64url JSON with `e` = expiry (unix seconds). Older links were S3 presigned URLs
// (`X-Amz-Date` + `X-Amz-Expires`). Returns the expiry as epoch milliseconds, or null.
export const getDownloadLinkExpiry = (link: string): number | null => {
  try {
    const url = new URL(link)

    const filesIdx = url.pathname.indexOf('/files/')
    if (filesIdx >= 0) {
      const token = url.pathname.slice(filesIdx + '/files/'.length)
      const body = token.split('.')[0]
      if (!body) return null
      const base64 = body.replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
      const payload: unknown = JSON.parse(atob(padded))
      if (typeof payload === 'object' && payload !== null && 'e' in payload && typeof payload.e === 'number') {
        return payload.e * 1000
      }
      return null
    }

    const expiresSec = Number(url.searchParams.get('X-Amz-Expires'))
    const dateStr = url.searchParams.get('X-Amz-Date')
    if (!expiresSec || !dateStr) return null
    // X-Amz-Date format: 20260424T040209Z
    const iso = dateStr.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z')
    const signedAt = Date.parse(iso)
    return signedAt ? signedAt + expiresSec * 1000 : null
  } catch {
    return null
  }
}
