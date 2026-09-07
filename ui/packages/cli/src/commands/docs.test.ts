import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runDocs } from './docs.js'
import { makeConsumerFixture } from '../test-utils.js'

const captureLines = (): { sink: (s: string) => void; out: string[] } => {
  const out: string[] = []
  return { sink: (s: string) => out.push(s), out }
}

describe('runDocs', () => {
  let fixture: ReturnType<typeof makeConsumerFixture>
  beforeEach(() => {
    fixture = makeConsumerFixture()
  })
  afterEach(() => fixture.dispose())

  it('emits the co-located USAGE.md when present', () => {
    const { sink, out } = captureLines()
    runDocs({
      packageName: '@tetherto/mdk-react-devkit',
      componentName: 'LineChartCard',
      cwd: fixture.dir,
      out: sink,
    })
    const text = out.join('\n')
    expect(text).toMatch(/#\s+LineChartCard/)
    expect(text).toMatch(/Props/)
  })

  it('falls back to a synthesised stub when USAGE.md is missing', () => {
    const { sink, out } = captureLines()
    runDocs({
      packageName: '@tetherto/mdk-react-devkit',
      // Accordion now ships a co-located USAGE.md, so it no longer exercises this
      // path. CabinetDetailCard is confirmed to still lack one in the registry.
      componentName: 'CabinetDetailCard',
      cwd: fixture.dir,
      out: sink,
    })
    const text = out.join('\n')
    expect(text).toMatch(/#\s+CabinetDetailCard/)
    expect(text).toMatch(/Props/)
    // Pins the synthesised table to the USAGE.md column shape so the two don't drift apart.
    expect(text).toContain('| Prop | Status | Type | Default | Description |')
    expect(text).toContain('| --- | --- | --- | --- | --- |')
  })

  it('throws for unknown components', () => {
    expect(() =>
      runDocs({
        packageName: '@tetherto/mdk-react-devkit',
        componentName: 'DefinitelyNotAComponent',
        cwd: fixture.dir,
        out: () => {},
      }),
    ).toThrow(/not found/)
  })

  it('emits the co-located USAGE.md for a component that declares kernel capabilities', () => {
    // ActiveIncidentsCard is agent-ready and ships kernelCapabilities, but it now
    // has its own USAGE.md too, so this only exercises the co-located passthrough
    // (docs.ts:33-38) — no registry component currently lacks USAGE.md while
    // declaring kernelCapabilities, so the synthesised "Kernel capabilities:" line
    // (docs.ts:46-47) has no fixture to cover it against.
    const { sink, out } = captureLines()
    runDocs({
      packageName: '@tetherto/mdk-react-devkit',
      componentName: 'ActiveIncidentsCard',
      cwd: fixture.dir,
      out: sink,
    })
    const text = out.join('\n')
    expect(text).toMatch(/#\s+ActiveIncidentsCard/)
  })

  it('uses console.log when no `out` sink is provided', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      runDocs({
        packageName: '@tetherto/mdk-react-devkit',
        componentName: 'LineChartCard',
        cwd: fixture.dir,
      })
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
