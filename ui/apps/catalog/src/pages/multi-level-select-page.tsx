import { MultiLevelSelect } from '@tetherto/mdk-react-devkit/primitives'
import { useState } from 'react'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

export const MultiLevelSelectPage = (): JSX.Element => {
  const [worker, setWorker] = useState('')

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Multi-Level Select"
        description="Select whose options are grouped in collapsible sections, e.g. workers by pool."
      />
      <DemoBlock
        title="Workers by pool"
        description={worker ? `Selected: ${worker}` : 'Nothing selected yet.'}
      >
        <MultiLevelSelect.Root value={worker} onValueChange={setWorker}>
          <MultiLevelSelect.Trigger>
            <MultiLevelSelect.Value placeholder="Select worker..." />
          </MultiLevelSelect.Trigger>
          <MultiLevelSelect.Content>
            <MultiLevelSelect.Section sectionTitle="Pool A" defaultOpen>
              <MultiLevelSelect.Item value="worker-a-1">Worker A-1</MultiLevelSelect.Item>
              <MultiLevelSelect.Item value="worker-a-2">Worker A-2</MultiLevelSelect.Item>
            </MultiLevelSelect.Section>
            <MultiLevelSelect.Section sectionTitle="Pool B">
              <MultiLevelSelect.Item value="worker-b-1">Worker B-1</MultiLevelSelect.Item>
            </MultiLevelSelect.Section>
          </MultiLevelSelect.Content>
        </MultiLevelSelect.Root>
      </DemoBlock>
    </section>
  )
}
