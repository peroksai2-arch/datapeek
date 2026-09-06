import type { Cell, Column, Row } from './types'

export interface ColumnStats {
  count: number
  nulls: number
  distinct: number
  min?: number | string
  max?: number | string
  mean?: number
  median?: number
  top?: { value: string; count: number }[]
}

export function columnStats(column: Column, rows: Row[]): ColumnStats {
  const values = rows.map((r) => r[column.name])
  const present = values.filter((v): v is Exclude<Cell, null> => v !== null)
  const stats: ColumnStats = {
    count: present.length,
    nulls: values.length - present.length,
    distinct: new Set(present.map(String)).size,
  }
  if (column.type === 'number') {
    const nums = (present as number[]).slice().sort((a, b) => a - b)
    if (nums.length) {
      stats.min = nums[0]
      stats.max = nums[nums.length - 1]
      stats.mean = nums.reduce((a, b) => a + b, 0) / nums.length
      const mid = Math.floor(nums.length / 2)
      stats.median = nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
    }
  } else if (column.type === 'date') {
    const sorted = (present as string[]).slice().sort()
    if (sorted.length) {
      stats.min = sorted[0]
      stats.max = sorted[sorted.length - 1]
    }
  }
  if (column.type !== 'number') {
    const counts = new Map<string, number>()
    for (const v of present) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1)
    stats.top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }))
  }
  return stats
}

export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString()
  const abs = Math.abs(n)
  const digits = abs >= 100 ? 1 : abs >= 1 ? 2 : 4
  return n.toLocaleString(undefined, { maximumFractionDigits: digits })
}
