import { describe, expect, it } from 'vitest'

import { DEFAULT_TIMELINE_OPTIONS, getTimelineOptions } from '../timeline-options'

describe('getTimelineOptions', () => {
  it('omits the 1-minute bucket by default', () => {
    const opts = getTimelineOptions()
    expect(opts.map((o) => o.value)).toEqual(['5m', '30m', '3h', '1D'])
  })

  it('includes the 1-minute bucket when opted in', () => {
    const opts = getTimelineOptions({ includeOneMinute: true })
    expect(opts.map((o) => o.value)).toEqual(['1m', '5m', '30m', '3h', '1D'])
  })

  it('returns a new array — mutating it does not affect the default list', () => {
    const opts = getTimelineOptions()
    opts.pop()
    expect(DEFAULT_TIMELINE_OPTIONS.length).toBe(5)
  })
})
