import { SkeletonBlock } from '@tetherto/mdk-react-devkit/primitives'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

export const SkeletonPage = (): JSX.Element => (
  <section className="demo-section">
    <DemoPageHeader title="Skeleton" description="Placeholder blocks shown while content loads." />
    <DemoBlock title="Text lines">
      <div className="demo-section__stack">
        <SkeletonBlock width={320} height={16} borderRadius={4} />
        <SkeletonBlock width={240} height={16} borderRadius={4} />
        <SkeletonBlock width={280} height={16} borderRadius={4} />
      </div>
    </DemoBlock>
    <DemoBlock title="Avatar and text">
      <div className="demo-section__row">
        <SkeletonBlock circle height={40} />
        <div className="demo-section__stack">
          <SkeletonBlock width={160} height={14} borderRadius={4} />
          <SkeletonBlock width={120} height={12} borderRadius={4} />
        </div>
      </div>
    </DemoBlock>
    <DemoBlock title="Card">
      <SkeletonBlock width="100%" height={80} borderRadius={8} />
    </DemoBlock>
  </section>
)
