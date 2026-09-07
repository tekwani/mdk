import type { JSX } from 'react'

import type { LeakedToolCall } from '../core/prose'

export type LeakedToolCallNoticeProps = {
  call: LeakedToolCall
}

/**
 * Shown in place of an answer that is really a tool call the model failed to
 * emit correctly.
 *
 * The agent's tool loop is prompt-based: the model is asked to reply with only
 * `{"tool": …}`, and the producer classifies the reply as a tool call from its
 * first character being `{`. A model that wraps the JSON in a ```json fence
 * leads with a backtick, so the call is classified as prose and streamed to the
 * operator verbatim. Rendering that raw is the most confusing failure in the
 * stack; naming it is cheap and makes the retry obvious.
 */
export const LeakedToolCallNotice = ({ call }: LeakedToolCallNoticeProps): JSX.Element => (
  <div className="mdk-agent-leaked" role="status">
    <p className="mdk-agent-leaked__title">The model returned a malformed tool call.</p>
    <p className="mdk-agent-leaked__body">
      {`It tried to call `}
      <code className="mdk-agent-leaked__tool">{call.tool}</code>
      {` but wrapped the request in formatting, so it was never run. Ask again.`}
    </p>
  </div>
)
