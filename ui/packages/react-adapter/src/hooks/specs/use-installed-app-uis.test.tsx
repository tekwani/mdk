import type { InstalledApp, InstalledAppsResponse } from '@tetherto/mdk-ui-foundation'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createMdkHarness } from '@/test-utils/mdk-harness'
import { useInstalledAppUis } from '../use-installed-app-uis'

const app = (
  name: string,
  ui: InstalledApp['ui'] = { entry: `/app-ui/${name}/index.js`, styles: [] },
): InstalledApp => ({
  name,
  id: `io.tether.${name}`,
  version: '0.1.0',
  displayName: name,
  apiBase: `/apps/${name}`,
  ui,
})

const Page = () => null

const manifest = (apps: InstalledApp[]) =>
  vi.fn(async (_url: string): Promise<InstalledAppsResponse> => ({ apps }))

const importer = (modules: Record<string, unknown>) =>
  vi.fn(async (url: string) => {
    if (!(url in modules)) throw new Error(`no module at ${url}`)
    return modules[url]
  })

describe('useInstalledAppUis', () => {
  it('loads every installed UI and reports the ones that fail', async () => {
    const harness = createMdkHarness()
    const loadManifest = manifest([app('sentinel'), app('broken'), app('headless', null)])
    const importModule = importer({
      '/app-ui/sentinel/index.js': {
        default: {
          id: 'io.tether.sentinel',
          displayName: 'Sentinel',
          routes: [{ path: '', component: Page }],
          panels: [],
        },
      },
    })

    const { result } = renderHook(() => useInstalledAppUis({ loadManifest, importModule }), {
      wrapper: harness.Wrapper,
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(loadManifest).toHaveBeenCalledWith('/app-ui.json')
    expect(result.current.apps.map(({ app: a, ui }) => [a.name, ui.displayName])).toEqual([
      ['sentinel', 'Sentinel'],
    ])
    expect(result.current.failures.map((f) => f.app.name)).toEqual(['broken'])
    expect(result.current.error).toBeNull()
    expect(importModule).toHaveBeenCalledTimes(2)
  })

  it('is empty, not loading, with no apps installed', async () => {
    const harness = createMdkHarness()
    const { result } = renderHook(
      () => useInstalledAppUis({ loadManifest: manifest([]), importModule: importer({}) }),
      { wrapper: harness.Wrapper },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.apps).toEqual([])
    expect(result.current.failures).toEqual([])
  })

  it('surfaces an app-list failure as `error`', async () => {
    const harness = createMdkHarness()
    const loadManifest = vi.fn(async (): Promise<InstalledAppsResponse> => {
      throw new Error('no app list')
    })
    const { result } = renderHook(
      () => useInstalledAppUis({ loadManifest, importModule: importer({}) }),
      { wrapper: harness.Wrapper },
    )

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.apps).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('does nothing while disabled', () => {
    const harness = createMdkHarness()
    const loadManifest = manifest([])
    const importModule = importer({})
    const { result } = renderHook(
      () => useInstalledAppUis({ enabled: false, loadManifest, importModule }),
      { wrapper: harness.Wrapper },
    )

    expect(result.current.isLoading).toBe(false)
    expect(loadManifest).not.toHaveBeenCalled()
    expect(importModule).not.toHaveBeenCalled()
  })

  it('reads the app list from a custom URL', async () => {
    const harness = createMdkHarness()
    const loadManifest = manifest([])
    renderHook(
      () =>
        useInstalledAppUis({
          manifestUrl: '/dash/app-ui.json',
          loadManifest,
          importModule: importer({}),
        }),
      { wrapper: harness.Wrapper },
    )
    await waitFor(() => expect(loadManifest).toHaveBeenCalledWith('/dash/app-ui.json'))
  })
})
