import type { ComponentPropsWithoutRef, JSX } from 'react'
import type { ExtraProps } from 'react-markdown'
import { useEffect, useRef, useState } from 'react'

/** How long the button confirms the copy before going back to its label. */
const COPIED_FEEDBACK_MS = 1500

export type CodeBlockProps = ComponentPropsWithoutRef<'pre'> & ExtraProps

/**
 * A fenced code block, with a copy button.
 *
 * What the panel puts in fences is mostly shell commands and JSON an operator
 * wants to run or paste somewhere, so copying it is the common next action.
 *
 * The text is read off the rendered node rather than reassembled from the hast
 * tree: the highlighter has already replaced the block's children with token
 * spans, and `textContent` is exactly the source again. The button is absent
 * where the Clipboard API is — it needs a secure context, and a gateway on a site
 * LAN is served over plain http.
 */
export const CodeBlock = ({ children, node, ...rest }: CodeBlockProps): JSX.Element => {
  const codeRef = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)

  const canCopy = typeof navigator?.clipboard?.writeText === 'function'

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = () => {
    const text = codeRef.current?.textContent ?? ''
    if (!text) return
    void navigator.clipboard.writeText(text).then(
      () => setCopied(true),
      () => {
        // Denied by permissions policy, or the document is not focused. Nothing
        // to report — the code is still on screen and selectable.
      },
    )
  }

  return (
    <div className="mdk-agent-code">
      <pre ref={codeRef} {...rest}>{children}</pre>
      {canCopy
        ? (
            <button
              type="button"
              className="mdk-agent-code__copy"
              aria-label={copied ? 'Copied' : 'Copy code'}
              onClick={copy}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          )
        : null}
    </div>
  )
}
