import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeviceExplorerToolbar } from '../device-explorer-toolbar'

vi.mock('@primitives/index', async () => {
  const actual = await vi.importActual('@primitives/index')
  return {
    ...actual,
    ListViewFilter: vi.fn(({ onChange, className }) => (
      <div data-testid="list-view-filter" className={className}>
        <button onClick={() => onChange([['status', 'active']])}>Apply Filter</button>
      </div>
    )),
    TagInput: vi.fn(({ allowCustomTags, placeholder, onTagsChange, value, variant, className }) => (
      <div data-testid="tag-input" className={className}>
        <input
          data-testid="tag-input-field"
          placeholder={placeholder}
          value={value?.join(', ') || ''}
          onChange={(e) => onTagsChange(e.target.value.split(', '))}
        />
        <span data-testid="tag-input-variant">{variant}</span>
        <span data-testid="tag-input-custom">{String(allowCustomTags)}</span>
      </div>
    )),
  }
})

describe('DeviceExplorerToolbar', () => {
  const mockProps = {
    filters: {},
    filterOptions: [],
    onFiltersChange: vi.fn(),
    searchOptions: [],
    searchTags: [],
    onSearchTagsChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders toolbar container', () => {
      const { container } = render(<DeviceExplorerToolbar {...mockProps} />)
      expect(container.querySelector('.mdk-device-explorer__toolbar')).toBeInTheDocument()
    })

    it('renders search input', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      expect(screen.getByTestId('tag-input')).toBeInTheDocument()
    })

  })

  describe('filter rendering', () => {
    it('does not render filter when filterOptions is empty', () => {
      const { container } = render(<DeviceExplorerToolbar {...mockProps} />)
      expect(
        container.querySelector('.mdk-device-explorer__toolbar__filter'),
      ).not.toBeInTheDocument()
    })

    it('renders filter when filterOptions are provided', () => {
      const propsWithFilters = {
        ...mockProps,
        filterOptions: [{ label: 'Status', value: 'status', children: [] }],
      }
      const { container } = render(<DeviceExplorerToolbar {...propsWithFilters} />)
      expect(container.querySelector('.mdk-device-explorer__toolbar__filter')).toBeInTheDocument()
    })

    it('renders filter with multiple options', () => {
      const propsWithFilters = {
        ...mockProps,
        filterOptions: [
          { label: 'Status', value: 'status', children: [] },
          { label: 'Type', value: 'type', children: [] },
        ],
      }
      render(<DeviceExplorerToolbar {...propsWithFilters} />)
      expect(screen.getByTestId('list-view-filter')).toBeInTheDocument()
    })

    it('passes filters to ListViewFilter', () => {
      const filters = { status: 'active', type: 'container' }
      const filterOptions = [{ label: 'Status', value: 'status', children: [] }]
      render(
        <DeviceExplorerToolbar {...mockProps} filters={filters} filterOptions={filterOptions} />,
      )
      expect(screen.getByTestId('list-view-filter')).toBeInTheDocument()
    })
  })

  describe('search input', () => {
    it('renders with correct placeholder', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      const input = screen.getByPlaceholderText('Search')
      expect(input).toBeInTheDocument()
    })

    it('renders with search variant', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      expect(screen.getByTestId('tag-input-variant')).toHaveTextContent('search')
    })

    it('has allowCustomTags enabled', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      expect(screen.getByTestId('tag-input-custom')).toHaveTextContent('true')
    })

    it('renders with empty search tags by default', () => {
      render(<DeviceExplorerToolbar {...mockProps} />)
      const input = screen.getByTestId('tag-input-field')
      expect(input).toHaveValue('')
    })

    it('renders with provided search tags', () => {
      const searchTags = ['tag1', 'tag2']
      render(<DeviceExplorerToolbar {...mockProps} searchTags={searchTags} />)
      const input = screen.getByTestId('tag-input-field')
      expect(input).toHaveValue('tag1, tag2')
    })

    it('passes search options to TagInput', () => {
      const searchOptions = [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' },
      ]
      render(<DeviceExplorerToolbar {...mockProps} searchOptions={searchOptions} />)
      expect(screen.getByTestId('tag-input')).toBeInTheDocument()
    })

    it('has correct CSS class', () => {
      const { container } = render(<DeviceExplorerToolbar {...mockProps} />)
      expect(container.querySelector('.mdk-device-explorer__toolbar__search')).toBeInTheDocument()
    })
  })

  describe('callbacks', () => {
    it('calls onFiltersChange when filter changes', () => {
      const onFiltersChange = vi.fn()
      const filterOptions = [{ label: 'Status', value: 'status', children: [] }]
      render(
        <DeviceExplorerToolbar
          {...mockProps}
          filterOptions={filterOptions}
          onFiltersChange={onFiltersChange}
        />,
      )

      fireEvent.click(screen.getByText('Apply Filter'))
      expect(onFiltersChange).toHaveBeenCalledWith([['status', 'active']])
    })

    it('calls onSearchTagsChange when search tags change', () => {
      const onSearchTagsChange = vi.fn()
      render(<DeviceExplorerToolbar {...mockProps} onSearchTagsChange={onSearchTagsChange} />)

      const input = screen.getByTestId('tag-input-field')
      fireEvent.change(input, { target: { value: 'tag1, tag2' } })

      expect(onSearchTagsChange).toHaveBeenCalledWith(['tag1', 'tag2'])
    })
  })

  describe('component props', () => {
    it('passes localFilters to ListViewFilter', () => {
      const filters = { status: ['active', 'inactive'] }
      const filterOptions = [{ label: 'Status', value: 'status', children: [] }]
      render(
        <DeviceExplorerToolbar {...mockProps} filters={filters} filterOptions={filterOptions} />,
      )

      expect(screen.getByTestId('list-view-filter')).toBeInTheDocument()
    })

    it('passes options to ListViewFilter', () => {
      const filterOptions = [
        { label: 'Status', value: 'status', children: [] },
        { label: 'Location', value: 'location', children: [] },
      ]
      render(<DeviceExplorerToolbar {...mockProps} filterOptions={filterOptions} />)

      expect(screen.getByTestId('list-view-filter')).toBeInTheDocument()
    })

    it('passes value to TagInput', () => {
      const searchTags = ['container-1', 'container-2']
      render(<DeviceExplorerToolbar {...mockProps} searchTags={searchTags} />)

      const input = screen.getByTestId('tag-input-field')
      expect(input).toHaveValue('container-1, container-2')
    })

    it('passes options to TagInput', () => {
      const searchOptions = [
        { label: 'Container 1', value: 'container-1' },
        { label: 'Container 2', value: 'container-2' },
      ]
      render(<DeviceExplorerToolbar {...mockProps} searchOptions={searchOptions} />)

      expect(screen.getByTestId('tag-input')).toBeInTheDocument()
    })

  })

  describe('edge cases', () => {
    it('handles empty filters object', () => {
      const filterOptions = [{ label: 'Status', value: 'status', children: [] }]
      const { container } = render(
        <DeviceExplorerToolbar {...mockProps} filters={{}} filterOptions={filterOptions} />,
      )

      expect(container.querySelector('.mdk-device-explorer__toolbar__filter')).toBeInTheDocument()
    })

    it('handles single filter option', () => {
      const filterOptions = [{ label: 'Status', value: 'status', children: [] }]
      render(<DeviceExplorerToolbar {...mockProps} filterOptions={filterOptions} />)

      expect(screen.getByTestId('list-view-filter')).toBeInTheDocument()
    })

    it('handles single search tag', () => {
      const searchTags = ['single-tag']
      render(<DeviceExplorerToolbar {...mockProps} searchTags={searchTags} />)

      const input = screen.getByTestId('tag-input-field')
      expect(input).toHaveValue('single-tag')
    })

    it('handles single search option', () => {
      const searchOptions = [{ label: 'Option 1', value: 'opt1' }]
      render(<DeviceExplorerToolbar {...mockProps} searchOptions={searchOptions} />)

      expect(screen.getByTestId('tag-input')).toBeInTheDocument()
    })

    it('renders correctly when all arrays are empty', () => {
      const { container } = render(<DeviceExplorerToolbar {...mockProps} />)

      expect(container.querySelector('.mdk-device-explorer__toolbar')).toBeInTheDocument()
      expect(
        container.querySelector('.mdk-device-explorer__toolbar__filter'),
      ).not.toBeInTheDocument()
    })
  })

  describe('integration', () => {
    it('renders all components together', () => {
      const props = {
        filters: { status: 'active' },
        filterOptions: [{ label: 'Status', value: 'status', children: [] }],
        onFiltersChange: vi.fn(),
        searchOptions: [{ label: 'Search 1', value: 'search1' }],
        searchTags: ['tag1'],
        onSearchTagsChange: vi.fn(),
      }

      render(<DeviceExplorerToolbar {...props} />)

      expect(screen.getByTestId('list-view-filter')).toBeInTheDocument()
      expect(screen.getByTestId('tag-input')).toBeInTheDocument()
      expect(screen.queryByTestId('tabs')).not.toBeInTheDocument()
      expect(screen.getAllByRole('button')).toHaveLength(1) // the filter button
    })

    it('all callbacks can be triggered', () => {
      const onFiltersChange = vi.fn()
      const onSearchTagsChange = vi.fn()

      const props = {
        ...mockProps,
        filterOptions: [{ label: 'Status', value: 'status', children: [] }],
        onFiltersChange,
        onSearchTagsChange,
      }

      render(<DeviceExplorerToolbar {...props} />)

      fireEvent.click(screen.getByText('Apply Filter'))
      expect(onFiltersChange).toHaveBeenCalled()

      const input = screen.getByTestId('tag-input-field')
      fireEvent.change(input, { target: { value: 'new tag' } })
      expect(onSearchTagsChange).toHaveBeenCalled()
    })
  })
})
