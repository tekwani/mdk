// Component layer (@tetherto/mdk-react-devkit): renders what the hook shaped.
// No fetching, no data logic.
import { EmptyState, ErrorCard, Loader, SingleStatCard } from '@tetherto/mdk-react-devkit'

import type { SummaryView } from '../hooks/use-summary'

export const SummaryPanel = ({ view }: { view: SummaryView }) => {
  switch (view.status) {
    case 'loading':
      return <Loader />
    case 'error':
      return <ErrorCard title="Could not load the summary" error={view.message} />
    case 'no-kernel':
      return <EmptyState description="The backend is up, but not connected to a Kernel yet." size="sm" />
    case 'ready':
      return (
        <div className="__APP_CSS__-summary">
          {view.stats.map((stat) => (
            <SingleStatCard key={stat.label} name={stat.label} value={stat.value} />
          ))}
        </div>
      )
  }
}
