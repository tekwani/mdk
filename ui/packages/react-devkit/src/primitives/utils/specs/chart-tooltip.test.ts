// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

import { buildChartTooltip } from '../chart-tooltip'

describe('buildChartTooltip', () => {
  it('returns disabled external tooltip config', () => {
    const result = buildChartTooltip()

    expect(result.enabled).toBe(false)
    expect(result.external).toBeDefined()
    expect(typeof result.external).toBe('function')
    expect(result.mode).toBe('index')
    expect(result.intersect).toBe(false)
  })

  it('accepts custom mode and intersect', () => {
    const result = buildChartTooltip({ mode: 'nearest', intersect: true })

    expect(result.mode).toBe('nearest')
    expect(result.intersect).toBe(true)
  })

  it('external handler creates tooltip element when opacity > 0', () => {
    const tooltip = buildChartTooltip()
    const externalHandler = tooltip.external!

    const mockCanvas = document.createElement('canvas')
    const mockContainer = document.createElement('div')
    mockContainer.appendChild(mockCanvas)
    document.body.appendChild(mockContainer)

    const mockChart = {
      canvas: mockCanvas,
    }

    const mockTooltipModel = {
      opacity: 1,
      title: ['Test Title'],
      dataPoints: [
        {
          dataset: { label: 'Series 1', borderColor: '#FF0000' },
          parsed: { y: 42 },
        },
      ],
    }

    externalHandler({ chart: mockChart as any, tooltip: mockTooltipModel as any })

    const tooltipEl = mockContainer.querySelector('[data-msdk-chart-tooltip]')
    expect(tooltipEl).toBeTruthy()
    expect(tooltipEl?.innerHTML).toContain('Series 1')
    expect(tooltipEl?.innerHTML).toContain('42')

    document.body.removeChild(mockContainer)
  })

  it('external handler hides tooltip when opacity is 0', () => {
    const tooltip = buildChartTooltip()
    const externalHandler = tooltip.external!

    const mockCanvas = document.createElement('canvas')
    const mockContainer = document.createElement('div')
    mockContainer.appendChild(mockCanvas)
    document.body.appendChild(mockContainer)

    const tooltipEl = document.createElement('div')
    tooltipEl.setAttribute('data-msdk-chart-tooltip', '')
    tooltipEl.style.opacity = '1'
    mockContainer.appendChild(tooltipEl)

    const mockChart = {
      canvas: mockCanvas,
    }

    const mockTooltipModel = {
      opacity: 0,
      title: [],
      dataPoints: [],
    }

    externalHandler({ chart: mockChart as any, tooltip: mockTooltipModel as any })

    expect(tooltipEl.style.opacity).toBe('0')

    document.body.removeChild(mockContainer)
  })

  it('uses custom valueFormatter', () => {
    const valueFormatter = (v: number) => `${v.toFixed(2)} TH/s`
    const tooltip = buildChartTooltip({ valueFormatter })
    const externalHandler = tooltip.external!

    const mockCanvas = document.createElement('canvas')
    const mockContainer = document.createElement('div')
    mockContainer.appendChild(mockCanvas)
    document.body.appendChild(mockContainer)

    const mockChart = {
      canvas: mockCanvas,
    }

    const mockTooltipModel = {
      opacity: 1,
      title: [],
      dataPoints: [
        {
          dataset: { label: 'Hashrate', borderColor: '#00FF00' },
          parsed: { y: 123.456 },
        },
      ],
    }

    externalHandler({ chart: mockChart as any, tooltip: mockTooltipModel as any })

    const tooltipEl = mockContainer.querySelector('[data-msdk-chart-tooltip]')
    expect(tooltipEl?.innerHTML).toContain('123.46 TH/s')

    document.body.removeChild(mockContainer)
  })

  it('shows title when showTitle is true', () => {
    const tooltip = buildChartTooltip({ showTitle: true })
    const externalHandler = tooltip.external!

    const mockCanvas = document.createElement('canvas')
    const mockContainer = document.createElement('div')
    mockContainer.appendChild(mockCanvas)
    document.body.appendChild(mockContainer)

    const mockChart = {
      canvas: mockCanvas,
    }

    const mockTooltipModel = {
      opacity: 1,
      title: ['January 2024'],
      dataPoints: [
        {
          dataset: { label: 'Data', borderColor: '#0000FF' },
          parsed: { y: 100 },
        },
      ],
    }

    externalHandler({ chart: mockChart as any, tooltip: mockTooltipModel as any })

    const tooltipEl = mockContainer.querySelector('[data-msdk-chart-tooltip]')
    expect(tooltipEl?.innerHTML).toContain('January 2024')

    document.body.removeChild(mockContainer)
  })

  it('uses dataset color for label when labelColor is "dataset"', () => {
    const tooltip = buildChartTooltip({ labelColor: 'dataset', valueColor: '#FFFFFF' })
    const externalHandler = tooltip.external!

    const mockCanvas = document.createElement('canvas')
    const mockContainer = document.createElement('div')
    mockContainer.appendChild(mockCanvas)
    document.body.appendChild(mockContainer)

    const mockChart = {
      canvas: mockCanvas,
    }

    const mockTooltipModel = {
      opacity: 1,
      title: [],
      dataPoints: [
        {
          dataset: { label: 'Series', borderColor: '#FF00FF' },
          parsed: { y: 50 },
        },
      ],
    }

    externalHandler({ chart: mockChart as any, tooltip: mockTooltipModel as any })

    const tooltipEl = mockContainer.querySelector('[data-msdk-chart-tooltip]')
    const labelSpan = tooltipEl?.querySelector<HTMLSpanElement>('span')
    expect(labelSpan?.style.color).toBe('rgb(255, 0, 255)')

    document.body.removeChild(mockContainer)
  })

  it('handles array colors by extracting first element', () => {
    const tooltip = buildChartTooltip()
    const externalHandler = tooltip.external!

    const mockCanvas = document.createElement('canvas')
    const mockContainer = document.createElement('div')
    mockContainer.appendChild(mockCanvas)
    document.body.appendChild(mockContainer)

    const mockChart = {
      canvas: mockCanvas,
    }

    const mockTooltipModel = {
      opacity: 1,
      title: [],
      dataPoints: [
        {
          dataset: {
            label: 'Multi-color',
            backgroundColor: ['#111111', '#222222'],
          },
          dataIndex: 0,
          parsed: { y: 25 },
        },
      ],
    }

    externalHandler({ chart: mockChart as any, tooltip: mockTooltipModel as any })

    const tooltipEl = mockContainer.querySelector('[data-msdk-chart-tooltip]')
    const valueSpan = tooltipEl?.querySelectorAll<HTMLSpanElement>('span')[1]
    expect(valueSpan?.style.color).toBe('rgb(17, 17, 17)')

    document.body.removeChild(mockContainer)
  })

  it('applies custom background color and fontSize', () => {
    const tooltip = buildChartTooltip({ backgroundColor: '#000000', fontSize: 16 })
    const externalHandler = tooltip.external!

    const mockCanvas = document.createElement('canvas')
    const mockContainer = document.createElement('div')
    mockContainer.appendChild(mockCanvas)
    document.body.appendChild(mockContainer)

    const mockChart = {
      canvas: mockCanvas,
    }

    const mockTooltipModel = {
      opacity: 1,
      title: [],
      dataPoints: [
        {
          dataset: { label: 'Test', borderColor: '#FFFFFF' },
          parsed: { y: 10 },
        },
      ],
    }

    externalHandler({ chart: mockChart as any, tooltip: mockTooltipModel as any })

    const tooltipEl = mockContainer.querySelector('[data-msdk-chart-tooltip]') as HTMLElement
    expect(tooltipEl?.style.background).toBe('rgb(0, 0, 0)')
    expect(tooltipEl?.style.fontSize).toBe('16px')

    document.body.removeChild(mockContainer)
  })

  it('positionTooltip repositions the tooltip element on mousemove', () => {
    const tooltip = buildChartTooltip()
    const externalHandler = tooltip.external!

    const canvas = document.createElement('canvas')
    const container = document.createElement('div')
    container.appendChild(canvas)
    document.body.appendChild(container)

    // Give the container and tooltip mock dimensions so layout branches execute
    Object.defineProperty(container, 'offsetWidth', { configurable: true, get: () => 400 })
    Object.defineProperty(container, 'offsetHeight', { configurable: true, get: () => 300 })

    externalHandler({
      chart: { canvas } as any,
      tooltip: {
        opacity: 1,
        title: [],
        dataPoints: [{ dataset: { label: 'T', borderColor: '#F00' }, parsed: { y: 1 } }],
      } as any,
    })

    const tooltipEl = container.querySelector<HTMLElement>('[data-msdk-chart-tooltip]')!
    Object.defineProperty(tooltipEl, 'offsetWidth', { configurable: true, get: () => 150 })
    Object.defineProperty(tooltipEl, 'offsetHeight', { configurable: true, get: () => 80 })

    // cursor at (50, 30) → fitsRight=true, no clamping needed
    container.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 50, clientY: 30 }),
    )

    expect(tooltipEl.style.opacity).toBe('1')
    expect(tooltipEl.style.left).toMatch(/px$/)
    expect(tooltipEl.style.top).toMatch(/px$/)

    // cursor near left edge (0, 0) → left < OFFSET → clamp to OFFSET
    container.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 0 }))

    expect(tooltipEl.style.left).toMatch(/px$/)

    document.body.removeChild(container)
  })

  it('does not show tooltip from external handler until mousemove stores cursor', () => {
    const tooltip = buildChartTooltip()
    const externalHandler = tooltip.external!

    const canvas = document.createElement('canvas')
    const container = document.createElement('div')
    container.appendChild(canvas)
    document.body.appendChild(container)

    externalHandler({
      chart: { canvas } as any,
      tooltip: {
        opacity: 1,
        title: [],
        dataPoints: [{ dataset: { label: 'T', borderColor: '#F00' }, parsed: { y: 1 } }],
      } as any,
    })

    const tooltipEl = container.querySelector<HTMLElement>('[data-msdk-chart-tooltip]')!
    expect(tooltipEl.style.opacity).toBe('0')

    container.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 50, clientY: 30 }),
    )

    expect(tooltipEl.style.opacity).toBe('1')
    expect(tooltipEl.style.left).toMatch(/px$/)

    document.body.removeChild(container)
  })

  it('mouseleave hides the tooltip element', () => {
    const tooltip = buildChartTooltip()
    const externalHandler = tooltip.external!

    const canvas = document.createElement('canvas')
    const container = document.createElement('div')
    container.appendChild(canvas)
    document.body.appendChild(container)

    externalHandler({
      chart: { canvas } as any,
      tooltip: {
        opacity: 1,
        title: [],
        dataPoints: [{ dataset: { label: 'T', borderColor: '#F00' }, parsed: { y: 1 } }],
      } as any,
    })

    const tooltipEl = container.querySelector<HTMLElement>('[data-msdk-chart-tooltip]')!
    container.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 50, clientY: 30 }),
    )
    expect(tooltipEl.style.opacity).toBe('1')

    container.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))

    expect(tooltipEl.style.opacity).toBe('0')

    document.body.removeChild(container)
  })

  it('resolveDatasetColor falls back to #888 for non-string, non-array color', () => {
    const tooltip = buildChartTooltip({ labelColor: 'dataset' })
    const externalHandler = tooltip.external!

    const canvas = document.createElement('canvas')
    const container = document.createElement('div')
    container.appendChild(canvas)
    document.body.appendChild(container)

    externalHandler({
      chart: { canvas } as any,
      tooltip: {
        opacity: 1,
        title: [],
        dataPoints: [
          {
            dataset: {
              label: 'Test',
              // CanvasGradient-like object: not a string, not an array → falls back to '#888'
              borderColor: {} as any,
              backgroundColor: {} as any,
            },
            dataIndex: 0,
            parsed: { y: 42 },
          },
        ],
      } as any,
    })

    const tooltipEl = container.querySelector('[data-msdk-chart-tooltip]')
    const labelSpan = tooltipEl?.querySelector<HTMLSpanElement>('span')
    expect(labelSpan?.style.color).toBe('rgb(136, 136, 136)')

    document.body.removeChild(container)
  })

  it('attaches mousemove listener to container', () => {
    const tooltip = buildChartTooltip()
    const externalHandler = tooltip.external!

    const mockCanvas = document.createElement('canvas')
    const mockContainer = document.createElement('div')
    mockContainer.appendChild(mockCanvas)
    document.body.appendChild(mockContainer)

    const addEventListenerSpy = vi.spyOn(mockContainer, 'addEventListener')

    const mockChart = {
      canvas: mockCanvas,
    }

    const mockTooltipModel = {
      opacity: 1,
      title: [],
      dataPoints: [
        {
          dataset: { label: 'Test', borderColor: '#FFFFFF' },
          parsed: { y: 10 },
        },
      ],
    }

    externalHandler({ chart: mockChart as any, tooltip: mockTooltipModel as any })

    expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function), {
      capture: true,
    })
    expect(addEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function))
    expect(mockContainer.getAttribute('data-msdk-mouse')).toBe('1')

    document.body.removeChild(mockContainer)
  })

  describe('edge cases', () => {
    const mount = (): { canvas: HTMLCanvasElement; container: HTMLDivElement } => {
      const canvas = document.createElement('canvas')
      const container = document.createElement('div')
      container.appendChild(canvas)
      document.body.appendChild(container)
      return { canvas, container }
    }

    const sizeOf = (el: HTMLElement, width: number, height: number): void => {
      Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => width })
      Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => height })
    }

    const render = (canvas: HTMLCanvasElement, dataPoints: unknown[], config = {}): HTMLElement => {
      buildChartTooltip(config).external!({
        chart: { canvas } as any,
        tooltip: { opacity: 1, title: [], dataPoints } as any,
      })
      return canvas.parentElement!.querySelector<HTMLElement>('[data-msdk-chart-tooltip]')!
    }

    const spans = (el: HTMLElement): HTMLSpanElement[] => [...el.querySelectorAll('span')]

    it('throws when the canvas has no parent element', () => {
      const canvas = document.createElement('canvas')
      expect(() =>
        buildChartTooltip().external!({
          chart: { canvas } as any,
          tooltip: { opacity: 1, title: [], dataPoints: [] } as any,
        }),
      ).toThrow('Chart canvas must have a parent element')
    })

    it('flips left of the cursor and clamps to the bottom edge when space runs out', () => {
      const { canvas, container } = mount()
      sizeOf(container, 400, 300)
      const tooltipEl = render(canvas, [
        { dataset: { label: 'T', borderColor: '#F00' }, parsed: { y: 1 } },
      ])
      sizeOf(tooltipEl, 150, 80)

      container.dispatchEvent(new MouseEvent('mousemove', { clientX: 350, clientY: 290 }))

      // 350 + 10 + 150 overflows → left = 350 - 150 - 10; 290 + 80 overflows → top = 300 - 80 - 5
      expect(tooltipEl.style.left).toBe('190px')
      expect(tooltipEl.style.top).toBe('215px')
      expect(tooltipEl.style.visibility).toBe('visible')
      container.remove()
    })

    // Known behaviour, pinned here on purpose: horizontally the right-edge check runs after the
    // left one, so an oversized tooltip ends up past the left edge (-105px). Vertically the order
    // is reversed, so `top` stays clamped at 5px. Changing the order should update this test.
    it('pins edge handling when the tooltip is wider and taller than the container', () => {
      const { canvas, container } = mount()
      sizeOf(container, 100, 50)
      const tooltipEl = render(canvas, [
        { dataset: { label: 'T', borderColor: '#F00' }, parsed: { y: 1 } },
      ])
      sizeOf(tooltipEl, 200, 100)

      container.dispatchEvent(new MouseEvent('mousemove', { clientX: 40, clientY: 10 }))

      expect(tooltipEl.style.left).toBe('-105px')
      expect(tooltipEl.style.top).toBe('5px')
      container.remove()
    })

    it('ignores mousemove while the tooltip has no content', () => {
      const { container } = mount()
      const tooltipEl = document.createElement('div')
      tooltipEl.setAttribute('data-msdk-chart-tooltip', '')
      tooltipEl.style.opacity = '0'
      container.appendChild(tooltipEl)
      buildChartTooltip().external!({
        chart: { canvas: container.querySelector('canvas')! } as any,
        tooltip: { opacity: 0, title: [], dataPoints: [] } as any,
      })

      container.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }))

      expect(tooltipEl.style.opacity).toBe('0')
      expect(tooltipEl.style.left).toBe('')
      container.remove()
    })

    it('reads primitive and x-only parsed values and falls back to the item label', () => {
      const { canvas, container } = mount()
      const tooltipEl = render(canvas, [
        { dataset: { borderColor: '#F00' }, label: 'Item label', parsed: 7 },
        { dataset: { label: 'X only', borderColor: '#F00' }, parsed: { x: 3 } },
        { dataset: { borderColor: '#F00' }, parsed: undefined },
      ])

      expect(spans(tooltipEl).map((el) => el.textContent)).toEqual([
        'Item label',
        '7',
        'X only',
        '3',
        '',
        '0',
      ])
      container.remove()
    })

    it('resolves colors from border arrays and falls back through the array and dataset', () => {
      const { canvas, container } = mount()
      const tooltipEl = render(canvas, [
        {
          dataset: { label: 'a', borderColor: ['#010101', '#020202'] },
          dataIndex: 1,
          parsed: { y: 1 },
        },
        { dataset: { label: 'b', backgroundColor: ['#030303'] }, dataIndex: 5, parsed: { y: 1 } },
        { dataset: { label: 'c', backgroundColor: '#040404' }, parsed: { y: 1 } },
        { dataset: { label: 'd' }, parsed: { y: 1 } },
      ])

      const valueColors = spans(tooltipEl)
        .filter((_, i) => i % 2 === 1)
        .map((el) => el.style.color)
      expect(valueColors).toEqual([
        'rgb(2, 2, 2)',
        'rgb(3, 3, 3)',
        'rgb(4, 4, 4)',
        'rgb(136, 136, 136)',
      ])
      container.remove()
    })

    it('hides the tooltip when the stored cursor is not a finite number', () => {
      const { canvas, container } = mount()
      container.setAttribute('data-msdk-tooltip-cursor-x', 'abc')
      container.setAttribute('data-msdk-tooltip-cursor-y', '10')

      const tooltipEl = render(canvas, [
        { dataset: { label: 'T', borderColor: '#F00' }, parsed: { y: 1 } },
      ])

      expect(tooltipEl.style.opacity).toBe('0')
      expect(tooltipEl.style.visibility).toBe('hidden')
      container.remove()
    })
  })
})
