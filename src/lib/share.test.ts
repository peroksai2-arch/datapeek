import { describe, expect, it } from 'vitest'
import { decodeShare, encodeShare } from './share'

describe('share links', () => {
  it('round-trips unicode text through the fragment', async () => {
    const text = 'name,city\nAda,İstanbul\nLinus,Zürich\n'.repeat(20)
    const fragment = await encodeShare(text)
    expect(fragment.startsWith('d:')).toBe(true)
    expect(fragment).not.toMatch(/[+/=]/) // base64url only
    expect(fragment.length).toBeLessThan(text.length) // repetition compresses well
    expect(await decodeShare('#' + fragment)).toBe(text)
  })

  it('returns null for garbage or empty fragments', async () => {
    expect(await decodeShare('')).toBeNull()
    expect(await decodeShare('#nope')).toBeNull()
    expect(await decodeShare('#d:!!!')).toBeNull()
  })

  it('reads the uncompressed form too', async () => {
    expect(await decodeShare('#r:' + btoa('a,b\n1,2').replace(/=+$/, ''))).toBe('a,b\n1,2')
  })
})
