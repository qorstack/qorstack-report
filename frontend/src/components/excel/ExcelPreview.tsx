'use client'

import React, { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { Button, Skeleton, Chip } from '@heroui/react'
import Icon from '@/components/icon'

interface CellStyle {
  fill?: string
  fontColor?: string
  bold?: boolean
  italic?: boolean
}

interface CellData {
  value: string
  style?: CellStyle
  /** True when the cell has non-default fill/font color — used to filter "result" view */
  hasStyle: boolean
}

interface SheetData {
  name: string
  headers: CellData[]
  rows: CellData[][]
}

/** Preview mode: "template" shows every cell; "result" shows only styled/colored cells. */
export type ExcelPreviewMode = 'template' | 'result'

interface ExcelPreviewProps {
  url: string | null
  fileName?: string
  /** When "result", only cells with a non-default fill or font color are rendered. */
  mode?: ExcelPreviewMode
}

const looksDefaultColor = (c?: string): boolean => {
  if (!c) return true
  const hex = c.replace(/^#/, '').toLowerCase()
  return hex === '' || hex === '000000' || hex === 'ffffff' || hex === 'transparent'
}

const extractCell = (cell: XLSX.CellObject | undefined): CellData => {
  if (!cell) return { value: '', hasStyle: false }
  const value = cell.w ?? String(cell.v ?? '')
  // xlsx library style format: s.fgColor.rgb / s.font.color.rgb — only present when SheetJS cell-styles is loaded
  const s = (cell as XLSX.CellObject & { s?: { fgColor?: { rgb?: string }; font?: { color?: { rgb?: string }; bold?: boolean; italic?: boolean } } }).s
  const fill = s?.fgColor?.rgb ? `#${s.fgColor.rgb}` : undefined
  const fontColor = s?.font?.color?.rgb ? `#${s.font.color.rgb}` : undefined
  const bold = s?.font?.bold
  const italic = s?.font?.italic
  const hasStyle = (!!fill && !looksDefaultColor(fill)) || (!!fontColor && !looksDefaultColor(fontColor))
  return { value, style: { fill, fontColor, bold, italic }, hasStyle }
}

/**
 * In "result" mode, cells without fill/font color are rendered muted so the
 * dynamically-filled (colored) cells stand out. Full content is still visible
 * so grouping/merging context isn't lost.
 */
const renderCellStyle = (cell: CellData, mode: ExcelPreviewMode): React.CSSProperties => {
  const style: React.CSSProperties = {}
  if (cell.style?.fill && !looksDefaultColor(cell.style.fill)) style.backgroundColor = cell.style.fill
  if (cell.style?.fontColor && !looksDefaultColor(cell.style.fontColor)) style.color = cell.style.fontColor
  if (cell.style?.bold) style.fontWeight = 700
  if (cell.style?.italic) style.fontStyle = 'italic'
  if (mode === 'result' && !cell.hasStyle) style.opacity = 0.35
  return style
}

const renderCellContent = (cell: CellData, _mode: ExcelPreviewMode): React.ReactNode => {
  if (!cell.value) return <span className='text-default-300'>—</span>
  return cell.value
}

const parseExcel = async (url: string): Promise<SheetData[]> => {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  // cellStyles: true is required so fgColor / font.color are populated on each cell
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true })

  return workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name]
    if (!sheet['!ref']) return { name, headers: [], rows: [] }

    const range = XLSX.utils.decode_range(sheet['!ref'])
    const grid: CellData[][] = []

    for (let r = range.s.r; r <= range.e.r; r++) {
      const row: CellData[] = []
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        row.push(extractCell(sheet[addr] as XLSX.CellObject | undefined))
      }
      grid.push(row)
    }

    const headers = grid[0] ?? []
    const rows = grid.slice(1).filter(r => r.some(cell => cell.value !== ''))
    return { name, headers, rows }
  })
}

const ExcelPreview: React.FC<ExcelPreviewProps> = ({ url, fileName, mode = 'template' }) => {
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) {
      setSheets([])
      return
    }

    setIsLoading(true)
    setError(null)
    parseExcel(url)
      .then(data => {
        setSheets(data)
        setActiveSheet(0)
      })
      .catch(() => setError('Failed to load Excel file.'))
      .finally(() => setIsLoading(false))
  }, [url])

  if (!url) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-3 py-20 text-center'>
        <div className='flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10'>
          <Icon icon='lucide:file-spreadsheet' className='h-7 w-7 text-primary' />
        </div>
        <p className='text-sm font-medium text-default-500'>Generate to preview the Excel output</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3 p-4'>
        <Skeleton className='h-8 w-48 rounded-lg' />
        <Skeleton className='h-64 w-full rounded-lg' />
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex flex-col items-center gap-3 py-16 text-center'>
        <Icon icon='lucide:alert-circle' className='h-8 w-8 text-danger' />
        <p className='text-sm text-danger'>{error}</p>
        <Button size='sm' variant='flat' color='danger' onPress={() => window.open(url, '_blank')}>
          Download Instead
        </Button>
      </div>
    )
  }

  const current = sheets[activeSheet]

  return (
    <div className='flex h-full flex-col'>
      {/* Toolbar */}
      <div className='flex items-center justify-between border-b border-default-200 bg-background px-4 py-2'>
        <div className='flex items-center gap-1.5'>
          <Icon icon='lucide:file-spreadsheet' className='h-4 w-4 text-success' />
          <span className='text-xs font-semibold text-default-600'>{fileName || 'output.xlsx'}</span>
          <Chip size='sm' variant='flat' color='primary' className='h-5 text-[10px]'>
            {sheets.length} sheet{sheets.length !== 1 ? 's' : ''}
          </Chip>
        </div>
        <Button
          size='sm'
          variant='flat'
          className='h-7 bg-content3 text-xs font-medium text-default-600'
          startContent={<Icon icon='lucide:download' className='h-3.5 w-3.5' />}
          onPress={() => window.open(url, '_blank')}>
          Download
        </Button>
      </div>

      {/* Sheet Tabs */}
      {sheets.length > 1 && (
        <div className='no-scrollbar flex gap-1 overflow-x-auto border-b border-default-200 bg-background px-3 pt-2'>
          {sheets.map((sheet, idx) => (
            <button
              key={sheet.name}
              onClick={() => setActiveSheet(idx)}
              className={`flex shrink-0 items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSheet === idx
                  ? 'border-default-200 bg-background text-foreground'
                  : 'border-transparent bg-content2 text-default-500 hover:text-default-700'
              }`}>
              <Icon icon='lucide:table-2' className='h-3 w-3' />
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {/* Table — grid borders mimic real Excel cells. In "result" mode only styled cells are shown. */}
      <div className='flex-1 overflow-auto bg-background p-3'>
        {current ? (
          <table className='w-full border-collapse border border-default-300 text-xs'>
            <thead className='sticky top-0 z-10'>
              <tr>
                <th className='w-10 border border-default-300 bg-default-200 px-2 py-1.5 text-center text-[10px] font-bold text-default-500' />
                {current.headers.map((h, i) => (
                  // eslint-disable-next-line react/no-array-index-key -- columns are addressed by index (stable, matches spreadsheet)
                  <th
                    key={`h-${i}`}
                    style={renderCellStyle(h, mode)}
                    className='min-w-[120px] border border-default-300 bg-default-200 px-3 py-1.5 text-left font-semibold text-default-800'>
                    {renderCellContent(h, mode)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={current.headers.length + 1}
                    className='border border-default-300 p-8 text-center italic text-default-400'>
                    No data rows
                  </td>
                </tr>
              ) : (
                current.rows.map((row, rIdx) => (
                  // eslint-disable-next-line react/no-array-index-key -- row order is stable per load, index is a valid identity here
                  <tr key={`r-${rIdx}`} className='group hover:bg-content2/70'>
                    <td className='border border-default-300 bg-default-200 px-2 py-1 text-center text-[10px] font-semibold text-default-500'>
                      {rIdx + 1}
                    </td>
                    {current.headers.map((_, cIdx) => {
                      const cell = row[cIdx] ?? { value: '', hasStyle: false }
                      return (
                        <td
                          key={`c-${rIdx}-${cIdx}`}
                          style={renderCellStyle(cell, mode)}
                          className='border border-default-300 px-3 py-1 text-foreground'>
                          {renderCellContent(cell, mode)}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <div className='p-8 text-center text-sm text-default-400'>Empty sheet</div>
        )}
      </div>

      {/* Footer row count */}
      {current && (
        <div className='border-t border-default-200 bg-background px-4 py-1.5'>
          <span className='text-[10px] text-default-400'>
            {current.rows.length} row{current.rows.length !== 1 ? 's' : ''} · {current.headers.length} column{current.headers.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  )
}

export default ExcelPreview
