import { describe, expect, it } from 'vitest'

import { formatDuration, humanizeToolName, toolLabel } from './tool-label'

describe('humanizeToolName', () => {
  it.each([
    ['summarize_site', 'Summarize site'],
    ['count_devices', 'Count devices'],
    ['get-device', 'Get device'],
    ['rankDevices', 'Rank devices'],
    ['act', 'Act'],
  ])('%s -> %s', (input, expected) => {
    expect(humanizeToolName(input)).toBe(expected)
  })

  it('returns the identifier unchanged when there is nothing to humanize', () => {
    expect(humanizeToolName('_')).toBe('_')
  })
})

describe('toolLabel', () => {
  it('prefers a supplied label', () => {
    expect(toolLabel('summarize_site', { summarize_site: 'Site status' })).toBe('Site status')
  })

  it('falls back for a tool the host did not name — tools come from the operator\'s MCP server', () => {
    expect(toolLabel('inspect_transformer', { summarize_site: 'Site status' })).toBe(
      'Inspect transformer',
    )
  })
})

describe('formatDuration', () => {
  it.each([
    [420, '0.4s'],
    [1300, '1.3s'],
    [90_000, '90s'],
  ])('%dms -> %s', (input, expected) => {
    expect(formatDuration(input)).toBe(expected)
  })

  it('is null for a step that has not finished', () => {
    expect(formatDuration(undefined)).toBeNull()
  })
})
