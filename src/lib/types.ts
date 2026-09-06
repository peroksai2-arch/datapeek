export type ColumnType = 'number' | 'string' | 'boolean' | 'date' | 'empty'

export type Cell = number | string | boolean | null

export interface Column {
  name: string
  type: ColumnType
}

export type Row = Record<string, Cell>

export interface Dataset {
  columns: Column[]
  rows: Row[]
  /** Which parser produced it. */
  format: 'csv' | 'tsv' | 'json' | 'ndjson'
}
