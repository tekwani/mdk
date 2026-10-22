import { MinMaxAvg } from '@tetherto/mdk-react-devkit/primitives'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

export const MinMaxAvgPage = (): JSX.Element => (
  <section className="demo-section">
    <DemoPageHeader
      title="Min / Max / Avg"
      description="Inline min, max and average readout, as used in chart footers."
    />
    <DemoBlock title="Hashrate">
      <MinMaxAvg min="65 TH/s" max="80 TH/s" avg="72.6 TH/s" />
    </DemoBlock>
  </section>
)
