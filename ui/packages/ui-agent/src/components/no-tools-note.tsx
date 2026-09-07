import type { JSX } from 'react'

import { InfoIcon } from './icons'

/**
 * Marks an answer that consulted nothing.
 *
 * The agent's premise is that it reads the fleet through tools rather than
 * inventing it, so a turn that emitted no `tool_call` answered from the model's
 * own weights and its conversation history — including, sometimes, a confident
 * claim that a write was carried out when none was. That failure is not
 * detectable from the text, but the absence of tool activity is a fact the UI
 * holds exactly, so it is stated rather than left to be inferred from a missing
 * chip.
 *
 * Still shown for benign cases — a decline, an answer the tools cannot cover —
 * because "this answer did not consult the fleet" is true and useful there too.
 * The one exception is small talk (`core/small-talk`): against "hey" there was
 * never a tool to call, and marking every greeting turned the note into
 * wallpaper.
 *
 * Rendered as a suffix on the existing `CO-PILOT` label rather than a sentence
 * of its own: in a degraded session every answer carries it, and a repeated
 * full-width line turned the transcript into a column of warnings. On the label
 * row it costs no vertical space and still reads at a glance; the full sentence
 * lives in the tooltip.
 */
export const NoToolsNote = (): JSX.Element => (
  <span className="mdk-agent-no-tools" title="No tool was called for this answer — it came from the model alone, not from the fleet.">
    <InfoIcon size={11} aria-hidden="true" />
    no tools used
  </span>
)
