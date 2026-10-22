import { ExportButton } from '@tetherto/mdk-react-devkit/domain'
import type { JSX } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'
import { useDemoToast } from '../utils/use-demo-toast'

export const ExportButtonPage = (): JSX.Element => {
  const { showToast, ToasterSlot } = useDemoToast()

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Export Button"
        description="Split-button trigger for downloading the current dashboard state. The left half labels the action; the right half opens a dropdown with the available formats and invokes onExport(format) on selection."
      />

      <DemoBlock
        title="Default — CSV and JSON"
        description="In a real page, the handler serialises the data the page is showing and downloads it."
      >
        <ExportButton
          onExport={(format) =>
            showToast(`Export ${format.toUpperCase()}`, {
              variant: 'success',
              description: `onExport handler received "${format}".`,
            })
          }
        />
      </DemoBlock>

      <DemoBlock
        title="Async export"
        description="Return a promise from onExport and the button shows a spinner, disabled, until it settles. A rejection clears the spinner; report the failure inside the handler."
      >
        <ExportButton
          onExport={async (format) => {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            showToast(`Exported as ${format.toUpperCase()}`, { variant: 'success' })
          }}
        />
      </DemoBlock>

      <DemoBlock
        title="Restricted format list"
        description="Pass `formats` to limit the dropdown — useful when only one shape is supported."
      >
        <ExportButton
          formats={['csv']}
          onExport={(format) => showToast(`Export ${format.toUpperCase()}`, { variant: 'info' })}
        />
      </DemoBlock>

      <DemoBlock
        title="Custom label"
        description="Override the trigger label without changing the dropdown contract."
      >
        <ExportButton
          label="Download report"
          onExport={(format) =>
            showToast(`Download report (${format.toUpperCase()})`, { variant: 'info' })
          }
        />
      </DemoBlock>

      <DemoBlock title="Disabled" description="The trigger renders but does not open the menu.">
        <ExportButton onExport={() => undefined} disabled />
      </DemoBlock>

      <ToasterSlot />
    </section>
  )
}
