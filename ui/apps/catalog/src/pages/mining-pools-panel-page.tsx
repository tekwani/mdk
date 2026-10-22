import { type MiningPoolRow, MiningPoolsPanel } from '@tetherto/mdk-react-devkit/domain'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

const ROWS: MiningPoolRow[] = [
  {
    id: 'pool-a-shelf-0',
    name: 'minerpool-pool-a-shelf-0',
    revenue24hBtc: 0.0231,
    hashratePhs: 0.901,
    details: [
      { title: 'Id', value: 'pool-a-shelf-0' },
      { title: 'Rack', value: 'R-12' },
      { title: 'User name', value: 'operator' },
      { title: 'Balance', value: '0.0214 BTC' },
      { title: 'Unsettled', value: '0.0017 BTC' },
      { title: 'Revenue last 24hrs', value: '0.0231 BTC' },
      { title: 'Active Worker Count', value: 24 },
    ],
  },
  {
    id: 'pool-b-shelf-0',
    name: 'minerpool-pool-b-shelf-0',
    revenue24hBtc: 0.0142,
    hashratePhs: 1.21,
    details: [
      { title: 'Id', value: 'pool-b-shelf-0' },
      { title: 'Rack', value: 'R-04' },
      { title: 'User name', value: 'operator' },
      { title: 'Balance', value: '0.0136 BTC' },
      { title: 'Unsettled', value: '0.0006 BTC' },
      { title: 'Revenue last 24hrs', value: '0.0142 BTC' },
      { title: 'Active Worker Count', value: 18 },
    ],
  },
]

export const MiningPoolsPanelPage = (): JSX.Element => (
  <section className="demo-section">
    <DemoPageHeader
      title="Mining Pools Panel"
      description="Pool accounts with 24h revenue and hashrate; each row expands to its details. Below 1 PH/s a row shows TH/s."
    />
    <DemoBlock title="Two pools">
      <MiningPoolsPanel rows={ROWS} />
    </DemoBlock>
  </section>
)
