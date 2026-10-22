import { useMemo, useState } from 'react'
import type { JSX } from 'react'

import { Button, Checkbox, Typography } from '@tetherto/mdk-react-devkit/primitives'
import { CurrentAlerts, HistoricalAlerts } from '@tetherto/mdk-react-devkit/domain'

import { DemoPageHeader } from '../../components/demo-page-header'
import { useAlertsDemoState } from '../../utils/use-alerts-demo-state'

import { DEMO_DEVICES, DEMO_HISTORICAL_ALERTS } from './alerts-page.fixtures'

import './alerts-page.scss'

/**
 * Alerts demo: `CurrentAlerts` and `HistoricalAlerts` sharing one set of
 * filters. In an app, `DEMO_DEVICES` and `DEMO_HISTORICAL_ALERTS` come from
 * your own Gateway routes — see ./alerts-page.fixtures.ts.
 */
export const AlertsPageDemo = (): JSX.Element => {
  const [historicalEnabled, setHistoricalEnabled] = useState(true)
  const [soundTestEnabled, setSoundTestEnabled] = useState(false)
  const alerts = useAlertsDemoState()
  const { selectedAlertId, setSelectedAlertId, setFilterTags } = alerts

  const header = useMemo(
    () => (
      <div className="alerts-demo-toolbar">
        <label className="alerts-demo-toolbar__toggle">
          <Checkbox
            checked={historicalEnabled}
            onCheckedChange={(checked) => setHistoricalEnabled(checked === true)}
          />
          <Typography variant="body">Historical alerts log</Typography>
        </label>
        <label className="alerts-demo-toolbar__toggle">
          <Checkbox
            checked={soundTestEnabled}
            onCheckedChange={(checked) => setSoundTestEnabled(checked === true)}
          />
          <Typography variant="body">Enable alert sound (test)</Typography>
        </label>
        {selectedAlertId ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedAlertId(undefined)
              setFilterTags([])
            }}
          >
            Clear selected alert ({selectedAlertId})
          </Button>
        ) : null}
      </div>
    ),
    [historicalEnabled, selectedAlertId, setFilterTags, setSelectedAlertId, soundTestEnabled],
  )

  return (
    <div className="alerts-demo-page">
      <DemoPageHeader
        title="Alerts"
        description="Use the sound toggle in the toolbar to test the synthesized alarm on this page."
      />
      {header}
      <div className="alerts-demo-page__tables">
        <CurrentAlerts
          devices={DEMO_DEVICES}
          localFilters={alerts.localFilters}
          onLocalFiltersChange={alerts.setLocalFilters}
          filterTags={alerts.filterTags}
          onFilterTagsChange={alerts.setFilterTags}
          selectedAlertId={selectedAlertId}
          isSoundEnabled={soundTestEnabled}
          isDemoMode={!soundTestEnabled}
          onAlertClick={alerts.onAlertClick}
        />
        {historicalEnabled && (
          <HistoricalAlerts
            alerts={DEMO_HISTORICAL_ALERTS}
            localFilters={alerts.localFilters}
            filterTags={alerts.filterTags}
            dateRange={alerts.dateRange}
            onDateRangeChange={alerts.setDateRange}
            onAlertClick={alerts.onAlertClick}
          />
        )}
      </div>
    </div>
  )
}
