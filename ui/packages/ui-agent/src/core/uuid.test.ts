import { afterEach, describe, expect, it, vi } from 'vitest'

import { uuid } from './uuid'

const UUID_V4 = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('uuid', () => {
  it('uses the platform generator when there is one', () => {
    expect(uuid()).toMatch(UUID_V4)
  })

  it('falls back to getRandomValues on an insecure origin', () => {
    // `crypto.randomUUID` is secure-context only, and a gateway on a site LAN is
    // reached over plain http — the panel is served from its own staticRootPath.
    // Without a fallback, creating a conversation throws and nothing can be sent.
    const { getRandomValues } = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: getRandomValues.bind(globalThis.crypto) })

    const first = uuid()
    expect(first).toMatch(UUID_V4)
    expect(uuid()).not.toBe(first)
  })

  it('still produces an id with no WebCrypto at all', () => {
    vi.stubGlobal('crypto', undefined)

    expect(uuid()).toMatch(UUID_V4)
  })
})
