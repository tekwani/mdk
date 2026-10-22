import { SiteStatsBar } from '@tetherto/mdk-react-devkit/domain'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

export const SiteStatsBarPage = (): JSX.Element => (
  <section className="demo-section">
    <DemoPageHeader
      title="Site Stats Bar"
      description="Headline power, hashrate, miner and container counts for one site."
    />
    <DemoBlock title="Site A">
      <SiteStatsBar
        title="Site A"
        power={1_320_000}
        powerUnit="kW"
        totalHashrate={92.3}
        hashrateUnit="TH/s"
        minerCount={1024}
        containerCount={4}
      />
    </DemoBlock>
  </section>
)
