import { lazy } from 'react'

/**
 * The panel, split off from whatever mounts it.
 *
 * Both entries load it this way, and nothing in the package's root barrel may
 * import `co-pilot-panel` statically — one static edge anywhere in the graph
 * collapses the split back into the caller's main chunk, which bundlers report
 * as an ineffective dynamic import. That is why `CoPilotPanel` is reachable only
 * from the `./panel` subpath and not from the root export.
 *
 * What sits behind the boundary is the transcript: the markdown renderer and the
 * syntax highlighter. Eagerly bundled, they made the generated shell's main
 * chunk 80% larger before anyone had opened the panel.
 */
export const LazyCoPilotPanel = lazy(async () => {
  const module = await import('../components/co-pilot-panel')
  return { default: module.CoPilotPanel }
})
