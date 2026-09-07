import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MarkdownText } from './markdown-text'

describe('MarkdownText', () => {
  it('renders GFM tables, which is how the agent answers "list the miners"', () => {
    const table = ['| id | state |', '| --- | --- |', '| demo-miner-a-0 | online |'].join('\n')
    render(<MarkdownText text={table} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'demo-miner-a-0' })).toBeInTheDocument()
  })

  it('highlights a fenced block in a registered language', () => {
    const { container } = render(<MarkdownText text={'```json\n{"count": 8}\n```'} />)

    expect(container.querySelector('code.hljs')).toBeInTheDocument()
    expect(container.querySelector('.hljs-attr')).toBeInTheDocument()
  })

  it('renders an unregistered language as plain code rather than failing', () => {
    const { container } = render(<MarkdownText text={'```brainfuck\n+[-]\n```'} />)

    expect(container.querySelector('pre code')).toBeInTheDocument()
    expect(container.querySelector('code.hljs')).not.toBeInTheDocument()
  })

  it('leaves an inline code span alone', () => {
    const { container } = render(<MarkdownText text="Use the `summarize_site` tool." />)

    expect(container.querySelector('code')).toBeInTheDocument()
    expect(container.querySelector('code.hljs')).not.toBeInTheDocument()
  })

  it('ignores raw HTML, so untrusted model output cannot inject markup', () => {
    const { container } = render(
      <MarkdownText text={'<img src=x onerror="alert(1)"> and <b>bold</b>'} />,
    )

    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(container.querySelector('b')).not.toBeInTheDocument()
  })

  it('renders raw text while streaming, so a half-written fence cannot break it', () => {
    const { container } = render(<MarkdownText text={'```json\n{"cou'} streaming />)

    expect(container.querySelector('pre')).not.toBeInTheDocument()
    expect(container.textContent).toContain('{"cou')
  })

  it('unwraps an answer the model wrapped in a markdown fence', () => {
    render(<MarkdownText text={'```markdown\n## Site status\n\n- 8 miners\n```'} />)

    expect(screen.getByRole('heading', { name: 'Site status' })).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()
  })

  it('opens an external link in a new tab rather than navigating the app away', () => {
    render(<MarkdownText text="See [the runbook](https://example.test/runbook)." />)
    const link = screen.getByRole('link', { name: 'the runbook' })

    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('keeps an in-document link in the panel, which is where a footnote lives', () => {
    render(<MarkdownText text={'A claim[^1]\n\n[^1]: the source'} />)

    // The reference and its back-reference: both point at fragments in this document.
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    for (const link of links) expect(link).not.toHaveAttribute('target')
  })

  it('renders the token spans the stylesheet colours', () => {
    // The plugin and its two dependencies are dead weight unless `.hljs-*` rules
    // exist for what it emits.
    const { container } = render(<MarkdownText text={'```json\n{"count": 8}\n```'} />)

    expect(container.querySelector('.hljs-attr')).toBeInTheDocument()
    expect(container.querySelector('.hljs-number')).toBeInTheDocument()
  })
})

describe('MarkdownText — copying code', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('copies the block, highlighting included, as its original source', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

    render(<MarkdownText text={'```bash\nmdk onboard\n```'} />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy code' }))

    expect(writeText).toHaveBeenCalledWith('mdk onboard\n')
  })

  it('offers no button where the Clipboard API does not exist', () => {
    // Secure-context only, and a gateway on a site LAN is served over plain http.
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })

    render(<MarkdownText text={'```bash\nmdk onboard\n```'} />)

    expect(screen.queryByRole('button', { name: 'Copy code' })).not.toBeInTheDocument()
  })
})
