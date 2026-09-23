/**
 * The five states of the design, driven through the real components.
 *
 * Collapsed -> Chat -> Working -> Approval -> Conversations.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WireEvent } from '../core/events'
import { controllableStream, FIXTURES, sseResponse } from '../test-utils/fixtures'
import { createConversationStore } from '../core/conversation-store'
import { EVENT } from '../core/events'
import { ChatUIEntry } from './chat-page'
import { CoPilot } from './co-pilot'
import { AGENT_LABELS } from '../branding'

const envelope = { turnId: 'turn-1', seq: 0, ts: 0 } as const

const TOOL_LABELS = { count_devices: 'Site status', act_device: 'Send command' }

/**
 * Generous `findBy*` timeout for assertions that wait on the lazy-loaded
 * panel's code-split chunk, which can take longer than testing-library's 1s
 * default under CI load.
 */
const LAZY_PANEL_TIMEOUT_MS = 5000

let fetchImpl: ReturnType<typeof vi.fn>

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function sseStreamResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

beforeEach(() => {
  fetchImpl = vi.fn()
})

function renderCoPilot(open = true) {
  const store = createConversationStore({ storage: null })
  render(
    <CoPilot
      store={store}
      defaultOpen={open}
      toolLabels={TOOL_LABELS}
      status="Local model · 6 tools"
      fetchImpl={fetchImpl as unknown as typeof fetch}
    />,
  )
  return { store }
}

async function ask(text: string) {
  const input = screen.getByRole('textbox', { name: AGENT_LABELS.composer })
  await userEvent.type(input, `${text}{Enter}`)
}

describe('Collapsed', () => {
  it('is just a launcher until it is opened', async () => {
    renderCoPilot(false)

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: AGENT_LABELS.open }))

    // Awaited, not synchronous: the panel is code-split behind the launcher so
    // the markdown renderer and highlighter stay out of the host's first paint.
    // findByRole's default 1000ms wait is tuned for already-mounted content;
    // this is the one place in the suite that pays for the dynamic import's
    // first resolution (every later test in this file reuses the cached
    // module), so it gets a longer allowance.
    expect(
      await screen.findByRole(
        'textbox',
        { name: AGENT_LABELS.composer },
        { timeout: LAZY_PANEL_TIMEOUT_MS },
      ),
    ).toBeInTheDocument()
  })

  it('collapses again on close', async () => {
    renderCoPilot()

    await userEvent.click(screen.getByRole('button', { name: AGENT_LABELS.close }))
    expect(screen.getByRole('button', { name: AGENT_LABELS.open })).toBeInTheDocument()
  })
})

describe('Chat', () => {
  it('shows the status line the host supplied', () => {
    renderCoPilot()
    expect(screen.getByText('Local model · 6 tools')).toBeInTheDocument()
  })

  it('renders the turn: operator bubble, tool chip, answer', async () => {
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseResponse(FIXTURES.readCount!.events)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )
    renderCoPilot()

    await ask('How many miners are there?')

    expect(await screen.findByText('How many miners are there?')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Site status')).toBeInTheDocument())
    expect(screen.getByText(AGENT_LABELS.operator)).toBeInTheDocument()

    // The answer, not the panel title — both read "Co-pilot".
    const answer = document.querySelector('.mdk-agent-message--assistant')
    expect(answer).not.toBeNull()
    expect(answer?.querySelector('.mdk-agent-markdown')?.textContent?.length).toBeGreaterThan(0)
  })
})

describe('Working', () => {
  it('shows the running chip and locks the composer while the tool is in flight', async () => {
    const live = controllableStream()
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseStreamResponse(live.stream)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )
    renderCoPilot()

    await ask('How many miners are there?')
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: AGENT_LABELS.composer })).toBeDisabled(),
    )

    act(() =>
      live.push({ ...envelope, type: EVENT.TOOL_CALL, name: 'count_devices', args: {} }),
    )

    expect(await screen.findByText('· running…')).toBeInTheDocument()
    expect(screen.getByText('Site status')).toBeInTheDocument()

    act(() => {
      live.push({ ...envelope, seq: 1, ts: 400, type: EVENT.TOOL_RESULT, name: 'count_devices', text: '8 miners.' })
      live.push({ ...envelope, seq: 2, ts: 900, type: EVENT.DONE, text: 'There are 8 miners.' })
      live.close()
    })

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: AGENT_LABELS.composer })).toBeEnabled(),
    )
    expect(screen.getByText('· 0.4s')).toBeInTheDocument()
  })
})

describe('Approval', () => {
  const toolCall: WireEvent = {
    ...envelope,
    type: EVENT.TOOL_CALL,
    name: 'act_device',
    args: { ref: 'demo-miner-a-0', action: 'reboot' },
  }
  const pending: WireEvent = { ...toolCall, seq: 1, type: EVENT.PENDING_APPROVAL, approvalId: 'ap-1' }
  const resumed: WireEvent = {
    ...envelope,
    seq: 2,
    ts: 40,
    type: EVENT.TOOL_RESULT,
    name: 'act_device',
    text: 'queued',
  }

  function setupApproval() {
    const live = controllableStream()
    fetchImpl.mockImplementation((url: string) => {
      const target = String(url)
      if (target === '/agent/sessions') return Promise.resolve(jsonResponse({ sessionId: 'sess-1' }))
      if (target.endsWith('/messages')) return Promise.resolve(sseStreamResponse(live.stream))
      return Promise.resolve(jsonResponse({ approvalId: 'ap-1', approved: true }))
    })
    renderCoPilot()
    return live
  }

  it('renders the inline card with the action and the target device', async () => {
    const live = setupApproval()
    await ask('Reboot demo-miner-a-0')
    await waitFor(() => expect(fetchImpl).toHaveBeenCalled())

    act(() => {
      live.push(toolCall)
      live.push(pending)
    })

    expect(await screen.findByText(AGENT_LABELS.approvalRequired)).toBeInTheDocument()

    // Scoped to the card: "Send command" is also the label on the tool chip above it.
    const card = within(screen.getByRole('region', { name: AGENT_LABELS.approvalRequired }))
    expect(card.getByText('Send command')).toBeInTheDocument()
    expect(card.getByText('demo-miner-a-0')).toBeInTheDocument()
    expect(card.getByText('reboot')).toBeInTheDocument()

    act(() => {
      live.push(resumed)
      live.push({ ...envelope, seq: 3, ts: 60, type: EVENT.DONE, text: 'Rebooting.' })
      live.close()
    })
    await waitFor(() => expect(screen.queryByText(AGENT_LABELS.approvalRequired)).not.toBeInTheDocument())
  })

  it('resumes the turn on approve', async () => {
    const live = setupApproval()
    await ask('Reboot demo-miner-a-0')
    await waitFor(() => expect(fetchImpl).toHaveBeenCalled())
    act(() => {
      live.push(toolCall)
      live.push(pending)
    })
    await screen.findByText(AGENT_LABELS.approvalRequired)

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() =>
      expect(fetchImpl.mock.calls.map((call) => String(call[0]))).toContain(
        '/agent/sessions/sess-1/approvals/ap-1',
      ),
    )

    act(() => {
      live.push(resumed)
      live.push({ ...envelope, seq: 3, ts: 60, type: EVENT.DONE, text: 'Rebooting.' })
      live.close()
    })
    expect(await screen.findByText('Rebooting.')).toBeInTheDocument()
  })

  it('drops the card when the approval times out server-side and the stream resumes', async () => {
    const live = setupApproval()
    await ask('Reboot demo-miner-a-0')
    await waitFor(() => expect(fetchImpl).toHaveBeenCalled())
    act(() => {
      live.push(toolCall)
      live.push(pending)
    })
    await screen.findByText(AGENT_LABELS.approvalRequired)

    // No click: the gateway auto-rejects after `agent.approvalTimeoutMs` and
    // resumes on its own.
    act(() => live.push(resumed))
    await waitFor(() => expect(screen.queryByText(AGENT_LABELS.approvalRequired)).not.toBeInTheDocument())

    act(() => {
      live.push({ ...envelope, seq: 3, ts: 60, type: EVENT.DONE, text: 'Not rebooted.' })
      live.close()
    })
    await waitFor(() => expect(screen.getByText('Not rebooted.')).toBeInTheDocument())
  })
})

describe('Conversations', () => {
  it('lists past conversations and switches back to the chat on select', async () => {
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseResponse(FIXTURES.readCount!.events)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )
    const { store } = renderCoPilot()

    await ask('How many miners are there?')
    await waitFor(() => expect(store.getState().conversations).toHaveLength(1))

    await userEvent.click(screen.getByRole('button', { name: AGENT_LABELS.conversations }))
    expect(screen.getByText('Conversations')).toBeInTheDocument()
    expect(screen.getByText('How many miners are there?')).toBeInTheDocument()

    await userEvent.click(screen.getByText('How many miners are there?'))
    expect(screen.getByRole('textbox', { name: AGENT_LABELS.composer })).toBeInTheDocument()
  })

  it('starts a new conversation from the header', async () => {
    fetchImpl.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/messages')
          ? sseResponse(FIXTURES.readCount!.events)
          : jsonResponse({ sessionId: 'sess-1' }),
      ),
    )
    const { store } = renderCoPilot()

    await ask('How many miners are there?')
    await waitFor(() => expect(store.getState().conversations).toHaveLength(1))

    await userEvent.click(screen.getByRole('button', { name: AGENT_LABELS.newConversation }))
    expect(store.getState().conversations).toHaveLength(2)
    expect(screen.queryByText('How many miners are there?')).not.toBeInTheDocument()
  })

  it('goes back to the chat from the conversations header', async () => {
    renderCoPilot()

    await userEvent.click(screen.getByRole('button', { name: AGENT_LABELS.conversations }))
    await userEvent.click(screen.getByRole('button', { name: AGENT_LABELS.backToConversation }))

    expect(screen.getByRole('textbox', { name: AGENT_LABELS.composer })).toBeInTheDocument()
  })
})

describe('ChatUIEntry', () => {
  it('renders the same conversation as a page, with nothing to collapse into', () => {
    const store = createConversationStore({ storage: null })
    render(<ChatUIEntry store={store} fetchImpl={fetchImpl as unknown as typeof fetch} />)

    expect(screen.getByRole('textbox', { name: AGENT_LABELS.composer })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: AGENT_LABELS.close })).not.toBeInTheDocument()
  })

  it('greets an empty conversation with a prompt rather than a blank panel', () => {
    const store = createConversationStore({ storage: null })
    render(<ChatUIEntry store={store} fetchImpl={fetchImpl as unknown as typeof fetch} />)

    expect(screen.getByText(/Ask about your fleet/)).toBeInTheDocument()
  })
})
