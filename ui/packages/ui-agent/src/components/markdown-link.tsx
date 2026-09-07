import type { ComponentPropsWithoutRef, JSX } from 'react'
import type { ExtraProps } from 'react-markdown'

export type MarkdownLinkProps = ComponentPropsWithoutRef<'a'> & ExtraProps

/**
 * A link inside an answer.
 *
 * Anything pointing away from the document opens in a new tab: the panel is docked
 * over whatever page the operator is working on, and following a link in place
 * would navigate the app out from under them mid-conversation. An in-document
 * target — a GFM footnote reference, `#...` — has to stay in the panel to work at
 * all, so it is left alone.
 *
 * `react-markdown` blocks `javascript:` hrefs in its default `urlTransform`, so
 * this is about not losing the operator's place rather than about safety.
 */
export const MarkdownLink = ({ href, children, node, ...rest }: MarkdownLinkProps): JSX.Element => {
  const isInDocument = href?.startsWith('#') ?? false

  return (
    <a
      href={href}
      {...(isInDocument ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      {...rest}
    >
      {children}
    </a>
  )
}
