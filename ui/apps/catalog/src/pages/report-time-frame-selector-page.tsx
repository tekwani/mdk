import { ReportTimeFrameSelector } from '@tetherto/mdk-react-devkit/domain'
import { useState } from 'react'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

export const ReportTimeFrameSelectorPage = (): JSX.Element => {
  const [preset, setPreset] = useState<number | null>(30)
  const [range, setRange] = useState<[Date, Date]>(() => {
    const now = new Date()
    return [now, now]
  })

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Report Time Frame Selector"
        description="Preset day ranges plus a custom date range for reports."
      />
      <DemoBlock
        title="Presets and custom range"
        description={
          preset
            ? `Preset: last ${preset} days`
            : `Custom: ${range[0].toDateString()} – ${range[1].toDateString()}`
        }
      >
        <ReportTimeFrameSelector
          presetTimeFrame={preset}
          dateRange={range}
          setPresetTimeFrame={setPreset}
          setDateRange={setRange}
        />
      </DemoBlock>
    </section>
  )
}
