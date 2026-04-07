'use client'

import { HeroUIProvider as NextProvider, ToastProvider } from '@heroui/react'
import { useRouter } from 'next/navigation'

export default function HeroUIProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <NextProvider navigate={router.push}>
      <ToastProvider placement='top-center' toastProps={{ variant: 'solid' }} />
      {children}
    </NextProvider>
  )
}
