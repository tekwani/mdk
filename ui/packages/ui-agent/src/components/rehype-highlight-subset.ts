/**
 * Syntax highlighting for fenced code, restricted to the grammars this panel
 * actually sees.
 *
 * `rehype-highlight` would do the same job, but it statically imports lowlight's
 * `common` set — 37 grammars and most of highlight.js's bulk — so its
 * `languages` option changes what gets *registered*, never what gets *bundled*.
 * Measured against the generated shell, that was 179 kB raw / 55 kB gzip, more
 * than doubling the panel's chunk to highlight languages a fleet co-pilot never
 * emits. Registering three grammars directly costs a fraction of that.
 *
 * Anything outside the set still renders — unhighlighted, in the mono face the
 * panel already uses.
 */

import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import type { Element, ElementContent, Node, Parent, Root, Text } from 'hast'
import { createLowlight } from 'lowlight'

const lowlight = createLowlight({ bash, json, yaml })

const LANGUAGE_PREFIX = 'language-'

function isElement(node: Node): node is Element {
  return node.type === 'element'
}

function isParent(node: Node): node is Parent {
  return Array.isArray((node as Parent).children)
}

/** Concatenates the text under a node, which for a code block is its source. */
function textOf(node: Node): string {
  if (node.type === 'text') return (node as Text).value
  if (!isParent(node)) return ''
  return node.children.map((child) => textOf(child)).join('')
}

function languageOf(node: Element): string | null {
  const className = node.properties?.className
  const classes = Array.isArray(className) ? className.map(String) : []
  const match = classes.find((name) => name.startsWith(LANGUAGE_PREFIX))
  return match ? match.slice(LANGUAGE_PREFIX.length) : null
}

function highlightCodeBlock(node: Element): void {
  const language = languageOf(node)
  if (!language || !lowlight.registered(language)) return

  try {
    const result = lowlight.highlight(language, textOf(node))
    // lowlight returns a Root, whose children are typed wider than a code
    // element's. In practice it only ever emits elements and text.
    node.children = result.children as ElementContent[]
    node.properties = {
      ...node.properties,
      className: [...(Array.isArray(node.properties?.className) ? node.properties.className : []), 'hljs'],
    }
  } catch {
    // A grammar that throws on odd input must not take the whole answer with it;
    // the block simply stays unhighlighted.
  }
}

function walk(node: Node): void {
  if (!isParent(node)) return

  for (const child of node.children) {
    // Only `<pre><code>` — an inline `code` span is not a code block.
    if (isElement(node) && node.tagName === 'pre' && isElement(child) && child.tagName === 'code') {
      highlightCodeBlock(child)
      continue
    }
    walk(child)
  }
}

export function rehypeHighlightSubset() {
  return (tree: Root): void => {
    walk(tree)
  }
}
