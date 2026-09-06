import { typify } from './infer'
import type { Dataset } from './types'

export class ParseError extends Error {}

/** RFC 4180-ish CSV splitter: quotes, escaped quotes, newlines inside quotes. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

/** Pick the delimiter that gives the most consistent column count. */
export function sniffDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 20).filter(Boolean)
  let best = ','
  let bestScore = -1
  for (const d of [',', '\t', ';', '|']) {
    const counts = sample.map((line) => line.split(d).length)
    const first = counts[0] ?? 0
    if (first < 2) continue
    const consistent = counts.filter((c) => c === first).length
    const score = consistent * 100 + first
    if (score > bestScore) {
      bestScore = score
      best = d
    }
  }
  return best
}

function recordsFromTable(table: string[][]): Record<string, string>[] {
  if (table.length < 1) throw new ParseError('no rows found')
  const header = table[0].map((h, i) => (h.trim() === '' ? `column_${i + 1}` : h.trim()))
  return table.slice(1).map((cells) => {
    const rec: Record<string, string> = {}
    header.forEach((h, i) => {
      rec[h] = cells[i] ?? ''
    })
    return rec
  })
}

function flatten(value: unknown, prefix = '', out: Record<string, unknown> = {}) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out)
    }
  } else if (Array.isArray(value)) {
    out[prefix] = JSON.stringify(value)
  } else {
    out[prefix] = value
  }
  return out
}

/**
 * Accepts: an array of objects, an object holding an array under some key
 * (`{"data": [...]}`), an array of arrays with a header row, or an object of
 * parallel arrays (`{"x": [1,2], "y": [3,4]}`). Nested objects are flattened
 * with dotted keys.
 */
export function recordsFromJson(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    if (value.length === 0) throw new ParseError('empty array')
    if (value.every((v) => Array.isArray(v))) {
      return recordsFromTable((value as unknown[][]).map((r) => r.map(String)))
    }
    if (value.every((v) => v !== null && typeof v === 'object')) {
      return value.map((v) => flatten(v))
    }
    return value.map((v) => ({ value: v }))
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const entries = Object.entries(obj)
    const arrays = entries.filter(([, v]) => Array.isArray(v))
    if (arrays.length === 1 && Array.isArray(arrays[0][1]) && arrays[0][1].some((v) => typeof v === 'object')) {
      return recordsFromJson(arrays[0][1])
    }
    if (arrays.length > 0 && arrays.length === entries.length) {
      const len = Math.max(...arrays.map(([, v]) => (v as unknown[]).length))
      return Array.from({ length: len }, (_, i) => {
        const rec: Record<string, unknown> = {}
        for (const [k, v] of arrays) rec[k] = (v as unknown[])[i]
        return rec
      })
    }
    return [flatten(obj)]
  }
  throw new ParseError('JSON must be an array or an object')
}

export function detectFormat(text: string): Dataset['format'] {
  const t = text.trim()
  if (t.startsWith('[') || t.startsWith('{')) {
    const lines = t.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length > 1 && lines.every((l) => l.trim().startsWith('{') && l.trim().endsWith('}'))) {
      return 'ndjson'
    }
    return 'json'
  }
  return sniffDelimiter(t) === '\t' ? 'tsv' : 'csv'
}

export function parse(text: string): Dataset {
  const t = text.trim()
  if (!t) throw new ParseError('paste some data first')
  const format = detectFormat(t)
  let records: Record<string, unknown>[]
  try {
    if (format === 'json') {
      records = recordsFromJson(JSON.parse(t))
    } else if (format === 'ndjson') {
      records = t
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .map((l) => flatten(JSON.parse(l)))
    } else {
      records = recordsFromTable(parseDelimited(t, sniffDelimiter(t)))
    }
  } catch (e) {
    if (e instanceof ParseError) throw e
    throw new ParseError(`could not parse as ${format}: ${(e as Error).message}`)
  }
  if (records.length === 0) throw new ParseError('no data rows found')
  const { columns, rows } = typify(records)
  return { columns, rows, format }
}
