import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { DataTable } from './components/DataTable'
import { InputPanel } from './components/InputPanel'
import { StatsPanel } from './components/StatsPanel'
import { SAMPLE } from './lib/sample'
import { parse, ParseError } from './lib/parse'
import { decodeShare, encodeShare, SHARE_WARN_LENGTH } from './lib/share'
import type { Dataset } from './lib/types'

// Recharts is the heaviest dependency; only load it when the chart tab opens.
const ChartPanel = lazy(() => import('./components/ChartPanel').then((m) => ({ default: m.ChartPanel })))

type Tab = 'table' | 'chart' | 'stats'

export default function App() {
  const [text, setText] = useState('')
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('table')
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'long'>('idle')

  // Load data from a shared link on first render.
  useEffect(() => {
    decodeShare(window.location.hash).then((shared) => {
      if (shared) {
        setText(shared)
        load(shared)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback((source: string) => {
    try {
      setDataset(parse(source))
      setError(null)
    } catch (e) {
      setDataset(null)
      setError(e instanceof ParseError ? e.message : String(e))
    }
  }, [])

  const onSubmit = () => load(text)

  const onSample = () => {
    setText(SAMPLE)
    load(SAMPLE)
  }

  const onShare = async () => {
    const fragment = await encodeShare(text)
    const url = `${window.location.origin}${window.location.pathname}#${fragment}`
    window.history.replaceState(null, '', `#${fragment}`)
    try {
      await navigator.clipboard.writeText(url)
      setShareState(url.length > SHARE_WARN_LENGTH ? 'long' : 'copied')
    } catch {
      setShareState('long')
    }
    setTimeout(() => setShareState('idle'), 2500)
  }

  const summary = useMemo(() => {
    if (!dataset) return null
    const types = dataset.columns.reduce<Record<string, number>>((acc, c) => {
      acc[c.type] = (acc[c.type] ?? 0) + 1
      return acc
    }, {})
    const typeText = Object.entries(types)
      .map(([t, n]) => `${n} ${t}`)
      .join(', ')
    return `${dataset.rows.length.toLocaleString()} rows × ${dataset.columns.length} columns (${typeText}), parsed as ${dataset.format.toUpperCase()}`
  }, [dataset])

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>datapeek</h1>
          <p className="tagline">Paste JSON or CSV. Get a table, stats and a chart. Nothing leaves your browser.</p>
        </div>
        <a className="gh" href="https://github.com/peroksai2-arch/datapeek" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </header>

      <InputPanel text={text} onChange={setText} onSubmit={onSubmit} onSample={onSample} />

      {error && <div className="error">{error}</div>}

      {dataset && (
        <section className="results">
          <div className="toolbar">
            <span className="summary">{summary}</span>
            <div className="spacer" />
            <nav className="tabs">
              {(['table', 'chart', 'stats'] as Tab[]).map((t) => (
                <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                  {t}
                </button>
              ))}
            </nav>
            <button className="share" onClick={onShare}>
              {shareState === 'copied' ? 'link copied' : shareState === 'long' ? 'link set in URL (long)' : 'share link'}
            </button>
          </div>
          {tab === 'table' && <DataTable dataset={dataset} />}
          {tab === 'chart' && (
            <Suspense fallback={<p className="muted">loading chart…</p>}>
              <ChartPanel dataset={dataset} />
            </Suspense>
          )}
          {tab === 'stats' && <StatsPanel dataset={dataset} />}
        </section>
      )}

      <footer className="footer">
        Share links put the data in the URL fragment, which browsers never send to a server. Large pastes make long
        links; keep them under a few thousand characters for chat apps.
      </footer>
    </div>
  )
}
