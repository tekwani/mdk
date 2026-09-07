/**
 * Two text repairs applied before an answer is rendered as markdown.
 *
 * Both exist because the model decides its own output format and nothing in the
 * charter constrains it: the panel has to read whatever comes back.
 */

/** Opening fence of a whole-answer wrapper: ```markdown / ```md, nothing else on the line. */
const MARKDOWN_FENCE_OPEN = /^`{3,}\s*(?:markdown|md)\s*$/i
/** Any closing fence line. */
const FENCE_CLOSE = /^`{3,}\s*$/

/**
 * Unwraps an answer the model wrapped entirely in a ```markdown fence.
 *
 * A common quirk: asked for a formatted answer, the model returns the formatted
 * answer inside a fence, and the panel renders the whole reply as one code block
 * — table syntax, bullets and all. Only the whole-answer case is unwrapped, and
 * only when the fence actually closes at the end: an ordinary code fence, an
 * unclosed fence mid-stream, and a fence with prose after it are all left alone.
 */
export function unwrapWholeAnswerFence(text: string): string {
  const lines = text.trim().split('\n')
  const first = lines[0]
  if (lines.length < 2 || first === undefined || !MARKDOWN_FENCE_OPEN.test(first)) return text

  // Paired with the last fence line, which is a whole-answer wrapper only if it is
  // also the final line: an unclosed fence, or one with prose after it, is not.
  const last = lines[lines.length - 1]
  if (last === undefined || !FENCE_CLOSE.test(last)) return text

  return lines.slice(1, -1).join('\n')
}

/**
 * Cuts `text` to roughly `max` characters, on the last paragraph or line break
 * before the limit.
 *
 * Slicing markdown at an arbitrary character can split a fence or a table row and
 * make the preview render as something the answer never said, so the cut lands on
 * a block boundary where there is one within reach.
 */
export function clipToBoundary(text: string, max: number): string {
  if (text.length <= max) return text

  const head = text.slice(0, max)
  const paragraph = head.lastIndexOf('\n\n')
  const line = head.lastIndexOf('\n')
  const cut = paragraph > max / 2 ? paragraph : line > max / 2 ? line : max

  return head.slice(0, cut).trimEnd()
}
