import { DetailLegend } from '@tetherto/mdk-react-devkit/primitives'
import { useState } from 'react'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

const ITEMS = [
  {
    label: 'Hashrate',
    color: '#59E8E8',
    currentValue: { value: 3590, unit: 'TH/s' },
    percentChange: 2.5,
  },
  {
    label: 'Power',
    color: '#FF9500',
    currentValue: { value: 1200, unit: 'W' },
    percentChange: -0.8,
  },
  {
    label: 'Efficiency',
    color: '#A78BFA',
    currentValue: { value: 28.5, unit: 'J/TH' },
    percentChange: 0,
  },
]

export const DetailLegendPage = (): JSX.Element => {
  const [hidden, setHidden] = useState<Record<number, boolean>>({})
  const items = ITEMS.map((item, i) => ({ ...item, hidden: !!hidden[i] }))

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Detail Legend"
        description="Chart legend with each series' current value and percentage change."
      />
      <DemoBlock title="Interactive" description="Click an item to toggle its series.">
        <DetailLegend
          items={items}
          onToggle={(_, index) => setHidden((prev) => ({ ...prev, [index]: !prev[index] }))}
        />
      </DemoBlock>
      <DemoBlock title="Static" description="Without `onToggle` the items are read-only.">
        <DetailLegend
          items={[
            { label: 'Accepted', color: '#4ADE80', currentValue: { value: '98.7', unit: '%' } },
            { label: 'Rejected', color: '#F87171', currentValue: { value: '1.3', unit: '%' } },
          ]}
        />
      </DemoBlock>
    </section>
  )
}
