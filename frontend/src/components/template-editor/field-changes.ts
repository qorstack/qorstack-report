// Fields in the editor are read from the template file (the backend syncs the saved test data with the
// file's markers). These helpers compare two field lists — used to show what a Replace file changed —
// and read saved payload sections defensively, so an old or malformed entry is skipped instead of crashing.

import type { FieldChanges } from './BuilderLayout'

interface FieldState {
  replace: { key: string }[]
  table: { columns: string[] }[]
  image: { key: string }[]
  qrcode: { key: string }[]
  barcode: { key: string }[]
}

const bare = (key: string) => key.replace(/^\{\{/, '').replace(/\}\}$/, '').trim()

/** Every field the template expects, as the marker you would type in the file (e.g. `{{qrcode:link}}`). */
export const fieldMarkers = (state: FieldState): string[] => {
  const out = new Set<string>()
  state.replace.forEach(f => bare(f.key) && out.add(`{{${bare(f.key)}}}`))
  state.image.forEach(f => bare(f.key) && out.add(`{{${bare(f.key)}}}`))
  state.qrcode.forEach(f => bare(f.key) && out.add(`{{${bare(f.key)}}}`))
  state.barcode.forEach(f => bare(f.key) && out.add(`{{${bare(f.key)}}}`))
  state.table.forEach(t =>
    t.columns.forEach(c => {
      const col = bare(c).replace(/^row:/, '')
      if (col) out.add(`{{row:${col}}}`)
    })
  )
  return [...out]
}

export const diffFields = (before: string[], after: string[]): FieldChanges => {
  const b = new Set(before)
  const a = new Set(after)
  return { added: after.filter(f => !b.has(f)), removed: before.filter(f => !a.has(f)) }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Entries of a saved object-map section; skips blank keys and non-object items when `objects` is set. */
export const savedEntries = <T = unknown>(section: unknown, objects = false): [string, T][] => {
  if (!isRecord(section)) return []
  return Object.entries(section).filter(
    ([key, value]) => key.trim() !== '' && (!objects || isRecord(value))
  ) as [string, T][]
}

/** Saved table list; skips entries that are not objects. */
export const savedTables = <T>(section: unknown): T[] =>
  Array.isArray(section) ? (section.filter(isRecord) as T[]) : []
