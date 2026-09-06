import { useRef, useState, type DragEvent } from 'react'

interface Props {
  text: string
  onChange: (text: string) => void
  onSubmit: () => void
  onSample: () => void
}

export function InputPanel({ text, onChange, onSubmit, onSample }: Props) {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const readFile = (file: File) => {
    file.text().then((content) => {
      onChange(content)
      // Let the state settle, then parse. Cheaper than threading callbacks.
      setTimeout(onSubmit, 0)
    })
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) readFile(file)
  }

  return (
    <section
      className={`input ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onSubmit()
        }}
        placeholder={'Paste CSV, TSV, JSON or NDJSON here, or drop a file.\n\nCtrl+Enter to parse.'}
        spellCheck={false}
      />
      <div className="input-actions">
        <button className="primary" onClick={onSubmit} disabled={!text.trim()}>
          Parse
        </button>
        <button onClick={() => fileRef.current?.click()}>Open file</button>
        <button onClick={onSample}>Try sample</button>
        <button
          onClick={() => onChange('')}
          disabled={!text}
          title="Clear the text area (the share link, if any, stays in the URL until you share again)"
        >
          Clear
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,.json,.ndjson,.jsonl"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) readFile(f)
            e.target.value = ''
          }}
        />
      </div>
    </section>
  )
}
