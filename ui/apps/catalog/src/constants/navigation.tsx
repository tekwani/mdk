import {
  BarChartIcon,
  BookmarkIcon,
  ChatBubbleIcon,
  CubeIcon,
  DashboardIcon,
  ExclamationTriangleIcon,
  GearIcon,
  HomeIcon,
  InputIcon,
  LayersIcon,
  MagnifyingGlassIcon,
  StackIcon,
} from '@radix-ui/react-icons'
import type { SidebarMenuItem } from '@tetherto/mdk-react-devkit/primitives'
import { AlertsNavIcon } from '@tetherto/mdk-react-devkit/primitives'

/**
 * Stable ids for the top-level nav sections. Referenced by the home-page section
 * grouping and category-stats helpers, so keep them in sync with the section
 * definitions below rather than repeating the raw strings.
 */
export const NAV_SECTION = {
  guides: 'guides',
  primitives: 'primitives',
  domain: 'domain',
} as const

export const COMPONENT_NAV: SidebarMenuItem[] = [
  {
    id: '',
    label: 'Home',
    icon: <HomeIcon />,
  },
  {
    id: NAV_SECTION.guides,
    label: 'Guides',
    icon: <BookmarkIcon />,
    items: [
      { id: 'getting-started', label: 'Getting Started' },
      { id: 'hooks', label: 'Adapter Hooks' },
      { id: 'theming', label: 'Theming' },
      { id: 'agent-co-pilot', label: 'Agent Co-pilot' },
    ],
  },
  {
    id: NAV_SECTION.primitives,
    label: 'Primitives',
    icon: <LayersIcon />,
    items: [
      {
        id: 'forms',
        label: 'Forms',
        icon: <InputIcon />,
        items: [
          { id: 'action-button', label: 'Action Button' },
          { id: 'buttons', label: 'Buttons' },
          { id: 'input', label: 'Input' },
          { id: 'select', label: 'Select' },
          { id: 'multi-select', label: 'Multi-Select' },
          { id: 'multi-level-select', label: 'Multi-Level Select' },
          { id: 'checkbox-switch', label: 'Checkbox & Switch' },
          { id: 'radio', label: 'Radio' },
          { id: 'date-pickers', label: 'Date Pickers' },
          { id: 'textarea', label: 'TextArea' },
          { id: 'form', label: 'Form (Basic)' },
          { id: 'form-enhanced', label: 'Form (Enhanced)' },
          { id: 'form-advanced', label: 'Form (Advanced)' },
          { id: 'form-performance', label: 'Form Performance' },
        ],
      },
      {
        id: 'overlays',
        label: 'Overlays',
        icon: <ChatBubbleIcon />,
        items: [
          { id: 'dialog', label: 'Dialog' },
          { id: 'dropdown-menu', label: 'Dropdown Menu' },
          { id: 'cascader', label: 'Cascader' },
          { id: 'tooltip', label: 'Tooltip' },
          { id: 'popover', label: 'Popover' },
          { id: 'toast', label: 'Toast' },
        ],
      },
      {
        id: 'data-display',
        label: 'Data Display',
        icon: <StackIcon />,
        items: [
          { id: 'alerts', label: 'Alert' },
          { id: 'table', label: 'Table' },
          { id: 'list-view-filter', label: 'List View Filter' },
          { id: 'mosaic', label: 'Mosaic' },
          { id: 'avatar', label: 'Avatar' },
          { id: 'badge', label: 'Badges' },
          { id: 'btc-average-price', label: 'BTC Average Price' },
          { id: 'accordion', label: 'Accordion' },
          { id: 'card', label: 'Card' },
          { id: 'divider', label: 'Divider' },
          { id: 'labeled-card', label: 'Labeled Card' },
          { id: 'logs-card', label: 'Logs Card' },
          { id: 'currency-toggler', label: 'Currency Toggler' },
          { id: 'typography', label: 'Typography' },
          { id: 'tags', label: 'Tags' },
          { id: 'indicators', label: 'Indicators' },
          { id: 'detail-legend', label: 'Detail Legend' },
          { id: 'mining-icons', label: 'Mining Icons' },
          { id: 'empty-state', label: 'Empty State' },
        ],
      },
      {
        id: 'charts',
        label: 'Charts',
        icon: <BarChartIcon />,
        items: [
          { id: 'line-chart', label: 'Line Chart' },
          { id: 'bar-chart', label: 'Bar Chart' },
          { id: 'area-chart', label: 'Area Chart' },
          { id: 'doughnut-chart', label: 'Doughnut Chart' },
          { id: 'gauge-chart', label: 'Gauge Chart' },
          { id: 'heatmap', label: 'Heatmap' },
          { id: 'threshold-line-chart', label: 'Threshold Line Chart' },
          { id: 'operations-energy-cost-chart', label: 'Operations vs Energy Cost Chart' },
          { id: 'average-downtime-chart', label: 'Average Downtime Chart' },
          { id: 'chart-container', label: 'Chart Container' },
          { id: 'min-max-avg', label: 'Min / Max / Avg' },
        ],
      },
      {
        id: 'navigation',
        label: 'Navigation',
        icon: <DashboardIcon />,
        items: [
          { id: 'app-header', label: 'App Header' },
          { id: 'tabs', label: 'Tabs' },
          { id: 'breadcrumbs', label: 'Breadcrumbs' },
          { id: 'pagination', label: 'Pagination' },
          { id: 'sidebar', label: 'Sidebar' },
        ],
      },
      {
        id: 'loading',
        label: 'Loading',
        icon: <CubeIcon />,
        items: [
          { id: 'spinner', label: 'Spinner' },
          { id: 'loader', label: 'Loader' },
          { id: 'skeleton', label: 'Skeleton' },
        ],
      },
      {
        id: 'feedback',
        label: 'Feedback',
        icon: <ExclamationTriangleIcon />,
        items: [
          { id: 'error-boundary', label: 'Error Boundary' },
          { id: 'error-card', label: 'Error Card' },
          { id: 'not-found-page', label: 'Not Found Page' },
        ],
      },
    ],
  },
  {
    id: NAV_SECTION.domain,
    label: 'Domain',
    icon: <DashboardIcon />,
    items: [
      {
        id: 'dashboard-widgets',
        label: 'Dashboard Widgets',
        icon: <DashboardIcon />,
        items: [
          { id: 'active-incidents-card', label: 'Active Incidents Card' },
          { id: 'alarms-bell-button', label: 'Alarms Bell Button' },
          { id: 'dashboard-date-range-picker', label: 'Dashboard Date Range Picker' },
          { id: 'export-button', label: 'Export Button' },
          { id: 'header-stats-bar', label: 'Header Stats Bar' },
          { id: 'metric-card', label: 'Metric Card' },
          { id: 'mining-pools-panel', label: 'Mining Pools Panel' },
          { id: 'pool-details-card', label: 'Pool Details Card' },
          { id: 'pool-details-popover', label: 'Pool Details Popover' },
          { id: 'profile-menu', label: 'Profile Menu' },
          { id: 'report-time-frame-selector', label: 'Report Time Frame Selector' },
          { id: 'site-stats-bar', label: 'Site Stats Bar' },
          { id: 'timeframe-controls', label: 'Timeframe Controls' },
          { id: 'timeline-selector', label: 'Timeline Selector' },
          { id: 'widget-top-row', label: 'Widget Top Row' },
        ],
      },
      {
        id: 'foundation-charts',
        label: 'Charts',
        icon: <BarChartIcon />,
        items: [
          { id: 'line-chart-card', label: 'Line Chart Card' },
          { id: 'power-mode-timeline-chart', label: 'Power Mode Timeline Chart' },
          { id: 'timeline-chart', label: 'Timeline Chart' },
        ],
      },
      {
        id: 'devices',
        label: 'Devices',
        icon: <MagnifyingGlassIcon />,
        items: [
          { id: 'device-explorer', label: 'Device Explorer' },
          { id: 'miner-metric-card', label: 'Miner Metric Card' },
          { id: 'generic-data-box', label: 'Generic Data Box' },
          { id: 'enabled-disable-toggle', label: 'Enabled / Disable Toggle' },
          { id: 'single-stat-card', label: 'Single Stat Card' },
          { id: 'miners-activity-chart', label: 'Miners Activity Chart' },
        ],
      },
      {
        id: 'alerts-view',
        label: 'Alerts',
        icon: <AlertsNavIcon />,
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: <GearIcon />,
      },
    ],
  },
]

const countLeafItems = (items: SidebarMenuItem[]): number =>
  items.reduce((sum, item) => {
    if (item.items?.length) {
      return sum + countLeafItems(item.items)
    }
    return sum + 1
  }, 0)

export const getCategoryStats = (): { totalComponents: number; totalCategories: number } => {
  const primitivesSection = COMPONENT_NAV.find((item) => item.id === NAV_SECTION.primitives)
  const domainSection = COMPONENT_NAV.find((item) => item.id === NAV_SECTION.domain)

  const primitivesItems = primitivesSection?.items ?? []
  const domainItems = domainSection?.items ?? []

  const totalComponents = countLeafItems([...primitivesItems, ...domainItems])
  const totalCategories = primitivesItems.length + domainItems.length

  return { totalComponents, totalCategories }
}

export const getCategoryByLabel = (label: string): SidebarMenuItem | undefined => {
  return COMPONENT_NAV.find((item) => item.label === label)
}

export const getBreadcrumbs = (
  routeId: string,
  items: SidebarMenuItem[] = COMPONENT_NAV,
  ancestors: SidebarMenuItem[] = [],
): SidebarMenuItem[] | null => {
  for (const item of items) {
    const path = [...ancestors, item]
    if (item.id === routeId) return path
    if (item.items) {
      const found = getBreadcrumbs(routeId, item.items, path)
      if (found) return found
    }
  }
  return null
}
