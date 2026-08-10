import type { SystemInfo } from '@tetherto/mdk-react-adapter'
import { FALLBACK } from '@tetherto/mdk-react-devkit'

export interface SystemInfoPanelProps {
  /** Already-shaped values from the `useSystemInfo` adapter hook. */
  info: SystemInfo
  isLoading: boolean
  error: unknown
}

interface InfoRow { label: string, value: string | undefined }

/**
 * Presentational System Info panel. Renders already-shaped props into markup —
 * no data fetching, no business logic, no store access (see the
 * separation-of-concerns rule in the MDK docs). The `useSystemInfo` hook owns
 * all data shaping; this component only turns that payload into a definition
 * list.
 */
export const SystemInfoPanel = ({ info, isLoading, error }: SystemInfoPanelProps) => {
  if (error != null) {
    return (
      <section className="mdk-ui-shell-system-info__card mdk-ui-shell-system-info__card--error">
        <p className="mdk-ui-shell-system-info__error">
          Could not load system info. Check that you are signed in and the Gateway is reachable.
        </p>
      </section>
    )
  }

  const rows: InfoRow[] = [
    { label: 'Site', value: info.site },
    { label: 'Signed in as', value: info.email },
    { label: 'Roles', value: info.roles },
    { label: 'Feature flags', value: String(info.featureCount) },
  ]

  return (
    <section className="mdk-ui-shell-system-info__card">
      <dl className="mdk-ui-shell-system-info__list">
        {rows.map((row) => (
          <div key={row.label} className="mdk-ui-shell-system-info__row">
            <dt className="mdk-ui-shell-system-info__label">{row.label}</dt>
            <dd className="mdk-ui-shell-system-info__value">
              {isLoading ? 'Loading…' : (row.value ?? FALLBACK)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
