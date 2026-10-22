import type { InstalledApp, InstalledAppsResponse } from '@tetherto/mdk-ui-foundation'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createMdkHarness } from '@/test-utils/mdk-harness'
import { MDK_APP_PANEL_SLOT } from '@/apps/types'
import { useInstalledAppPanels } from '../use-installed-app-panels'

const app = (name: string): InstalledApp => ({
  name,
  id: `io.tether.${name}`,
  version: '0.1.0',
  displayName: name,
  apiBase: `/apps/${name}`,
  ui: { entry: `/app-ui/${name}/index.js`, styles: [] },
})

const Panel = () => null
const loadManifest = vi.fn(async (): Promise<InstalledAppsResponse> => ({
  apps: [app('a'), app('b'), app('broken')],
}))
const importModule = async (url: string) => {
  if (url.includes('broken')) throw new Error('boom')
  const name = url.split('/')[2]!
  return {
    default: {
      id: `io.tether.${name}`,
      displayName: name,
      routes: [],
      panels: [
        { id: `${name}-home`, slot: 'home', component: Panel },
        { id: `${name}-ops`, slot: 'ops', component: Panel },
      ],
    },
  }
}

describe('useInstalledAppPanels', () => {
  it("returns each app's panels for the slot, and the load failures on Home", async () => {
    const harness = createMdkHarness()
    const { result } = renderHook(
      () => useInstalledAppPanels(MDK_APP_PANEL_SLOT.HOME, { loadManifest, importModule }),
      { wrapper: harness.Wrapper },
    )

    await waitFor(() => expect(result.current.panels).toHaveLength(2))
    expect(result.current.panels.map(({ app: a, panel }) => [a.name, panel.id])).toEqual([
      ['a', 'a-home'],
      ['b', 'b-home'],
    ])
    expect(result.current.failures.map((f) => f.app.name)).toEqual(['broken'])
  })

  it('reports failures on Home only', async () => {
    const harness = createMdkHarness()
    const { result } = renderHook(
      () => useInstalledAppPanels('ops', { loadManifest, importModule }),
      {
        wrapper: harness.Wrapper,
      },
    )

    await waitFor(() => expect(result.current.panels).toHaveLength(2))
    expect(result.current.panels.map(({ panel }) => panel.id)).toEqual(['a-ops', 'b-ops'])
    expect(result.current.failures).toEqual([])
  })
})
