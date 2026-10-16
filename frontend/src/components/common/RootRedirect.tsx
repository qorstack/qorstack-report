'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { Spinner } from '@heroui/react'

/** Self-host root: there is no landing page — go to the app or to sign-in (was a server proxy before the static export). */
const RootRedirect = () => {
  const router = useRouter()

  useEffect(() => {
    router.replace(Cookies.get('is_authenticated') === 'true' ? '/project' : '/login')
  }, [router])

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-background' role='status' aria-label='Loading'>
      <Spinner color='default' />
    </div>
  )
}

export default RootRedirect
