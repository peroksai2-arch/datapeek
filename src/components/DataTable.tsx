import { useMemo, useState } from 'react'
import { formatNumber } from '../lib/stats'
import type { Cell, Dataset } from '../lib/types'

const PAGE = 200

function render(cell: Cell, type: string): string {
  if (cell === null) return ''
  if (type === 'number' && typeof cell === 'number') return formatNumber(cell)
  if (type === 'date' && typeof cell === 'string') return cell.replace('T00:00:00.000Z', '').replace('.000Z', 'Z')
  return String(cell)
}

export function DataTable({ dataset }: { dataset: Dataset }) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [filter, setFilter] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const rows = useMemo(() => {
    let out = dataset.rows
    if (filter.trim()) {
      const needle = filter.toLowerCase()
      out = out.filter((r) => Object.values(r).some((v) => v !== null && String(v).toLowerCase().includes(needle)))
    }
    if (sort) {
      const { key, dir } = sort
      out = out.slice().sort((a, b) => {
        const x = a[key]
        const y = b[key]
        if (x === null) return 1
        if (y === null) return -1
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir
        return String(x).localeCompare(String(y)) * dir
      })
    }
    return out
  }, [dataset, filter, sort])

  const toggleSort = (key: string) => {
    setSort((s) => (s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }))
  }

  return (
    <div className="table-wrap">
      <div className="table-tools">
        <input
          type="search"
          placeholder="filter rows"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value)
            setLimit(PAGE)
          }}
        />
        <span className="muted">
          {rows.length === dataset.rows.length
            ? `${rows.length.toLocaleString()} rows`
            : `${rows.length.toLocaleString()} of ${dataset.rows.length.toLocaleString()} rows`}
        </span>
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              {dataset.columns.map((c) => (
                <th key={c.name} onClick={() => toggleSort(c.name)} className={`type-${c.type}`} title={c.type}>
                  {c.name}
                  {sort?.key === c.name && <span className="sort">{sort.dir === 1 ? ' ▲' : ' ▼'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((r, i) => (
              <tr key={i}>
                {dataset.columns.map((c) => (
                  <td key={c.name} className={`type-${c.type}`}>
                    {render(r[c.name], c.type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <button className="more" onClick={() => setLimit((l) => l + PAGE * 5)}>
          show more ({(rows.length - limit).toLocaleString()} remaining)
        </button>
      )}
    </div>
  )
}
