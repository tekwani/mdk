import { LabeledCard } from '@tetherto/mdk-react-devkit/primitives'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

const Body = ({ text }: { text: string }): JSX.Element => (
  <p className="demo-section__card-body">{text}</p>
)

export const LabeledCardPage = (): JSX.Element => (
  <section className="demo-section">
    <DemoPageHeader
      title="Labeled Card"
      description="Card with a label on its top border; the label can link elsewhere."
    />
    <DemoBlock title="Variants">
      <div className="demo-section__stack">
        <LabeledCard label="Device Overview">
          <Body text="Default card" />
        </LabeledCard>
        <LabeledCard label="Farm Summary" isFullWidth>
          <Body text="Full width" />
        </LabeledCard>
        <LabeledCard label="Metrics" isDark>
          <Body text="Dark" />
        </LabeledCard>
        <LabeledCard label="Borderless" hasNoBorder>
          <Body text="No border" />
        </LabeledCard>
      </div>
    </DemoBlock>
    <DemoBlock
      title="Label as a link"
      description="`getNavigateOptions` turns the label into a link."
    >
      <LabeledCard
        label="Pool Statistics"
        getNavigateOptions={() => ({ href: '#pool-stats', target: '_self' })}
      >
        <Body text="Click the label to navigate" />
      </LabeledCard>
    </DemoBlock>
  </section>
)
