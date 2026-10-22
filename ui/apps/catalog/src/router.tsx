import { Spinner } from '@tetherto/mdk-react-devkit/primitives'
import { lazy, Suspense } from 'react'
import type { JSX } from 'react'
import { createBrowserRouter } from 'react-router'
import App from './App'
import { AlertExample } from './examples/alert-example'
import { ListViewFilterExample } from './examples/list-view-filter-example/list-view-filter-example'
import { AlertsPageDemo } from './pages/alerts/alerts-page'
import { PowerModeTimelineChartDemo } from './pages/dashboard/power-mode-timeline-chart-page/power-mode-timeline-chart-page'
import { TimelineChartDemo } from './pages/domain/timeline-chart-page/timeline-chart-page'
import { MinersActivityChartDemo } from './pages/miners-activity-chart/miners-activity-chart-demo'
import { SingleStatCardDemo } from './pages/stat-cards/single-stat-card/single-stat-card-demo'
import { MosaicPageDemo } from './pages/mosaic-page/mosaic.page'
import { WidgetTopRowPage } from './pages/widget-top-row-page'

// Lazy load ALL pages to eliminate unused JavaScript and CSS
const HomePage = lazy(() =>
  import('./pages/home-page').then((module) => ({ default: module.HomePage })),
)
const GettingStartedPage = lazy(() =>
  import('./pages/guides/getting-started-page').then((module) => ({
    default: module.GettingStartedPage,
  })),
)
const HooksDemoPage = lazy(() =>
  import('./pages/guides/hooks-demo-page').then((module) => ({ default: module.HooksDemoPage })),
)
const ThemingDemoPage = lazy(() =>
  import('./pages/guides/theming-demo-page').then((module) => ({
    default: module.ThemingDemoPage,
  })),
)
const AgentCoPilotPage = lazy(() =>
  import('./pages/agent-co-pilot/agent-co-pilot-page').then((module) => ({
    default: module.AgentCoPilotPage,
  })),
)
const ActionButtonPage = lazy(() =>
  import('./pages/action-button-page').then((module) => ({ default: module.ActionButtonPage })),
)
const AvatarPage = lazy(() =>
  import('./pages/avatar-page').then((module) => ({ default: module.AvatarPage })),
)
const BtcAveragePricePage = lazy(() =>
  import('./pages/btc-average-price-page').then((module) => ({
    default: module.BtcAveragePricePage,
  })),
)
const BreadcrumbsPage = lazy(() =>
  import('./pages/breadcrumbs-page').then((module) => ({ default: module.BreadcrumbsPage })),
)
const ButtonsPage = lazy(() =>
  import('./pages/buttons-page').then((module) => ({ default: module.ButtonsPage })),
)
const CardPage = lazy(() =>
  import('./pages/card-page').then((module) => ({ default: module.CardPage })),
)
const CurrencyTogglerPage = lazy(() =>
  import('./pages/currency-toggler-page').then((module) => ({
    default: module.CurrencyTogglerPage,
  })),
)
const ChartContainerPage = lazy(() =>
  import('./pages/chart-container-page').then((module) => ({ default: module.ChartContainerPage })),
)
const DatePickersPage = lazy(() =>
  import('./pages/date-pickers-page').then((module) => ({ default: module.DatePickersPage })),
)
const DialogPage = lazy(() =>
  import('./pages/dialog-page').then((module) => ({ default: module.DialogPage })),
)
const DropdownMenuPage = lazy(() =>
  import('./pages/dropdown-menu-page').then((module) => ({ default: module.DropdownMenuPage })),
)
const EmptyStatePage = lazy(() =>
  import('./pages/empty-state-page').then((module) => ({ default: module.EmptyStatePage })),
)
const ErrorBoundaryPage = lazy(() =>
  import('./pages/error-boundary-page').then((module) => ({ default: module.ErrorBoundaryPage })),
)
const ErrorCardPage = lazy(() =>
  import('./pages/error-card-page').then((module) => ({ default: module.ErrorCardPage })),
)
const GaugeChartPage = lazy(() =>
  import('./pages/gauge-chart-page').then((module) => ({ default: module.GaugeChartPage })),
)

const HeatmapPage = lazy(() =>
  import('./pages/heatmap-page').then((module) => ({ default: module.HeatmapPage })),
)
const ThresholdLineChartPage = lazy(() =>
  import('./pages/threshold-line-chart-page').then((module) => ({
    default: module.ThresholdLineChartPage,
  })),
)
const OperationsEnergyCostChartPage = lazy(() =>
  import('./pages/operations-energy-cost-chart-page').then((module) => ({
    default: module.OperationsEnergyCostChartPage,
  })),
)
const AverageDowntimeChartPage = lazy(() =>
  import('./pages/average-downtime-chart-page').then((module) => ({
    default: module.AverageDowntimeChartPage,
  })),
)
const InputPage = lazy(() =>
  import('./pages/input-page').then((module) => ({ default: module.InputPage })),
)
const LoaderPage = lazy(() =>
  import('./pages/loader-page').then((module) => ({ default: module.LoaderPage })),
)
const LogsCardPage = lazy(() =>
  import('./pages/logs-card-page').then((module) => ({ default: module.LogsCardPage })),
)
const NotFoundPage = lazy(() =>
  import('./pages/not-found-page').then((module) => ({ default: module.NotFoundPage })),
)
const PopoverPage = lazy(() =>
  import('./pages/popover-page').then((module) => ({ default: module.PopoverPage })),
)
const SelectPage = lazy(() =>
  import('./pages/select-page').then((module) => ({ default: module.SelectPage })),
)
const MultiSelectPage = lazy(() =>
  import('./pages/multi-select-page').then((module) => ({ default: module.MultiSelectPage })),
)
const SidebarPage = lazy(() =>
  import('./pages/sidebar-page').then((module) => ({ default: module.SidebarPage })),
)
const SpinnerPage = lazy(() =>
  import('./pages/spinner-page').then((module) => ({ default: module.SpinnerPage })),
)
const TabsPage = lazy(() =>
  import('./pages/tabs-page').then((module) => ({ default: module.TabsPage })),
)
const MultiLevelSelectPage = lazy(() =>
  import('./pages/multi-level-select-page').then((module) => ({ default: module.MultiLevelSelectPage })),
)
const BadgeExample = lazy(() =>
  import('./examples/badge-example').then((module) => ({ default: module.BadgeExample })),
)
const DividerPage = lazy(() =>
  import('./pages/divider-page').then((module) => ({ default: module.DividerPage })),
)
const LabeledCardPage = lazy(() =>
  import('./pages/labeled-card-page').then((module) => ({ default: module.LabeledCardPage })),
)
const DetailLegendPage = lazy(() =>
  import('./pages/detail-legend-page').then((module) => ({ default: module.DetailLegendPage })),
)
const MinMaxAvgPage = lazy(() =>
  import('./pages/min-max-avg-page').then((module) => ({ default: module.MinMaxAvgPage })),
)
const SkeletonPage = lazy(() =>
  import('./pages/skeleton-page').then((module) => ({ default: module.SkeletonPage })),
)
const MiningPoolsPanelPage = lazy(() =>
  import('./pages/mining-pools-panel-page').then((module) => ({ default: module.MiningPoolsPanelPage })),
)
const ReportTimeFrameSelectorPage = lazy(() =>
  import('./pages/report-time-frame-selector-page').then((module) => ({ default: module.ReportTimeFrameSelectorPage })),
)
const SiteStatsBarPage = lazy(() =>
  import('./pages/site-stats-bar-page').then((module) => ({ default: module.SiteStatsBarPage })),
)
const TimeframeControlsPage = lazy(() =>
  import('./pages/timeframe-controls-page').then((module) => ({ default: module.TimeframeControlsPage })),
)
const TimelineSelectorPage = lazy(() =>
  import('./pages/timeline-selector-page').then((module) => ({ default: module.TimelineSelectorPage })),
)
const MinerMetricCardPage = lazy(() =>
  import('./pages/miner-metric-card-page').then((module) => ({ default: module.MinerMetricCardPage })),
)
const GenericDataBoxPage = lazy(() =>
  import('./pages/generic-data-box-page').then((module) => ({ default: module.GenericDataBoxPage })),
)
const EnabledDisableTogglePage = lazy(() =>
  import('./pages/enabled-disable-toggle-page').then((module) => ({ default: module.EnabledDisableTogglePage })),
)
const TagsPage = lazy(() =>
  import('./pages/tags-page').then((module) => ({ default: module.TagsPage })),
)
const ToastPage = lazy(() =>
  import('./pages/toast-page').then((module) => ({ default: module.ToastPage })),
)
const TooltipPage = lazy(() =>
  import('./pages/tooltip-page').then((module) => ({ default: module.TooltipPage })),
)
const ActiveIncidentsCardPage = lazy(() =>
  import('./pages/active-incidents-card-page').then((module) => ({
    default: module.ActiveIncidentsCardPage,
  })),
)
const MetricCardPage = lazy(() =>
  import('./pages/metric-card-page').then((module) => ({ default: module.MetricCardPage })),
)
const PoolDetailsCardPage = lazy(() =>
  import('./pages/pool-details-card-page').then((module) => ({
    default: module.PoolDetailsCardPage,
  })),
)
const PoolDetailsPopoverPage = lazy(() =>
  import('./pages/pool-details-popover-page').then((module) => ({
    default: module.PoolDetailsPopoverPage,
  })),
)

const LineChartCardPage = lazy(() =>
  import('./pages/line-chart-card-page').then((module) => ({ default: module.LineChartCardPage })),
)

const LwLineChartExample = lazy(() =>
  import('./examples/lightweight-line-chart-example').then((module) => ({
    default: module.LwLineChartExample,
  })),
)

const BarChartExample = lazy(() =>
  import('./examples/bar-chart-example').then((module) => ({ default: module.BarChartExample })),
)
const AreaChartExample = lazy(() =>
  import('./examples/area-chart-example').then((module) => ({
    default: module.AreaChartExample,
  })),
)
const DoughnutChartPage = lazy(() =>
  import('./pages/doughnut-chart-page').then((module) => ({ default: module.DoughnutChartPage })),
)
const AccordionExample = lazy(() =>
  import('./examples/accordion-example').then((module) => ({ default: module.AccordionExample })),
)
const CascaderExample = lazy(() =>
  import('./examples/cascader-example').then((module) => ({ default: module.CascaderExample })),
)
const CheckboxExample = lazy(() =>
  import('./examples/checkbox-example').then((module) => ({ default: module.CheckboxExample })),
)
const DemoTable = lazy(() =>
  import('./examples/demo-table').then((module) => ({ default: module.DemoTable })),
)
const FormExample = lazy(() => import('./examples/form-example'))
const FormEnhancedExample = lazy(() => import('./examples/form-enhanced-example'))
const FormAdvancedExample = lazy(() => import('./examples/form-advanced-example'))
const FormPerformancePage = lazy(() =>
  import('./pages/form-performance-page-real').then((module) => ({
    default: module.FormPerformancePageReal,
  })),
)
const IndicatorsExample = lazy(() =>
  import('./examples/indicators-example').then((module) => ({
    default: module.IndicatorsExample,
  })),
)
const PaginationExample = lazy(() => import('./examples/pagination-example'))
const RadioExample = lazy(() =>
  import('./examples/radio-example').then((module) => ({ default: module.RadioExample })),
)
const TextAreaExample = lazy(() => import('./examples/textarea-example'))
const TypographyExample = lazy(() =>
  import('./examples/typography-example').then((module) => ({
    default: module.TypographyExample,
  })),
)
const MiningIconsExample = lazy(() =>
  import('./examples/mining-icons-example').then((module) => ({
    default: module.MiningIconsExample,
  })),
)

const DeviceExplorerPage = lazy(() =>
  import('./pages/device-explorer-page/device-explorer-page').then((module) => ({
    default: module.DeviceExplorerPage,
  })),
)


const SettingsDemoPage = lazy(() =>
  import('./pages/settings/settings-demo').then((module) => ({ default: module.SettingsDemoPage })),
)

const AppHeaderPage = lazy(() =>
  import('./pages/app-header-page').then((module) => ({ default: module.AppHeaderPage })),
)

const HeaderStatsBarPage = lazy(() =>
  import('./pages/header-stats-bar-page').then((module) => ({ default: module.HeaderStatsBarPage })),
)

const AlarmsBellButtonPage = lazy(() =>
  import('./pages/alarms-bell-button-page').then((module) => ({ default: module.AlarmsBellButtonPage })),
)

const ProfileMenuPage = lazy(() =>
  import('./pages/profile-menu-page').then((module) => ({ default: module.ProfileMenuPage })),
)

const DashboardDateRangePickerPage = lazy(() =>
  import('./pages/dashboard-date-range-picker-page').then((module) => ({
    default: module.DashboardDateRangePickerPage,
  })),
)

const ExportButtonPage = lazy(() =>
  import('./pages/export-button-page').then((module) => ({ default: module.ExportButtonPage })),
)

const SectionLoader = (): JSX.Element => (
  <div className="demo-section-loader">
    <Spinner />
  </div>
)

const withSuspense = (Component: React.ComponentType): JSX.Element => (
  <Suspense fallback={<SectionLoader />}>
    <Component />
  </Suspense>
)

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: withSuspense(HomePage) },
        { path: 'getting-started', element: withSuspense(GettingStartedPage) },
        { path: 'hooks', element: withSuspense(HooksDemoPage) },
        { path: 'theming', element: withSuspense(ThemingDemoPage) },
        { path: 'agent-co-pilot', element: withSuspense(AgentCoPilotPage) },
        { path: 'alerts', element: withSuspense(AlertExample) },
        { path: 'action-button', element: withSuspense(ActionButtonPage) },
        { path: 'buttons', element: withSuspense(ButtonsPage) },
        { path: 'input', element: withSuspense(InputPage) },
        { path: 'select', element: withSuspense(SelectPage) },
        { path: 'multi-select', element: withSuspense(MultiSelectPage) },
        { path: 'checkbox-switch', element: withSuspense(CheckboxExample) },
        { path: 'radio', element: withSuspense(RadioExample) },
        { path: 'date-pickers', element: withSuspense(DatePickersPage) },
        { path: 'textarea', element: withSuspense(TextAreaExample) },
        { path: 'form', element: withSuspense(FormExample) },
        { path: 'form-enhanced', element: withSuspense(FormEnhancedExample) },
        { path: 'form-advanced', element: withSuspense(FormAdvancedExample) },
        { path: 'form-performance', element: withSuspense(FormPerformancePage) },
        { path: 'dialog', element: withSuspense(DialogPage) },
        { path: 'dropdown-menu', element: withSuspense(DropdownMenuPage) },
        { path: 'cascader', element: withSuspense(CascaderExample) },
        { path: 'tooltip', element: withSuspense(TooltipPage) },
        { path: 'popover', element: withSuspense(PopoverPage) },
        { path: 'toast', element: withSuspense(ToastPage) },
        { path: 'table', element: withSuspense(DemoTable) },
        { path: 'avatar', element: withSuspense(AvatarPage) },
        { path: 'accordion', element: withSuspense(AccordionExample) },
        { path: 'card', element: withSuspense(CardPage) },
        { path: 'currency-toggler', element: withSuspense(CurrencyTogglerPage) },
        { path: 'typography', element: withSuspense(TypographyExample) },
        { path: 'tags', element: withSuspense(TagsPage) },
        { path: 'multi-level-select', element: withSuspense(MultiLevelSelectPage) },
        { path: 'badge', element: withSuspense(BadgeExample) },
        { path: 'divider', element: withSuspense(DividerPage) },
        { path: 'labeled-card', element: withSuspense(LabeledCardPage) },
        { path: 'detail-legend', element: withSuspense(DetailLegendPage) },
        { path: 'min-max-avg', element: withSuspense(MinMaxAvgPage) },
        { path: 'skeleton', element: withSuspense(SkeletonPage) },
        { path: 'mining-pools-panel', element: withSuspense(MiningPoolsPanelPage) },
        { path: 'report-time-frame-selector', element: withSuspense(ReportTimeFrameSelectorPage) },
        { path: 'site-stats-bar', element: withSuspense(SiteStatsBarPage) },
        { path: 'timeframe-controls', element: withSuspense(TimeframeControlsPage) },
        { path: 'timeline-selector', element: withSuspense(TimelineSelectorPage) },
        { path: 'miner-metric-card', element: withSuspense(MinerMetricCardPage) },
        { path: 'generic-data-box', element: withSuspense(GenericDataBoxPage) },
        { path: 'enabled-disable-toggle', element: withSuspense(EnabledDisableTogglePage) },
        { path: 'indicators', element: withSuspense(IndicatorsExample) },
        { path: 'list-view-filter', element: withSuspense(ListViewFilterExample) },
        { path: 'mosaic', element: withSuspense(MosaicPageDemo) },
        { path: 'mining-icons', element: withSuspense(MiningIconsExample) },
        { path: 'empty-state', element: withSuspense(EmptyStatePage) },
        { path: 'line-chart', element: withSuspense(LwLineChartExample) },
        { path: 'bar-chart', element: withSuspense(BarChartExample) },
        { path: 'area-chart', element: withSuspense(AreaChartExample) },
        { path: 'doughnut-chart', element: withSuspense(DoughnutChartPage) },
        { path: 'gauge-chart', element: withSuspense(GaugeChartPage) },
        { path: 'heatmap', element: withSuspense(HeatmapPage) },
        { path: 'threshold-line-chart', element: withSuspense(ThresholdLineChartPage) },
        { path: 'operations-energy-cost-chart', element: withSuspense(OperationsEnergyCostChartPage) },
        { path: 'average-downtime-chart', element: withSuspense(AverageDowntimeChartPage) },
        { path: 'chart-container', element: withSuspense(ChartContainerPage) },
        { path: 'line-chart-card', element: withSuspense(LineChartCardPage) },
        { path: 'tabs', element: withSuspense(TabsPage) },
        { path: 'btc-average-price', element: withSuspense(BtcAveragePricePage) },
        { path: 'breadcrumbs', element: withSuspense(BreadcrumbsPage) },
        { path: 'pagination', element: withSuspense(PaginationExample) },
        { path: 'sidebar', element: withSuspense(SidebarPage) },
        { path: 'spinner', element: withSuspense(SpinnerPage) },
        { path: 'loader', element: withSuspense(LoaderPage) },
        { path: 'logs-card', element: withSuspense(LogsCardPage) },
        { path: 'widget-top-row', element: withSuspense(WidgetTopRowPage) },
        { path: 'app-header', element: withSuspense(AppHeaderPage) },
        { path: 'header-stats-bar', element: withSuspense(HeaderStatsBarPage) },
        { path: 'alarms-bell-button', element: withSuspense(AlarmsBellButtonPage) },
        { path: 'profile-menu', element: withSuspense(ProfileMenuPage) },
        {
          path: 'dashboard-date-range-picker',
          element: withSuspense(DashboardDateRangePickerPage),
        },
        { path: 'export-button', element: withSuspense(ExportButtonPage) },
        { path: 'error-boundary', element: withSuspense(ErrorBoundaryPage) },
        { path: 'error-card', element: withSuspense(ErrorCardPage) },
        { path: 'active-incidents-card', element: withSuspense(ActiveIncidentsCardPage) },
        { path: 'metric-card', element: withSuspense(MetricCardPage) },
        { path: 'pool-details-card', element: withSuspense(PoolDetailsCardPage) },
        { path: 'pool-details-popover', element: withSuspense(PoolDetailsPopoverPage) },
        { path: 'device-explorer', element: withSuspense(DeviceExplorerPage) },
        { path: 'single-stat-card', element: withSuspense(SingleStatCardDemo) },
        { path: 'miners-activity-chart', element: withSuspense(MinersActivityChartDemo) },
        { path: 'power-mode-timeline-chart', element: withSuspense(PowerModeTimelineChartDemo) },
        { path: 'timeline-chart', element: withSuspense(TimelineChartDemo) },
        { path: 'settings', element: withSuspense(SettingsDemoPage) },
        { path: 'alerts-view', element: withSuspense(AlertsPageDemo) },
        { path: '*', element: withSuspense(NotFoundPage) },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
)
