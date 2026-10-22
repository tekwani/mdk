// Data layer (@tetherto/mdk-ui-foundation): the contract with the app's own
// backend — the response type, its query key and the request. No React here.
import { mdkFetch } from '@tetherto/mdk-ui-foundation'

/** What the app's `summary` route returns (`plugin/controllers/summary.js`, `GET /api/<name>/summary`). */
export type Summary = {
  ok: boolean
  kernelConnected: boolean
  workerCount: number
  deviceCount: number
  workers: Array<{ workerId: string; devices: number }>
}

/** Query key for the summary at one URL. */
export const summaryQueryKey = (url: string) => ['__APP_NAME__', 'summary', url] as const

/** GET the summary, with the signed-in operator's token. */
export const fetchSummary = (url: string): Promise<Summary> => mdkFetch<Summary>(url)
