import { MinerMetricCard } from '@tetherto/mdk-react-devkit'

export const MinerMetricCardExample = () => (
  <div className="mdk-example-row">
    <MinerMetricCard
      primaryStats={[
        { name: 'Efficiency', value: 28.3, unit: 'J/TH' },
        { name: 'Hash rate', value: 95.5, unit: 'TH/s' },
        { name: 'Temperature', value: 65, unit: '°C' },
        { name: 'Frequency', value: 620, unit: 'MHz' },
        { name: 'Consumption', value: 3.25, unit: 'kW' },
      ]}
      secondaryStats={[{ name: 'Fan speed', value: 4200, unit: 'RPM' }]}
      showSecondaryStats={true}
    />
  </div>
)
