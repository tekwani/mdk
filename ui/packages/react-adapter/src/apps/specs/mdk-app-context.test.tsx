import type { InstalledApp } from '@tetherto/mdk-ui-foundation'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { MdkProvider } from '@/provider/mdk-provider'
import { MdkAppProvider, useMdkApp } from '../mdk-app-context'

const sentinel: InstalledApp = {
  name: 'drift',
  id: 'io.tether.sentinel',
  version: '0.2.0',
  displayName: 'Sentinel',
  apiBase: '/apps/drift',
  ui: null,
}

const wrapper = (apiBaseUrl: string) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MdkProvider apiBaseUrl={apiBaseUrl}>
      <MdkAppProvider app={sentinel}>{children}</MdkAppProvider>
    </MdkProvider>
  )
  return Wrapper
}

describe('useMdkApp', () => {
  it('tells an app component which installed app it is', () => {
    const { result } = renderHook(() => useMdkApp(), { wrapper: wrapper('') })
    expect(result.current).toMatchObject({
      name: 'drift',
      id: 'io.tether.sentinel',
      version: '0.2.0',
      displayName: 'Sentinel',
      apiBase: '/apps/drift',
    })
  })

  it('builds URLs under the installed name, not the app id', () => {
    const { result } = renderHook(() => useMdkApp(), { wrapper: wrapper('http://gw.test:3007/') })
    expect(result.current.apiUrl('/status')).toBe('http://gw.test:3007/apps/drift/status')
    expect(result.current.apiUrl('miners/a1')).toBe('http://gw.test:3007/apps/drift/miners/a1')
  })

  it('stays relative behind a same-origin proxy', () => {
    const { result } = renderHook(() => useMdkApp(), { wrapper: wrapper('') })
    expect(result.current.apiUrl('/status')).toBe('/apps/drift/status')
  })

  it('throws outside an app', () => {
    const Wrapper = ({ children }: { children: ReactNode }) => <MdkProvider>{children}</MdkProvider>
    expect(() => renderHook(() => useMdkApp(), { wrapper: Wrapper })).toThrow(
      /inside an app page or panel/,
    )
  })
})
