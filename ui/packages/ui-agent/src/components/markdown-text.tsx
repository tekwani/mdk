import type { JSX } from 'react'
import type { Components } from 'react-markdown'
import { memo } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { unwrapWholeAnswerFence } from '../core/markdown'
import { CodeBlock } from './code-block'
import { MarkdownLink } from './markdown-link'
import { rehypeHighlightSubset } from './rehype-highlight-subset'

// Module scope, not inline: a fresh array each render makes react-markdown
// rebuild its processor for every streamed token.
const REMARK_PLUGINS = [remarkGfm]
const REHYPE_PLUGINS = [rehypeHighlightSubset]
const COMPONENTS: Components = { a: MarkdownLink, pre: CodeBlock }

export type MarkdownTextProps = {
  text: string
  /**
   * A turn still streaming renders as plain text. A half-written fence parses as
   * an unterminated code block, so markdown mid-stream flickers between layouts,
   * and re-parsing the whole answer on every token is wasted work either way.
   * Switch on when the turn finishes.
   */
  streaming?: boolean
}

/**
 * Renders an assistant answer.
 *
 * Raw HTML is deliberately not enabled — `react-markdown` ignores it unless
 * `rehype-raw` is added, which is what keeps untrusted model output from
 * injecting markup. Do not add `rehype-raw` here.
 *
 * Memoized: a live turn re-renders the transcript, and reparsing every settled
 * answer for each token of the current one is the panel's most expensive
 * avoidable work.
 */
const MarkdownTextView = ({ text, streaming = false }: MarkdownTextProps): JSX.Element => {
  if (streaming) {
    return <div className="mdk-agent-markdown mdk-agent-markdown--streaming">{text}</div>
  }

  return (
    <div className="mdk-agent-markdown">
      <Markdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={COMPONENTS}
      >
        {unwrapWholeAnswerFence(text)}
      </Markdown>
    </div>
  )
}

export const MarkdownText = memo(MarkdownTextView)
