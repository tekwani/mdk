// Hook layer (@tetherto/mdk-react-adapter): fetches the summary and shapes it
// into exactly what the component renders, including loading and error states.
import { MdkFetchError } from '@tetherto/mdk-ui-foundation'
import { useMdkApp, useQuery } from '@tetherto/mdk-react-adapter'

import { fetchSummary, summaryQueryKey } from '../data/summary'

export type SummaryView =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'no-kernel' }
  | { status: 'ready'; stats: Array<{ label: string; value: number }> }

// The Gateway answered, but nothing serves this route: the app's runtime is
// not running, or the route is not in plugin/mdk-plugin.json.
const NOT_SERVED = 404
// The Gateway or the app's runtime did not answer (a dev proxy reports a
// stopped Gateway as 500).
const UNREACHABLE = new Set([500, 502, 503, 504])

const describeError = (error: unknown, url: string): string => {
  if (error instanceof MdkFetchError && error.status === NOT_SERVED) {
    return `Nothing serves ${url} yet (HTTP 404). The Gateway is up, but this app's backend runtime is not running or does not have this route.`
  }
  if (error instanceof MdkFetchError && UNREACHABLE.has(error.status)) {
    return `The app's backend is not reachable (HTTP ${error.status}). Start the stack with \`mdk run\`.`
  }
  return error instanceof Error ? error.message : String(error)
}

/** The app's summary, ready to render. */
export const useSummary = (): SummaryView => {
  // The app's routes live under the name the operator installed it as, so the
  // URL comes from useMdkApp() rather than being hardcoded.
  const { apiUrl } = useMdkApp()
  const url = apiUrl('/api/__APP_NAME__/summary')

  const query = useQuery({
    queryKey: summaryQueryKey(url),
    queryFn: () => fetchSummary(url),
    retry: false,
  })

  if (query.isPending) return { status: 'loading' }
  if (query.isError) return { status: 'error', message: describeError(query.error, url) }
  if (!query.data.kernelConnected) return { status: 'no-kernel' }
  return {
    status: 'ready',
    stats: [
      { label: 'Workers', value: query.data.workerCount },
      { label: 'Devices', value: query.data.deviceCount },
    ],
  }
}
