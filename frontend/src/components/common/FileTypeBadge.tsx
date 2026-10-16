import Icon from '@/components/icon'
import { cn } from '@heroui/react'

type Kind = 'word' | 'excel'

/** Normalises the many spellings the API uses (pdf, docx, word, excel, xlsx) to Word / Excel. */
export const fileKind = (value?: string | null): Kind => {
  const v = (value ?? '').toLowerCase()
  return v === 'excel' || v === 'xlsx' || v.includes('excel') ? 'excel' : 'word'
}

/**
 * Calm, neutral template-type badge. Colour is never used here: red means "action / error"
 * and green means "success" elsewhere, so the type is told apart by icon + label only.
 */
const FileTypeBadge = ({ type, className }: { type?: string | null; className?: string }) => {
  const kind = fileKind(type)
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 border border-default-300 px-2 py-0.5 font-mono text-[11px] text-default-500',
        className
      )}>
      <Icon icon={kind === 'excel' ? 'lucide:sheet' : 'lucide:file-text'} className='h-3 w-3' aria-hidden />
      {kind === 'excel' ? 'Excel' : 'Word'}
    </span>
  )
}

export default FileTypeBadge
