import type { JSX } from 'react'
import { memo, useState } from 'react'

import { clipToBoundary } from '../core/markdown'
import { MarkdownText } from './markdown-text'

/**
 * Where an answer stops being readable in a docked panel.
 *
 * The panel is 420×640, so a few thousand characters is already several screens
 * of scrolling between one question and the next.
 */
export const COLLAPSE_ABOVE_CHARS = 3000
/** How much of it is shown collapsed. */
export const COLLAPSED_CHARS = 1500

export type CollapsibleAnswerProps = {
  text: string
  /** While the turn streams the answer is never collapsed: growth has to stay visible. */
  streaming?: boolean
}

/**
 * An answer, collapsed behind a toggle when it is long enough to bury the rest of
 * the transcript.
 *
 * Only ever collapsed once the turn has settled — mid-stream, hiding the tail
 * would hide the very thing the operator is watching.
 */
const CollapsibleAnswerView = ({ text, streaming = false }: CollapsibleAnswerProps): JSX.Element => {
  const [expanded, setExpanded] = useState(false)

  const isLong = !streaming && text.length > COLLAPSE_ABOVE_CHARS
  const shown = isLong && !expanded ? clipToBoundary(text, COLLAPSED_CHARS) : text

  return (
    <>
      <MarkdownText text={shown} streaming={streaming} />
      {isLong
        ? (
            <button
              type="button"
              className="mdk-agent-markdown__more"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show less' : 'Show full answer'}
            </button>
          )
        : null}
    </>
  )
}

export const CollapsibleAnswer = memo(CollapsibleAnswerView)
