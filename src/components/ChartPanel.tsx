import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { aggregate, topN, type Aggregation } from '../lib/aggregate'
import { formatNumber } from '../lib/stats'
import type { Dataset } from '../lib/types'

type Kind = 'bar' | 'line' | 'scatter'

export function ChartPanel({ dataset }: { dataset: Dataset }) {
  const numeric = dataset.columns.filter((c) => c.type === 'number')
  const categorical = dataset.columns.filter((c) => c.type !== 'number' || dataset.rows.length <= 50)

  const [x, setX] = useState(() => (categorical[0] ?? dataset.columns[0]).name)
  const [y, setY] = useState<string>(() => numeric[0]?.name ?? '')
  const [agg, setAgg] = useState<Aggregation>(numeric.length ? 'sum' : 'count')
  const [kind, setKind] = useState<Kind>('bar')
  const [limit, setLimit] = useState(30)

  const points = useMemo(() => {
    if (kind === 'scatter') return []
    return topN(aggregate(dataset.rows, x, agg === 'count' ? null : y || null, agg), limit)
  }, [dataset, x, y, agg, kind, limit])

  const scatter = useMemo(() => {
    if (kind !== 'scatter') return []
    return dataset.rows
      .filter((r) => typeof r[x] === 'number' && typeof r[y] === 'number')
      .map((r) => ({ x: r[x] as number, y: r[y] as number }))
  }, [dataset, x, y, kind])

  const yLabel = agg === 'count' ? 'count' : `${agg}(${y})`
  const fmt = (v: number) => formatNumber(v)

  return (
    <div className="chart">
      <div className="controls">
        <label>
          type
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="bar">bar</option>
            <option value="line">line</option>
            <option value="scatter" disabled={numeric.length < 2}>
              scatter
            </option>
          </select>
        </label>
        <label>
          x
          <select value={x} onChange={(e) => setX(e.target.value)}>
            {(kind === 'scatter' ? numeric : dataset.columns).map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {kind !== 'scatter' && (
          <label>
            aggregate
            <select value={agg} onChange={(e) => setAgg(e.target.value as Aggregation)}>
              <option value="count">count</option>
              {numeric.length > 0 && (
                <>
                  <option value="sum">sum</option>
                  <option value="avg">avg</option>
                  <option value="min">min</option>
                  <option value="max">max</option>
                </>
              )}
            </select>
          </label>
        )}
        {(kind === 'scatter' || agg !== 'count') && (
          <label>
            y
            <select value={y} onChange={(e) => setY(e.target.value)}>
              {numeric.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind !== 'scatter' && (
          <label>
            groups
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              {[10, 30, 100, 1000].map((n) => (
                <option key={n} value={n}>
                  top {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="plot">
        <ResponsiveContainer width="100%" height={380}>
          {kind === 'bar' ? (
            <BarChart data={points} margin={{ top: 10, right: 20, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis dataKey="x" angle={-30} textAnchor="end" interval={0} height={70} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmt} width={70} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [fmt(Number(v)), yLabel]} contentStyle={{ background: 'var(--panel)' }} />
              <Bar dataKey="y" fill="var(--accent)" radius={[3, 3, 0, 0]} />
            </BarChart>
          ) : kind === 'line' ? (
            <LineChart data={points} margin={{ top: 10, right: 20, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis dataKey="x" angle={-30} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmt} width={70} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [fmt(Number(v)), yLabel]} contentStyle={{ background: 'var(--panel)' }} />
              <Line type="monotone" dataKey="y" stroke="var(--accent)" dot={points.length < 60} strokeWidth={2} />
            </LineChart>
          ) : (
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis dataKey="x" name={x} type="number" tickFormatter={fmt} tick={{ fontSize: 11 }} />
              <YAxis dataKey="y" name={y} type="number" tickFormatter={fmt} width={70} tick={{ fontSize: 11 }} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(v, name) => [fmt(Number(v)), name === 'x' ? x : y]}
                contentStyle={{ background: 'var(--panel)' }}
              />
              <Scatter data={scatter} fill="var(--accent)" fillOpacity={0.7} />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>
      <p className="muted">
        {kind === 'scatter'
          ? `${scatter.length.toLocaleString()} points`
          : `${points.length} groups by ${x}, ${yLabel}`}
      </p>
    </div>
  )
}
