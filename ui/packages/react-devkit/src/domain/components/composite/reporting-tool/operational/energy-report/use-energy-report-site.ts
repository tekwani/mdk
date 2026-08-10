import { useMemo } from 'react'

import {
  attachContainerMinerCounts,
  buildPowerModeTableRows,
  buildSitePowerConsumptionSlice,
  getContainerMinersChartData,
  readEnergyReportTailLogHead,
} from './energy-report-site.utils'
import type { UseEnergyReportSiteInput, UseEnergyReportSiteResult } from './energy-report.types'

/**
 * Merges site energy consumption (v2 /auth/metrics/consumption) with snapshot tail-log
 * and container list data for the Energy report site tab.
 *
 * @remarks
 * The `/auth/metrics/*` endpoint is illustrative. MDK does not ship built-in
 * endpoints — create your own via a
 * [Gateway plugin](https://docs.tether.io/mdk/guides/gateway/plugins) matching
 * your Worker/business logic. See the
 * [full-site example](https://github.com/tetherto/mdk/tree/main/examples/full-site/plugins/site)
 * for a working reference.
 *
 * @category misc
 * @domain mining-operations
 * @kernelCapability energy-consumption
 * @tier agent-ready
 */
export const useEnergyReportSite = ({
  dateRange: _dateRange,
  consumptionLog,
  consumptionLoading,
  consumptionFetching,
  consumptionError,
  nominalPowerAvailabilityMw,
  nominalConfigLoading,
  tailLog,
  tailLogLoading,
  containers,
  containersLoading,
}: UseEnergyReportSiteInput): UseEnergyReportSiteResult => {
  const powerConsumptionData = useMemo(
    () =>
      buildSitePowerConsumptionSlice({
        log: consumptionLog,
        nominalMw: nominalPowerAvailabilityMw,
        nominalConfigLoading,
        consumptionLoading,
        consumptionFetching,
        consumptionError,
      }),
    [
      consumptionLog,
      nominalPowerAvailabilityMw,
      nominalConfigLoading,
      consumptionLoading,
      consumptionFetching,
      consumptionError,
    ],
  )

  const powerModeData = useMemo(() => buildPowerModeTableRows(tailLog), [tailLog])

  const containersWithCounts = useMemo(
    () => attachContainerMinerCounts(containers, tailLog),
    [containers, tailLog],
  )

  const tailLogHead = useMemo(
    () => readEnergyReportTailLogHead(tailLog),
    [tailLog],
  )

  const miningUnitCards = useMemo(
    () =>
      containersWithCounts.map((container) => {
        const containerId = container.info?.container ?? ''
        return {
          container,
          containerId,
          chartData: getContainerMinersChartData(
            containerId,
            tailLogHead,
            Number(container.info?.nominalMinerCapacity ?? 0),
          ),
        }
      }),
    [containersWithCounts, tailLogHead],
  )

  const isLoading = !!(tailLogLoading || containersLoading)

  return {
    powerConsumptionData,
    powerModeData,
    containers: containersWithCounts,
    tailLogData: tailLog ?? [],
    tailLogHead,
    miningUnitCards,
    isLoading,
  }
}
