# datapeek

[![CI](https://github.com/peroksai2-arch/datapeek/actions/workflows/ci.yml/badge.svg)](https://github.com/peroksai2-arch/datapeek/actions/workflows/ci.yml)
[![Live](https://img.shields.io/badge/live-peroksai2--arch.github.io%2Fdatapeek-blue)](https://peroksai2-arch.github.io/datapeek/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Paste JSON or CSV, get a sortable table, per-column statistics and a chart.
Everything runs in the browser; nothing is uploaded. Share a link and the
data travels inside the URL fragment.

**Try it: <https://peroksai2-arch.github.io/datapeek/>**

## What it does

- **Accepts messy input.** CSV, TSV, semicolon or pipe delimited (sniffed
  automatically), JSON arrays of objects, `{"data": [...]}` wrappers, objects
  of parallel arrays, arrays of arrays with a header row, and NDJSON. Nested
  objects are flattened to dotted keys. Quoted fields with embedded commas and
  newlines parse correctly.
- **Infers column types.** Numbers (including `1,234.5`), ISO dates, booleans
  (`yes/no`, `true/false`) and strings. Blanks, `NA`, `null` and `-` become
  nulls instead of poisoning a numeric column.
- **Table.** Click a header to sort, type to filter across all columns,
  numeric columns right-aligned, 200 rows at a time with "show more".
- **Stats.** Per column: fill rate, distinct count, min/max, mean/median for
  numbers, top-5 values for everything else.
- **Chart.** Bar or line with group-by and sum/avg/count/min/max, or a scatter
  of two numeric columns. Long tails fold into "(other)".
- **Share.** The pasted text is deflated and base64url-encoded into the URL
  fragment. Fragments are never sent to servers, so the link is the only copy.

## Why it exists

Looking at a JSON response or a CSV export usually means either squinting at
raw text or firing up a spreadsheet and fighting its import dialog. This is
the middle ground: one paste, immediate feedback, and a link you can drop
in a chat to show a colleague the same view.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest, parsing/inference/stats/aggregation/share round-trips
npm run lint
npm run build
```

Parsing, type inference, statistics, aggregation and share-link encoding live
in `src/lib/` as plain TypeScript with no React dependency, and that is where
the tests are. Components in `src/components/` are thin.

Deploys to GitHub Pages on every push to `main` via
`.github/workflows/deploy.yml`.

## Limits

- The whole dataset lives in memory and the table renders rows on demand;
  a few hundred thousand rows is fine, tens of millions is not the goal.
- Share links grow with the data. Browsers handle very long URLs, but chat
  apps and some proxies do not; the UI warns past roughly 8 kB.
- Dates are parsed only in ISO 8601 form. `12/31/2024` stays a string on
  purpose, because `01/02/2024` is ambiguous.

## License

MIT
