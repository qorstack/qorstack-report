import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const isCloud = process.env.NEXT_PUBLIC_SITE_MODE === 'cloud'
  const { pathname } = request.nextUrl

  if (isCloud && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (!isCloud && pathname === '/') {
    const isAuth = request.cookies.get('is_authenticated')?.value === 'true'
    return NextResponse.redirect(new URL(isAuth ? '/project' : '/login', request.url))
  }
}

export const config = { matcher: ['/', '/login'] }
