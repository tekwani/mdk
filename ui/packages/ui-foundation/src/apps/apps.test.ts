import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  appManifestQueryKey,
  fetchAppManifest,
  MDK_APP_SHARED_MODULES,
  MDK_APP_UI_BASE,
  MDK_APP_UI_MANIFEST,
} from './index'

describe('MDK_APP_SHARED_MODULES', () => {
  it('lists each specifier once, React first', () => {
    expect(new Set(MDK_APP_SHARED_MODULES).size).toBe(MDK_APP_SHARED_MODULES.length)
    expect(MDK_APP_SHARED_MODULES.slice(0, 2)).toEqual(['react', 'react/jsx-runtime'])
  })
})

describe('app UI paths', () => {
  it("stay off the Gateway's /apps prefix, which forwards to the apps' own routes", () => {
    expect(MDK_APP_UI_BASE.startsWith('/apps')).toBe(false)
    expect(MDK_APP_UI_MANIFEST.startsWith('/apps')).toBe(false)
  })
})

describe('fetchAppManifest', () => {
  afterEach(() => vi.unstubAllGlobals())

  it("reads the app list from the page's own origin, with no auth header", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ apps: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAppManifest(MDK_APP_UI_MANIFEST)).resolves.toEqual({ apps: [] })
    expect(fetchMock).toHaveBeenCalledWith('/app-ui.json', {
      headers: { accept: 'application/json' },
    })
  })

  it('names the URL and status when the list cannot be read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    )
    await expect(fetchAppManifest('/app-ui.json')).rejects.toThrow('/app-ui.json (HTTP 404)')
  })

  it('keys the list by its URL', () => {
    expect(appManifestQueryKey('/app-ui.json')).toEqual(['apps', 'manifest', '/app-ui.json'])
  })
})
