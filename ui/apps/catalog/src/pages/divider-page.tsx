import { Divider } from '@tetherto/mdk-react-devkit/primitives'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

export const DividerPage = (): JSX.Element => (
  <section className="demo-section">
    <DemoPageHeader
      title="Divider"
      description="Horizontal or vertical separator line, optionally with a label. Wraps the Radix separator."
    />
    <DemoBlock title="Line styles">
      <div className="demo-section__stack">
        <Divider />
        <Divider dashed />
        <Divider dotted />
      </div>
    </DemoBlock>
    <DemoBlock title="With a label">
      <div className="demo-section__stack">
        <Divider>Section</Divider>
        <Divider align="left">Pool Statistics</Divider>
        <Divider plain>or</Divider>
      </div>
    </DemoBlock>
  </section>
)
