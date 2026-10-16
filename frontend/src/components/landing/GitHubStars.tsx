'use client'

import { useEffect, useState, type JSX } from 'react'
import { cn } from '@/utils/cn'
import { GITHUB_REPO_API, GITHUB_URL } from './constants'
import { GitHubIcon, StarIcon } from './icons'

const CACHE_KEY = 'qs-stars'
const CACHE_TTL_MS = 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 5000

interface StarCache {
  n: number
  t: number
}

const isStarCache = (value: unknown): value is StarCache =>
  typeof value === 'object' &&
  value !== null &&
  'n' in value &&
  't' in value &&
  typeof value.n === 'number' &&
  typeof value.t === 'number'

const readCache = (): number | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (isStarCache(parsed) && Date.now() - parsed.t < CACHE_TTL_MS) return parsed.n
  } catch {
    // storage blocked or corrupt — fall through to network
  }
  return null
}

const writeCache = (n: number): void => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ n, t: Date.now() }))
  } catch {
    // storage unavailable (private mode) — ignore
  }
}

export const formatStars = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n)

const fetchStars = async (signal: AbortSignal): Promise<number | null> => {
  const res = await fetch(GITHUB_REPO_API, { signal, headers: { Accept: 'application/vnd.github+json' } })
  if (!res.ok) return null
  const body: unknown = await res.json()
  if (typeof body !== 'object' || body === null || !('stargazers_count' in body)) return null
  return typeof body.stargazers_count === 'number' ? body.stargazers_count : null
}

/** Live GitHub stargazer count; "—" while loading or when the API is unreachable. */
export const useGitHubStars = (): number | null => {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    const cached = readCache()
    if (cached !== null) {
      setStars(cached)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    fetchStars(controller.signal)
      .then(n => {
        if (n === null) return
        setStars(n)
        writeCache(n)
      })
      .catch(() => undefined)
      .finally(() => clearTimeout(timer))
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [])

  return stars
}

interface GitHubStarButtonProps {
  className?: string
}

/** Bordered "Star | ★ 1.2k" button linking to the repository. */
export const GitHubStarButton = ({ className }: GitHubStarButtonProps): JSX.Element => {
  const stars = useGitHubStars()
  return (
    <a
      href={GITHUB_URL}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={`Star Qorstack Report on GitHub${stars === null ? '' : ` (${stars} stars)`}`}
      className={cn(
        'inline-flex h-10 border border-default-300 text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors hover:border-foreground',
        className
      )}>
      <span className='inline-flex items-center gap-2 px-[13px]'>
        <GitHubIcon />
        Star
      </span>
      <span className='inline-flex items-center gap-2 border-l border-default-300 bg-content2 px-[13px] font-mono tracking-normal'>
        <StarIcon className='text-primary' />
        <span className='font-medium'>{stars === null ? '—' : formatStars(stars)}</span>
      </span>
    </a>
  )
}

export default GitHubStarButton
