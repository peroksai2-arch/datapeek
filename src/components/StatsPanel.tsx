import { useMemo } from 'react'
import { columnStats, formatNumber } from '../lib/stats'
import type { Dataset } from '../lib/types'

/** Dates round-trip as full ISO strings; show the short form when there is no time part. */
const pretty = (v: string) => v.replace('T00:00:00.000Z', '').replace('.000Z', 'Z')

export function StatsPanel({ dataset }: { dataset: Dataset }) {
  const stats = useMemo(
    () => dataset.columns.map((c) => ({ column: c, s: columnStats(c, dataset.rows) })),
    [dataset],
  )
  const n = dataset.rows.length

  return (
    <div className="stats">
      {stats.map(({ column, s }) => (
        <div key={column.name} className="stat-card">
          <div className="stat-head">
            <strong>{column.name}</strong>
            <span className={`badge type-${column.type}`}>{column.type}</span>
          </div>
          <dl>
            <dt>filled</dt>
            <dd>
              {s.count.toLocaleString()} / {n.toLocaleString()}
              {s.nulls > 0 && <span className="muted"> ({((100 * s.nulls) / n).toFixed(0)}% blank)</span>}
            </dd>
            <dt>distinct</dt>
            <dd>{s.distinct.toLocaleString()}</dd>
            {s.min !== undefined && (
              <>
                <dt>min</dt>
                <dd>{typeof s.min === 'number' ? formatNumber(s.min) : pretty(String(s.min))}</dd>
                <dt>max</dt>
                <dd>{typeof s.max === 'number' ? formatNumber(s.max) : pretty(String(s.max))}</dd>
              </>
            )}
            {s.mean !== undefined && (
              <>
                <dt>mean</dt>
                <dd>{formatNumber(s.mean)}</dd>
                <dt>median</dt>
                <dd>{formatNumber(s.median ?? 0)}</dd>
              </>
            )}
          </dl>
          {s.top && s.top.length > 0 && (
            <ul className="top">
              {s.top.map((t) => (
                <li key={t.value}>
                  <span className="bar" style={{ width: `${(100 * t.count) / (s.count || 1)}%` }} />
                  <span className="label" title={t.value}>
                    {column.type === 'date' ? pretty(t.value) : t.value}
                  </span>
                  <span className="count">{t.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
