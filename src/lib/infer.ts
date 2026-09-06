import type { Cell, Column, ColumnType, Row } from './types'

const NUMBER_RE = /^[-+]?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?([eE][-+]?\d+)?$/
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[-+]\d{2}:?\d{2})?)?$/
const TRUE = new Set(['true', 'yes', 'y'])
const FALSE = new Set(['false', 'no', 'n'])

export function isBlank(raw: unknown): boolean {
  if (raw === null || raw === undefined) return true
  if (typeof raw === 'string') {
    const t = raw.trim().toLowerCase()
    return t === '' || t === 'null' || t === 'na' || t === 'n/a' || t === 'nan' || t === '-'
  }
  return false
}

/** Best type for one raw value, ignoring blanks. */
export function typeOfValue(raw: unknown): ColumnType {
  if (isBlank(raw)) return 'empty'
  if (typeof raw === 'number') return Number.isFinite(raw) ? 'number' : 'empty'
  if (typeof raw === 'boolean') return 'boolean'
  if (raw instanceof Date) return 'date'
  if (typeof raw !== 'string') return 'string'
  const t = raw.trim()
  if (NUMBER_RE.test(t)) return 'number'
  if (ISO_DATE_RE.test(t)) return 'date'
  const l = t.toLowerCase()
  if (TRUE.has(l) || FALSE.has(l)) return 'boolean'
  return 'string'
}

/**
 * Decide a column's type from all its values. A column is numeric only if
 * every non-blank value parses as a number, and so on; anything mixed is a
 * string column.
 */
export function inferColumnType(values: unknown[]): ColumnType {
  let seen: ColumnType | null = null
  for (const v of values) {
    const t = typeOfValue(v)
    if (t === 'empty') continue
    if (seen === null) seen = t
    else if (seen !== t) return 'string'
  }
  return seen ?? 'empty'
}

/** Convert a raw value to the column's type; blanks become null. */
export function coerce(raw: unknown, type: ColumnType): Cell {
  if (isBlank(raw)) return null
  switch (type) {
    case 'number': {
      if (typeof raw === 'number') return raw
      const n = Number(String(raw).trim().replace(/,/g, ''))
      return Number.isFinite(n) ? n : null
    }
    case 'boolean': {
      if (typeof raw === 'boolean') return raw
      const l = String(raw).trim().toLowerCase()
      return TRUE.has(l) ? true : FALSE.has(l) ? false : null
    }
    case 'date': {
      const d = raw instanceof Date ? raw : new Date(String(raw).trim())
      // Keep ISO text so the value round-trips through JSON and sorts lexically.
      return Number.isNaN(d.getTime()) ? null : d.toISOString()
    }
    default:
      return typeof raw === 'string' ? raw : JSON.stringify(raw)
  }
}

/** Build typed columns and rows from raw string/unknown records. */
export function typify(records: Record<string, unknown>[]): { columns: Column[]; rows: Row[] } {
  const names: string[] = []
  const seen = new Set<string>()
  for (const r of records) {
    for (const k of Object.keys(r)) {
      if (!seen.has(k)) {
        seen.add(k)
        names.push(k)
      }
    }
  }
  const columns: Column[] = names.map((name) => ({
    name,
    type: inferColumnType(records.map((r) => r[name])),
  }))
  const rows: Row[] = records.map((r) => {
    const out: Row = {}
    for (const c of columns) out[c.name] = coerce(r[c.name], c.type)
    return out
  })
  return { columns, rows }
}
