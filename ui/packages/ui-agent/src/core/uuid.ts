/**
 * Ids for conversations and messages.
 *
 * `crypto.randomUUID` is defined only in a secure context, and a gateway on a
 * site LAN is routinely reached over plain http — the UI is served from the
 * gateway's own `staticRootPath`, so `http://10.0.0.4:3000` is an ordinary
 * deployment rather than an edge case. There `randomUUID` is undefined, and
 * calling it would throw on conversation creation and on every send, i.e. the
 * panel would be dead on arrival. `getRandomValues` is available in insecure
 * contexts, so the v4 shape is assembled from it instead.
 */

/** Version and variant bits, per RFC 4122 §4.4. */
const VERSION_BYTE = 6
const VARIANT_BYTE = 8

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function uuidFromBytes(bytes: Uint8Array): string {
  const stamped = Uint8Array.from(bytes)
  stamped[VERSION_BYTE] = ((stamped[VERSION_BYTE] ?? 0) & 0x0F) | 0x40
  stamped[VARIANT_BYTE] = ((stamped[VARIANT_BYTE] ?? 0) & 0x3F) | 0x80

  const digits = hex(stamped)
  return [
    digits.slice(0, 8),
    digits.slice(8, 12),
    digits.slice(12, 16),
    digits.slice(16, 20),
    digits.slice(20, 32),
  ].join('-')
}

/**
 * A v4 UUID where the platform offers one, and a v4-shaped id built from
 * `getRandomValues` where it does not.
 *
 * These ids never leave the browser — they key conversations and messages in
 * localStorage and React lists — so the only requirement is that two of them
 * never collide within one browser.
 */
export function uuid(): string {
  const source = globalThis.crypto as Crypto | undefined

  if (typeof source?.randomUUID === 'function') return source.randomUUID()
  if (typeof source?.getRandomValues === 'function') {
    return uuidFromBytes(source.getRandomValues(new Uint8Array(16)))
  }

  // No WebCrypto at all: a very old browser, or a stripped non-browser global.
  // Uniqueness within one tab is all these ids are asked for.
  const bytes = new Uint8Array(16)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256)
  }
  return uuidFromBytes(bytes)
}
