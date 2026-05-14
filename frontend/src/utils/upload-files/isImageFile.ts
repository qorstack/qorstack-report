export const isImageFile = (src: string) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp']
  const mimeTypeRegex = /image\/(jpeg|png|gif|bmp|svg\+xml|webp)/

  // Extract file extension from the URL
  const fileExtension = src.split('.').pop()?.toLowerCase()

  // Check for known image extensions
  if (fileExtension && imageExtensions.includes(fileExtension)) {
    return true
  }

  // Check if the URL contains a pattern suggesting it's an image
  if (mimeTypeRegex.test(src)) {
    return true
  }

  // Check if the URL includes a query parameter like 'Content-Type=image/*'
  if (src.includes('image/')) {
    return true
  }

  return false
}
