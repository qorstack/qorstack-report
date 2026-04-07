export const formatDuration = (ms: number | null | undefined): string => {
  if (ms == null) return '-'
  return `${parseFloat((ms / 1000).toFixed(2))}s`
}

export const formatFileSize = (bytes: number | null | undefined): string => {
  if (bytes == null) return '-'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
