import { MinerMetricCard } from '@tetherto/mdk-react-devkit/domain'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

export const MinerMetricCardPage = (): JSX.Element => (
  <section className="demo-section">
    <DemoPageHeader
      title="Miner Metric Card"
      description="One miner's efficiency, hashrate, temperature, frequency and consumption, plus free-form secondary stats."
    />
    <DemoBlock
      title="Primary and secondary stats"
      description="`primaryStats` fills the named slots (Efficiency, Hash rate, Temperature, Frequency, Consumption); `secondaryStats` are listed as given."
    >
      <MinerMetricCard
        primaryStats={[
          { name: 'Efficiency', value: 28.3, unit: 'J/TH' },
          { name: 'Hash rate', value: 95.5, unit: 'TH/s' },
          { name: 'Temperature', value: 65, unit: '°C' },
          { name: 'Frequency', value: 620, unit: 'MHz' },
          { name: 'Consumption', value: 3.25, unit: 'kW' },
        ]}
        secondaryStats={[
          { name: 'Fan speed', value: 4200, unit: 'RPM' },
          { name: 'Uptime', value: '12d 4h' },
        ]}
      />
    </DemoBlock>
  </section>
)
