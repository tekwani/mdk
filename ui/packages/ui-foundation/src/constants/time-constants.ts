/**
 * Plain time units. Backend-agnostic by nature, and kept here rather than in the
 * mining alert-query builders so that a generic helper such as
 * `fetchHistoricalAlertsInChunks` need not import from the mining dialect just to
 * get "one day in milliseconds".
 */

/** One day in milliseconds. */
export const ONE_DAY_MS = 24 * 60 * 60 * 1_000
