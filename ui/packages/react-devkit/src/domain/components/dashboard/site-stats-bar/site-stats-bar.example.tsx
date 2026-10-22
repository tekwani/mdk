/**
 * Runnable example for SiteStatsBar.
 *
 * Compose the four site-level stats (current power, hashrate, miner count,
 * container count) into one summary strip. Drives off pre-computed numbers
 * — a page derives them from its own site summary route.
 */
import { SiteStatsBar } from '@tetherto/mdk-react-devkit'

export const SiteStatsBarExample = () => (
  <SiteStatsBar
    title="Site A"
    power={1_320_000}
    powerUnit="kW"
    totalHashrate={92.3}
    hashrateUnit="TH/s"
    minerCount={1024}
    containerCount={4}
  />
)
