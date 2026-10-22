import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LineChart } from '../index'

const chart = vi.hoisted(() => {
  const series: Array<{ setData: ReturnType<typeof vi.fn> }> = []
  const timeScale = {
    fitContent: vi.fn(),
    setVisibleLogicalRange: vi.fn(),
    subscribeVisibleLogicalRangeChange: vi.fn(),
    unsubscribeVisibleLogicalRangeChange: vi.fn(),
  }
  const api = {
    addLineSeries: vi.fn(() => {
      const s = { setData: vi.fn(), applyOptions: vi.fn() }
      series.push(s)
      return s
    }),
    removeSeries: vi.fn(),
    applyOptions: vi.fn(),
    timeScale: () => timeScale,
    priceScale: () => ({ applyOptions: vi.fn() }),
    subscribeCrosshairMove: vi.fn(),
    unsubscribeCrosshairMove: vi.fn(),
  }
  return { series, timeScale, api, createChart: vi.fn(() => api) }
})

vi.mock('lightweight-charts', () => ({ createChart: chart.createChart }))

const HOUR = 3_600_000
const points = Array.from({ length: 24 }, (_, i) => ({
  x: 1_700_000_000_000 + i * HOUR,
  y: 70 + i,
}))
// Built once and never changed, like a demo fixture or a one-shot fetch.
const data = { datasets: [{ label: 'Hashrate', borderColor: '#59E8E8', data: points }] }

describe('lineChart', () => {
  beforeEach(() => {
    chart.series.length = 0
    vi.clearAllMocks()
  })

  it('draws data that is already set when lightweight-charts finishes loading', async () => {
    render(<LineChart data={data} timeline="1D" />)

    await waitFor(() => expect(chart.series[0]?.setData).toHaveBeenCalled())
    const drawn = chart.series[0]!.setData.mock.calls.at(-1)![0] as Array<{
      time: number
      value: number
    }>
    expect(drawn).toHaveLength(24)
    expect(drawn[0]).toEqual({ time: points[0]!.x / 1000, value: 70 })
  })

  it('subscribes to visible-range changes once the chart exists', async () => {
    render(<LineChart data={data} />)

    await waitFor(() =>
      expect(chart.timeScale.subscribeVisibleLogicalRangeChange).toHaveBeenCalled(),
    )
  })
})
