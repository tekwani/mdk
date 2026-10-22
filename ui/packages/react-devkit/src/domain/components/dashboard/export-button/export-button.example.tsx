/**
 * Runnable example for ExportButton.
 *
 * The handler in this demo just logs the selected format. A real page
 * would serialise the data it is showing in that format and download it.
 */
import { ExportButton } from '@tetherto/mdk-react-devkit'

export const ExportButtonExample = () => (
  <ExportButton
    onExport={(format) => {
      console.warn('Export requested:', format)
    }}
  />
)
