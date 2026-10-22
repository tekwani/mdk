import { GenericDataBox } from '@tetherto/mdk-react-devkit/domain'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

export const GenericDataBoxPage = (): JSX.Element => (
  <section className="demo-section">
    <DemoPageHeader
      title="Generic Data Box"
      description="Label / value rows with units, highlighting and per-row colour."
    />
    <DemoBlock title="Readings">
      <GenericDataBox
        data={[
          { label: 'Temperature', value: 45, units: '°C' },
          { label: 'Pressure', value: 2.5, units: 'bar', isHighlighted: true },
          { label: 'Status', value: 'Running', color: 'green' },
        ]}
      />
    </DemoBlock>
  </section>
)
