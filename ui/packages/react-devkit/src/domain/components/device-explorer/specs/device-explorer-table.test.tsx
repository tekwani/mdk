import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { DataTableColumnDef } from '@primitives'
import { DeviceExplorerTable } from '../device-explorer-table'
import type { DeviceExplorerDeviceData } from '../types'

describe('deviceExplorerTable', () => {
  const mockGetFormattedDate = vi.fn((date: Date) => date.toISOString())

  const defaultProps = {
    data: [] as DeviceExplorerDeviceData[],
    selections: {},
    onSelectionsChange: vi.fn(),
    getFormattedDate: mockGetFormattedDate,
    sorting: [],
    onSortingChange: vi.fn(),
  }

  it('should render table wrapper with correct class', () => {
    const { container } = render(<DeviceExplorerTable {...defaultProps} />)
    expect(container.querySelector('.mdk-device-explorer__table')).toBeInTheDocument()
  })

  // Headers only render once there is a row; an empty table shows its empty state.
  const oneMiner: DeviceExplorerDeviceData[] = [{ id: 'dev-1', type: 'miner-demo-m1', last: {} }]

  it('should render the miner columns by default', () => {
    render(<DeviceExplorerTable {...defaultProps} data={oneMiner} />)
    expect(screen.getByText('Code')).toBeInTheDocument()
  })

  it('should render the columns it is given instead of the defaults', () => {
    const columns: DataTableColumnDef<DeviceExplorerDeviceData>[] = [
      { id: 'custom', header: 'Custom Column', cell: () => 'value' },
    ]
    render(<DeviceExplorerTable {...defaultProps} data={oneMiner} columns={columns} />)

    expect(screen.getByText('Custom Column')).toBeInTheDocument()
    expect(screen.queryByText('Code')).not.toBeInTheDocument()
  })

  it('should pass data to table', () => {
    const data: DeviceExplorerDeviceData[] = [{ id: 'dev-1', type: 'miner-demo', last: {} }]
    const { container } = render(<DeviceExplorerTable {...defaultProps} data={data} />)
    expect(container.querySelector('.mdk-device-explorer__table')).toBeInTheDocument()
  })

  it('should accept sorting and onSortingChange', () => {
    const onSortingChange = vi.fn()
    const { container } = render(
      <DeviceExplorerTable
        {...defaultProps}
        sorting={[{ id: 'id', desc: false }]}
        onSortingChange={onSortingChange}
      />,
    )
    expect(container.querySelector('.mdk-device-explorer__table')).toBeInTheDocument()
  })

  it('should accept selections and onSelectionsChange', () => {
    const onSelectionsChange = vi.fn()
    const { container } = render(
      <DeviceExplorerTable
        {...defaultProps}
        selections={{ '0': true }}
        onSelectionsChange={onSelectionsChange}
      />,
    )
    expect(container.querySelector('.mdk-device-explorer__table')).toBeInTheDocument()
  })
})
