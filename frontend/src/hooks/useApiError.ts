import { addToast } from '@heroui/react'

export const handleApiError = (error: unknown, fallbackMsg: string) => {
  const resp = error as Record<string, unknown> | null
  const data = resp?.data as Record<string, unknown> | undefined
  const ext = data?.extensions as Record<string, unknown> | undefined

  if (resp?.status === 403 || ext?.code === 'PRO_REQUIRED' || data?.title === 'Pro License Required') {
    addToast({
      title: 'Pro Feature',
      description:
        (data?.detail as string) ??
        'This feature requires a Pro license. Please upgrade to use PDF Password Protection and Watermark.',
      color: 'warning'
    })
    return
  }

  addToast({ title: 'Error', description: fallbackMsg, color: 'danger' })
}
