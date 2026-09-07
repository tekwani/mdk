/**
 * Human labels for tool chips.
 *
 * Tools are supplied by whichever MCP server the operator points the agent at,
 * so no name can be hardcoded here — `summarize_site` and `get_device` happen to
 * come from the reference site tools, but another deployment ships another set
 * entirely. Callers pass a `toolLabels` map for the names they know; everything
 * else falls back to a readable form of the identifier.
 */

export type ToolLabels = Record<string, string>

/** `summarize_site` -> `Summarize site`. */
export function humanizeToolName(name: string): string {
  const words = name
    .replaceAll(/[_-]+/g, ' ')
    .replaceAll(/([a-z\d])([A-Z])/g, '$1 $2')
    .trim()
  if (words.length === 0) return name
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase()
}

export function toolLabel(name: string, labels?: ToolLabels): string {
  return labels?.[name] ?? humanizeToolName(name)
}

/** `420` -> `0.4s`, so a chip reads `Site status · 0.4s`. */
export function formatDuration(durationMs: number | undefined): string | null {
  if (durationMs === undefined || !Number.isFinite(durationMs)) return null
  const seconds = durationMs / 1000
  // Tenths stay readable up to a minute; past that the decimal is noise.
  return seconds < 60 ? `${seconds.toFixed(1)}s` : `${Math.round(seconds)}s`
}
