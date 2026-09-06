/**
 * Put the pasted text into the URL fragment so a link carries the data.
 * Deflate + base64url keeps typical pastes well under browser URL limits.
 * The fragment never reaches a server, so nothing is uploaded anywhere.
 */

const PREFIX = 'd:' // deflated
const RAW_PREFIX = 'r:' // plain, for environments without CompressionStream

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob(padded)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const source = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(source).arrayBuffer())
}

export async function encodeShare(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  if (typeof CompressionStream === 'undefined') return RAW_PREFIX + toBase64Url(bytes)
  const deflated = await pipe(bytes, new CompressionStream('deflate-raw'))
  return PREFIX + toBase64Url(deflated)
}

export async function decodeShare(fragment: string): Promise<string | null> {
  const f = fragment.startsWith('#') ? fragment.slice(1) : fragment
  if (!f) return null
  try {
    if (f.startsWith(RAW_PREFIX)) {
      return new TextDecoder().decode(fromBase64Url(f.slice(RAW_PREFIX.length)))
    }
    if (f.startsWith(PREFIX)) {
      const inflated = await pipe(fromBase64Url(f.slice(PREFIX.length)), new DecompressionStream('deflate-raw'))
      return new TextDecoder().decode(inflated)
    }
  } catch {
    return null
  }
  return null
}

/** Rough limit above which we warn that the link may not work everywhere. */
export const SHARE_WARN_LENGTH = 8000
