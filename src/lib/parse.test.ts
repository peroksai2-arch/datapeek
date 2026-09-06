import { describe, expect, it } from 'vitest'
import { detectFormat, parse, parseDelimited, recordsFromJson, sniffDelimiter } from './parse'

describe('parseDelimited', () => {
  it('handles quotes, escaped quotes and newlines inside quotes', () => {
    const text = 'a,b\n"x, y","he said ""hi"""\n"multi\nline",2\n'
    expect(parseDelimited(text, ',')).toEqual([
      ['a', 'b'],
      ['x, y', 'he said "hi"'],
      ['multi\nline', '2'],
    ])
  })

  it('accepts CRLF and drops trailing empty line', () => {
    expect(parseDelimited('a,b\r\n1,2\r\n', ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('sniffDelimiter', () => {
  it('prefers the delimiter with consistent column counts', () => {
    expect(sniffDelimiter('a;b;c\n1;2;3\n4;5;6')).toBe(';')
    expect(sniffDelimiter('a\tb\n1\t2')).toBe('\t')
    expect(sniffDelimiter('name,note\nx,"a;b;c"\ny,"d;e"')).toBe(',')
  })
})

describe('detectFormat', () => {
  it('distinguishes json, ndjson, csv and tsv', () => {
    expect(detectFormat('[{"a":1}]')).toBe('json')
    expect(detectFormat('{"a":1}\n{"a":2}')).toBe('ndjson')
    expect(detectFormat('a,b\n1,2')).toBe('csv')
    expect(detectFormat('a\tb\n1\t2')).toBe('tsv')
  })
})

describe('recordsFromJson', () => {
  it('flattens nested objects with dotted keys', () => {
    expect(recordsFromJson([{ id: 1, user: { name: 'ada', tags: ['x'] } }])).toEqual([
      { id: 1, 'user.name': 'ada', 'user.tags': '["x"]' },
    ])
  })

  it('unwraps a single array under a key', () => {
    expect(recordsFromJson({ data: [{ a: 1 }, { a: 2 }] })).toEqual([{ a: 1 }, { a: 2 }])
  })

  it('zips an object of parallel arrays', () => {
    expect(recordsFromJson({ x: [1, 2], y: ['a', 'b'] })).toEqual([
      { x: 1, y: 'a' },
      { x: 2, y: 'b' },
    ])
  })

  it('treats array of arrays as header plus rows', () => {
    expect(recordsFromJson([['a', 'b'], [1, 2]])).toEqual([{ a: '1', b: '2' }])
  })

  it('wraps scalars', () => {
    expect(recordsFromJson([1, 2])).toEqual([{ value: 1 }, { value: 2 }])
  })
})

describe('parse (end to end)', () => {
  it('infers types from CSV', () => {
    const ds = parse('name,age,joined,active\nada,36,2020-01-05,yes\nbob,,2021-03-02,no\n')
    expect(ds.format).toBe('csv')
    expect(ds.columns).toEqual([
      { name: 'name', type: 'string' },
      { name: 'age', type: 'number' },
      { name: 'joined', type: 'date' },
      { name: 'active', type: 'boolean' },
    ])
    expect(ds.rows[1]).toEqual({ name: 'bob', age: null, joined: '2021-03-02T00:00:00.000Z', active: false })
  })

  it('parses thousands separators as numbers', () => {
    const ds = parse('amount\n"1,234.5"\n"2,000"')
    expect(ds.columns[0].type).toBe('number')
    expect(ds.rows.map((r) => r.amount)).toEqual([1234.5, 2000])
  })

  it('falls back to string for mixed columns', () => {
    const ds = parse('v\n1\nx\n')
    expect(ds.columns[0].type).toBe('string')
  })

  it('names blank headers', () => {
    const ds = parse(',b\n1,2')
    expect(ds.columns.map((c) => c.name)).toEqual(['column_1', 'b'])
  })

  it('reports useful errors', () => {
    expect(() => parse('')).toThrow('paste some data')
    expect(() => parse('[')).toThrow(/could not parse as json/)
    expect(() => parse('42')).toThrow()
  })
})
