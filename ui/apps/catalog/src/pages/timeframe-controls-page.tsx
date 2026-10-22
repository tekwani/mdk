import { TimeframeControls } from '@tetherto/mdk-react-devkit/domain'
import { useState } from 'react'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

export const TimeframeControlsPage = (): JSX.Element => {
  const [range, setRange] = useState<string>('No range picked yet.')

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Timeframe Controls"
        description="Year, month and week pickers that emit a date range for reports."
      />
      <DemoBlock title="Horizontal" description={range}>
        <TimeframeControls
          layout="horizontal"
          onRangeChange={(next) => setRange(`Range: ${JSON.stringify(next)}`)}
        />
      </DemoBlock>
    </section>
  )
}
