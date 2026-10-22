import { TimelineSelector } from '@tetherto/mdk-react-devkit/domain'
import { useState } from 'react'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

export const TimelineSelectorPage = (): JSX.Element => {
  const [value, setValue] = useState('5m')

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Timeline Selector"
        description="Dropdown for a chart's time window (5 min, 30 min, 3 h, 1 day)."
      />
      <DemoBlock title="Default options" description={`Selected: ${value}`}>
        <TimelineSelector value={value} onChange={setValue} />
      </DemoBlock>
    </section>
  )
}
