import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeviceExplorer } from '../device-explorer'

describe('deviceExplorer', () => {
  const defaultProps = {
    data: [],
    filterOptions: [],
    searchOptions: [],
    searchTags: [],
    onFiltersChange: vi.fn(),
    onSearchTagsChange: vi.fn(),
    getFormattedDate: vi.fn((date: Date) => date.toISOString()),
  }

  it('should render device explorer root', () => {
    const { container } = render(<DeviceExplorer {...defaultProps} />)
    expect(container.querySelector('.mdk-device-explorer')).toBeInTheDocument()
  })

  it('should render toolbar', () => {
    const { container } = render(<DeviceExplorer {...defaultProps} />)
    expect(container.querySelector('.mdk-device-explorer__toolbar')).toBeInTheDocument()
  })

  it('should render table', () => {
    const { container } = render(<DeviceExplorer {...defaultProps} />)
    expect(container.querySelector('.mdk-device-explorer__table')).toBeInTheDocument()
  })

  it('should not render device type tabs', () => {
    render(<DeviceExplorer {...defaultProps} />)
    expect(screen.queryByText('Containers')).not.toBeInTheDocument()
    expect(screen.queryByText('Cabinets')).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<DeviceExplorer {...defaultProps} className="custom-class" />)
    const root = container.querySelector('.mdk-device-explorer')
    expect(root).toHaveClass('custom-class')
  })

  it('should forward columns to the table', () => {
    render(
      <DeviceExplorer
        {...defaultProps}
        data={[{ id: 'dev-1', type: 'miner-demo-m1', last: {} }]}
        columns={[{ id: 'custom', header: 'Custom Column', cell: () => 'value' }]}
      />,
    )
    expect(screen.getByText('Custom Column')).toBeInTheDocument()
  })

  it('should work with provided filters', () => {
    const { container } = render(
      <DeviceExplorer
        {...defaultProps}
        filters={{ status: 'active' }}
        filterOptions={[{ label: 'Status', value: 'status', children: [] }]}
      />,
    )
    expect(container.querySelector('.mdk-device-explorer')).toBeInTheDocument()
  })

  it('should work with selectedDevices and onSelectedDevicesChange', () => {
    const onSelectedDevicesChange = vi.fn()
    const { container } = render(
      <DeviceExplorer
        {...defaultProps}
        selectedDevices={{}}
        onSelectedDevicesChange={onSelectedDevicesChange}
      />,
    )
    expect(container.querySelector('.mdk-device-explorer')).toBeInTheDocument()
  })
})
