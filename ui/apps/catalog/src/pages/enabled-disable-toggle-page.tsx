import { EnabledDisableToggle } from '@tetherto/mdk-react-devkit/domain'
import { useState } from 'react'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

export const EnabledDisableTogglePage = (): JSX.Element => {
  const [isOn, setIsOn] = useState(true)

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Enabled / Disable Toggle"
        description="On/off switch for a numbered unit, such as a cooling tank, with offline and disabled states."
      />
      <DemoBlock title="Interactive" description={`Tank 1 is ${isOn ? 'on' : 'off'}.`}>
        <EnabledDisableToggle
          value={isOn}
          tankNumber={1}
          isButtonDisabled={false}
          isOffline={false}
          onToggle={({ isOn: next }) => setIsOn(next)}
        />
      </DemoBlock>
      <DemoBlock title="Offline and disabled">
        <div className="demo-section__row">
          <EnabledDisableToggle
            value={false}
            tankNumber={2}
            isButtonDisabled={false}
            isOffline
            onToggle={() => undefined}
          />
          <EnabledDisableToggle
            value
            isButtonDisabled
            tankNumber={3}
            isOffline={false}
            onToggle={() => undefined}
          />
        </div>
      </DemoBlock>
    </section>
  )
}
