import type { Row } from './types'

export type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max'

export interface Point {
  x: string
  y: number
  n: number
}

/**
 * Group rows by `xKey` and reduce `yKey` with `agg`. Nulls in y are skipped;
 * `count` counts rows per group regardless of y. Groups keep first-seen
 * order unless x is numeric or a date, in which case they are sorted.
 */
export function aggregate(rows: Row[], xKey: string, yKey: string | null, agg: Aggregation): Point[] {
  const groups = new Map<string, number[]>()
  for (const r of rows) {
    const x = r[xKey]
    const key = x === null ? '(blank)' : String(x)
    const y = yKey ? r[yKey] : null
    const bucket = groups.get(key) ?? []
    if (agg === 'count') bucket.push(1)
    else if (typeof y === 'number') bucket.push(y)
    groups.set(key, bucket)
  }
  const points: Point[] = []
  for (const [x, ys] of groups) {
    let y: number
    switch (agg) {
      case 'sum':
      case 'count':
        y = ys.reduce((a, b) => a + b, 0)
        break
      case 'avg':
        y = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0
        break
      case 'min':
        y = ys.length ? Math.min(...ys) : 0
        break
      case 'max':
        y = ys.length ? Math.max(...ys) : 0
        break
    }
    points.push({ x, y, n: ys.length })
  }
  const allNumeric = points.every((p) => p.x !== '(blank)' && !Number.isNaN(Number(p.x)))
  if (allNumeric) points.sort((a, b) => Number(a.x) - Number(b.x))
  else if (points.every((p) => /^\d{4}-\d{2}-\d{2}/.test(p.x))) points.sort((a, b) => a.x.localeCompare(b.x))
  return points
}

/** Keep the largest `limit` groups and fold the rest into "(other)". */
export function topN(points: Point[], limit: number): Point[] {
  if (points.length <= limit) return points
  const sorted = points.slice().sort((a, b) => b.y - a.y)
  const keep = sorted.slice(0, limit)
  const rest = sorted.slice(limit)
  const other: Point = {
    x: '(other)',
    y: rest.reduce((a, p) => a + p.y, 0),
    n: rest.reduce((a, p) => a + p.n, 0),
  }
  return [...keep, other]
}
