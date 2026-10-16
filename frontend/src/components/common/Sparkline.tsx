'use client'

import React, { useMemo } from 'react'

interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  className?: string
  /** Tailwind color class for the line / area, e.g. 'text-default-500' */
  colorClass?: string
}

/**
 * Compact inline SVG sparkline. Designed to live inside cards/rows — no axes, no tooltips.
 * Renders a smooth area fill + line. All-zero series renders as a flat baseline.
 */
export const Sparkline = ({
  values,
  width = 90,
  height = 22,
  className,
  colorClass = 'text-default-500'
}: SparklineProps) => {
  const { line, area } = useMemo(() => {
    if (!values.length) return { line: '', area: '' }
    const max = Math.max(...values, 1)
    const stepX = values.length > 1 ? width / (values.length - 1) : 0
    const points = values.map((v, i) => {
      const x = i * stepX
      const y = height - (v / max) * (height - 2) - 1
      return [x, y] as const
    })
    const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
    const areaPath = `${linePath} L${width},${height} L0,${height} Z`
    return { line: linePath, area: areaPath }
  }, [values, width, height])

  if (!values.length) {
    return <div className={className} style={{ width, height }} aria-hidden />
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`${colorClass} ${className ?? ''}`}
      preserveAspectRatio='none'
      aria-hidden>
      <path d={area} fill='currentColor' fillOpacity={0.18} />
      <path d={line} fill='none' stroke='currentColor' strokeWidth={1.2} strokeLinejoin='round' strokeLinecap='round' vectorEffect='non-scaling-stroke' />
    </svg>
  )
}
