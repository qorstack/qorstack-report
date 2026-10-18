'use client'

import { useMemo } from 'react'
import { useParams, usePathname } from 'next/navigation'

/** Placeholder id the static export is built with (see generateStaticParams in the [id] layouts). */
export const STATIC_ID_PLACEHOLDER = '_'

/** URL prefixes whose next segment is the [id] (mirrors WebUiHosting.DynamicRoutes in the backend). */
const DYNAMIC_ROUTES: readonly string[][] = [['project'], ['pdf', 'templates'], ['excel', 'templates']]

const idFromPath = (pathname: string): string | undefined => {
  const segments = pathname.split('/').filter(Boolean)
  for (const route of DYNAMIC_ROUTES) {
    if (segments.length > route.length && route.every((part, i) => segments[i] === part)) {
      return decodeURIComponent(segments[route.length])
    }
  }
  return undefined
}

/**
 * Like `useParams()`, but correct in the static export served by the backend: every /project/{id} page is
 * exported once with id "_" and the backend serves that file for any id, so the real id is read from the URL.
 * In `next dev` / server builds it simply returns `useParams()`.
 */
export const useRouteParams = <T extends Record<string, string | string[] | undefined> = { id?: string }>(): T => {
  const params = useParams() as T
  const pathname = usePathname()

  return useMemo(() => {
    if (params?.id !== STATIC_ID_PLACEHOLDER) return params
    // usePathname() first: during a client-side navigation it already holds the new route while
    // window.location still shows the previous page (e.g. /project/{projectId} → /pdf/templates/{key}
    // read the project id as the template key → 404). window.location is only the fallback for when
    // the router still reports the exported placeholder path.
    const fromRouter = idFromPath(pathname ?? '')
    const fromBrowser = typeof window !== 'undefined' ? idFromPath(window.location.pathname) : undefined
    const id = fromRouter && fromRouter !== STATIC_ID_PLACEHOLDER ? fromRouter : fromBrowser
    return { ...params, id: id ?? params.id } as T
  }, [params, pathname])
}
