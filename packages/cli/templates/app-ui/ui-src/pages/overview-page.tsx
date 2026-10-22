// Page: thin glue — read the hook, hand its output to the component.
import { Typography } from '@tetherto/mdk-react-devkit'

import { SummaryPanel } from '../components/summary-panel'
import { useSummary } from '../hooks/use-summary'

export const OverviewPage = () => (
  <section className="__APP_CSS__-page">
    <Typography variant="heading1">__APP_DISPLAY_NAME__</Typography>
    <Typography variant="secondary">
      Your app&apos;s starter page. Edit ui-src/ and rebuild with npm run build:ui.
    </Typography>
    <SummaryPanel view={useSummary()} />
  </section>
)

/** The same summary as a card on the dashboard's Home. */
export const SummaryHomePanel = () => <SummaryPanel view={useSummary()} />
