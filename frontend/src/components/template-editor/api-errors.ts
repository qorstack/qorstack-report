// Maps render-API validation errors (400, keys are JSON paths such as `replace[3].key`, `table[0].rows[12]`,
// `image[0].fit`) back onto the builder's fields, so the editor can highlight the right row.

export type EditorCategory = 'text' | 'tables' | 'image' | 'qrcode' | 'barcode' | 'settings'

interface KeyedItem {
  id: string
  key: string
}

export interface EditorErrorState {
  replace: KeyedItem[]
  table: { id: string }[]
  image: KeyedItem[]
  qrcode: KeyedItem[]
  barcode: KeyedItem[]
}

export interface MappedError {
  label: string
  message: string
  category: EditorCategory
  /** DOM id to focus / scroll to. */
  focusId?: string
}

export interface MappedErrors {
  /** Keyed the way the field sections read errors: `${itemId}`, `${itemId}-src`, `${tableId}-row-${n}`. */
  fieldErrors: Record<string, string>
  summary: MappedError[]
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Reads `{ errors: { path: [messages] } }` from an API error (ValidationProblemDetails). */
export const readValidationErrors = (error: unknown): Record<string, string> | null => {
  if (!isRecord(error)) return null
  const data = isRecord(error.data) ? error.data : isRecord(error.error) ? error.error : null
  const errors = data && isRecord(data.errors) ? data.errors : null
  if (!errors) return null
  const out: Record<string, string> = {}
  Object.entries(errors).forEach(([path, messages]) => {
    const msg = Array.isArray(messages) ? messages.filter(m => typeof m === 'string').join(' ') : String(messages)
    if (msg) out[path] = msg
  })
  return Object.keys(out).length ? out : null
}

const bareKey = (key: string) =>
  key
    .replace(/^\{\{/, '')
    .replace(/\}\}$/, '')
    .replace(/^(image|qrcode|barcode|row):/, '')
    .trim()

/** The request is built from a map, so item N is the N-th distinct key (first occurrence). */
const nthDistinct = (items: KeyedItem[], index: number): KeyedItem | undefined => {
  const seen = new Set<string>()
  const distinct: KeyedItem[] = []
  items.forEach(item => {
    const k = bareKey(item.key)
    if (!seen.has(k)) {
      seen.add(k)
      distinct.push(item)
    }
  })
  return distinct[index]
}

const CATEGORY: Record<string, EditorCategory> = {
  replace: 'text',
  image: 'image',
  qrcode: 'qrcode',
  barcode: 'barcode'
}

/** Field suffixes that have their own error slot in the row (`${id}-src`, `${id}-text`, `${id}-fit`). */
const DETAIL_FIELDS = new Set(['src', 'fit', 'text', 'size', 'width', 'height', 'format'])

export const mapRenderErrors = (raw: Record<string, string>, state: EditorErrorState): MappedErrors => {
  const fieldErrors: Record<string, string> = {}
  const summary: MappedError[] = []

  Object.entries(raw).forEach(([path, message]) => {
    const keyed = /^(replace|image|qrcode|barcode)(?:\[(\d+)\])?(?:\.(\w+))?/.exec(path)
    if (keyed) {
      const [, field, idx, prop] = keyed
      const category = CATEGORY[field]
      const list = state[field as 'replace' | 'image' | 'qrcode' | 'barcode']
      const item = idx !== undefined ? nthDistinct(list, Number(idx)) : undefined
      if (item) {
        const slot = prop && DETAIL_FIELDS.has(prop) ? `${item.id}-${prop}` : item.id
        fieldErrors[slot] = message
        summary.push({
          label: `{{${bareKey(item.key) || field}}}${prop && prop !== 'key' ? ` ${prop}` : ''}`,
          message,
          category,
          focusId: field === 'replace' ? `value-${item.id}` : `row-${item.id}`
        })
      } else {
        summary.push({ label: field, message, category })
      }
      return
    }

    const table = /^table\[(\d+)\](?:\.rows\[(\d+)\])?/.exec(path)
    if (table) {
      const [, t, r] = table
      const item = state.table[Number(t)]
      if (item) {
        const slot = r !== undefined ? `${item.id}-row-${r}` : item.id
        fieldErrors[slot] = message
        summary.push({
          label: `Table ${Number(t) + 1}${r !== undefined ? `, row ${Number(r) + 1}` : ''}`,
          message,
          category: 'tables',
          focusId: r !== undefined ? `table-${item.id}-row-${r}` : `row-${item.id}`
        })
      } else {
        summary.push({ label: `Table ${Number(t) + 1}`, message, category: 'tables' })
      }
      return
    }

    summary.push({ label: path, message, category: 'settings' })
  })

  return { fieldErrors, summary }
}

/** Scrolls to and focuses an element by id once it is rendered (after a category switch). */
export const focusWhenRendered = (id: string | undefined, attempts = 10) => {
  if (!id || typeof window === 'undefined') return
  const el = document.getElementById(id)
  if (el instanceof HTMLElement) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (el instanceof HTMLInputElement) el.focus()
    return
  }
  if (attempts > 0) window.setTimeout(() => focusWhenRendered(id, attempts - 1), 60)
}
