import { describe, expect, it } from 'vitest'
import { aggregate, topN } from './aggregate'
import { columnStats, formatNumber } from './stats'
import type { Row } from './types'

const rows: Row[] = [
  { city: 'Oslo', temp: 4, day: '2024-01-01T00:00:00.000Z' },
  { city: 'Oslo', temp: 6, day: '2024-01-02T00:00:00.000Z' },
  { city: 'Rome', temp: 15, day: '2024-01-01T00:00:00.000Z' },
  { city: 'Rome', temp: null, day: '2024-01-02T00:00:00.000Z' },
  { city: null, temp: 9, day: null },
]

describe('columnStats', () => {
  it('computes numeric summary', () => {
    const s = columnStats({ name: 'temp', type: 'number' }, rows)
    expect(s).toMatchObject({ count: 4, nulls: 1, distinct: 4, min: 4, max: 15, mean: 8.5, median: 7.5 })
  })

  it('computes top values for strings', () => {
    const s = columnStats({ name: 'city', type: 'string' }, rows)
    expect(s.top).toEqual([
      { value: 'Oslo', count: 2 },
      { value: 'Rome', count: 2 },
    ])
    expect(s.nulls).toBe(1)
  })

  it('gives min and max for dates', () => {
    const s = columnStats({ name: 'day', type: 'date' }, rows)
    expect(s.min).toBe('2024-01-01T00:00:00.000Z')
    expect(s.max).toBe('2024-01-02T00:00:00.000Z')
  })
})

describe('aggregate', () => {
  it('sums, averages and counts per group, skipping nulls in y', () => {
    expect(aggregate(rows, 'city', 'temp', 'sum')).toEqual([
      { x: 'Oslo', y: 10, n: 2 },
      { x: 'Rome', y: 15, n: 1 },
      { x: '(blank)', y: 9, n: 1 },
    ])
    expect(aggregate(rows, 'city', 'temp', 'avg')[0]).toEqual({ x: 'Oslo', y: 5, n: 2 })
    expect(aggregate(rows, 'city', null, 'count')).toEqual([
      { x: 'Oslo', y: 2, n: 2 },
      { x: 'Rome', y: 2, n: 2 },
      { x: '(blank)', y: 1, n: 1 },
    ])
  })

  it('sorts numeric and date x axes', () => {
    const r: Row[] = [
      { n: 10, v: 1 },
      { n: 2, v: 1 },
    ]
    expect(aggregate(r, 'n', 'v', 'sum').map((p) => p.x)).toEqual(['2', '10'])
    expect(aggregate(rows.slice(0, 4), 'day', 'temp', 'max').map((p) => p.y)).toEqual([15, 6])
  })
})

describe('topN', () => {
  it('folds the tail into (other)', () => {
    const points = [
      { x: 'a', y: 5, n: 1 },
      { x: 'b', y: 3, n: 1 },
      { x: 'c', y: 1, n: 1 },
      { x: 'd', y: 1, n: 1 },
    ]
    expect(topN(points, 2)).toEqual([
      { x: 'a', y: 5, n: 1 },
      { x: 'b', y: 3, n: 1 },
      { x: '(other)', y: 2, n: 2 },
    ])
    expect(topN(points, 10)).toBe(points)
  })
})

describe('formatNumber', () => {
  it('keeps integers exact and trims decimals by magnitude', () => {
    expect(formatNumber(1234567)).toBe((1234567).toLocaleString())
    expect(formatNumber(123.456)).toBe((123.5).toLocaleString())
    expect(formatNumber(0.123456)).toBe((0.1235).toLocaleString(undefined, { maximumFractionDigits: 4 }))
  })
})
