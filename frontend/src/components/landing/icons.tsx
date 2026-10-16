import type { JSX } from 'react'

interface IconProps {
  size?: number
  className?: string
}

export const GitHubIcon = ({ size = 15, className }: IconProps): JSX.Element => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' className={className}>
    <path d='M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z' />
  </svg>
)

export const StarIcon = ({ size = 13, className }: IconProps): JSX.Element => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' className={className}>
    <path d='M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z' />
  </svg>
)

export const ArrowIcon = ({ size = 16, className }: IconProps): JSX.Element => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2.4}
    strokeLinecap='square'
    aria-hidden='true'
    className={className}>
    <path d='M4 12h15M13 6l6 6-6 6' />
  </svg>
)
