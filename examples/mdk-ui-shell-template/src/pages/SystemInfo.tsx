import { useSystemInfo } from '@tetherto/mdk-react-adapter'

import { PageLayout } from '../components/PageLayout'
import { SystemInfoPanel } from '../components/SystemInfoPanel'

/**
 * Reference example page: a minimal, working API-backed page.
 *
 * It reads three read-only Gateway endpoints (`/auth/site`, `/auth/userinfo`,
 * `/auth/featureConfig`) through the `useSystemInfo` adapter hook and hands the
 * shaped payload straight to a presentational panel. This is the clean-
 * architecture flow every MDK page should follow — and the pattern LLM skills
 * should mirror when wiring a new API-backed page:
 *
 *   foundation query factory  (packages/ui-foundation — owns the endpoint + fetch)
 *     → adapter hook           (`useSystemInfo` — binds the factory, shapes data)
 *       → thin page            (this file — reads the hook, renders a component)
 *         → presentational UI  (`SystemInfoPanel` — props in, markup out)
 *
 * The page holds no `fetch`, no data shaping, and no store access. Delete it
 * once you have wired your own pages.
 */
const SystemInfo = () => {
  const { info, isLoading, error, refetch } = useSystemInfo()

  return (
    <PageLayout
      title="System Info"
      className="mdk-ui-shell-system-info"
      actions={(
        <button
          type="button"
          className="mdk-ui-shell-system-info__refresh"
          onClick={refetch}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      )}
    >
      <SystemInfoPanel info={info} isLoading={isLoading} error={error} />
    </PageLayout>
  )
}

export default SystemInfo
