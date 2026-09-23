/**
 * The transcript's scroll contract.
 *
 * Written after a turn opening failed to scroll: the operator was left looking at their own
 * question, the reply below the fold, and the panel apparently ignoring them. It self-corrected
 * on the first token, so the dead window was however long the model took to say anything.
 *
 * jsdom does no layout, so `scrollHeight` and `clientHeight` are 0 and the component's
 * `scrollTop = scrollHeight` is unobservable. `overflowing()` stubs a taller-than-viewport
 * element and records what the component assigns.
 */
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { ChatMessage } from '../core/conversation-store'
import type { AgentTurnState } from '../core/turn'
import { MESSAGE_ROLE } from '../core/conversation-store'
import { createTurnState, TURN_STATUS } from '../core/turn'
import { MessageList } from './message-list'

const SCROLL_HEIGHT = 1000
const CLIENT_HEIGHT = 300

/** Make every element report a scrollable box, and let `scrollTop` be read back. */
function overflowing(): () => void {
  const proto = HTMLElement.prototype
  const original = {
    scrollHeight: Object.getOwnPropertyDescriptor(proto, 'scrollHeight'),
    clientHeight: Object.getOwnPropertyDescriptor(proto, 'clientHeight'),
  }
  Object.defineProperty(proto, 'scrollHeight', { configurable: true, get: () => SCROLL_HEIGHT })
  Object.defineProperty(proto, 'clientHeight', { configurable: true, get: () => CLIENT_HEIGHT })
  return () => {
    if (original.scrollHeight) Object.defineProperty(proto, 'scrollHeight', original.scrollHeight)
    else Reflect.deleteProperty(proto, 'scrollHeight')
    if (original.clientHeight) Object.defineProperty(proto, 'clientHeight', original.clientHeight)
    else Reflect.deleteProperty(proto, 'clientHeight')
  }
}

let restore: (() => void) | null = null
afterEach(() => { restore?.(); restore = null })

function ask(text: string): ChatMessage {
  return { id: `u:${text}`, role: MESSAGE_ROLE.USER, text, tools: [] } as ChatMessage
}

/** A turn that has opened but produced nothing yet — the state the bug lived in. */
function openTurn(): AgentTurnState {
  return { ...createTurnState(), turnId: 'turn-1', status: TURN_STATUS.STREAMING }
}

const base = {
  toolLabels: undefined,
  pendingApproval: null,
  isDecisionPending: false,
  onDecide: () => {},
}

function transcript(container: HTMLElement): HTMLElement {
  const node = container.querySelector('.mdk-agent-messages')
  if (!node) throw new Error('transcript not found')
  return node as HTMLElement
}

describe('MessageList scrolling', () => {
  it('scrolls to the bottom when a turn opens, before any token has arrived', () => {
    restore = overflowing()
    const messages = [ask('how is the site doing?')]

    const { container, rerender } = render(
      <MessageList {...base} messages={messages} live={null} />,
    )
    const node = transcript(container)
    node.scrollTop = 0

    // The turn opens: text and tools are both still empty, so only its existence changed.
    rerender(<MessageList {...base} messages={messages} live={openTurn()} />)

    expect(node.scrollTop).toBe(SCROLL_HEIGHT)
  })

  it('re-pins on a new turn even if the operator had scrolled away to re-read', () => {
    restore = overflowing()
    const messages = [ask('list the devices')]

    const { container, rerender } = render(
      <MessageList {...base} messages={messages} live={null} />,
    )
    const node = transcript(container)

    // Scrolled well clear of the bottom, which unpins the view.
    node.scrollTop = 10
    node.dispatchEvent(new Event('scroll'))

    rerender(<MessageList {...base} messages={messages} live={openTurn()} />)

    // Sending is an explicit request to see the answer, so it wins over the scroll position.
    expect(node.scrollTop).toBe(SCROLL_HEIGHT)
  })

  it('does not yank the view back down while the operator reads mid-turn', () => {
    restore = overflowing()
    const messages = [ask('rank the miners')]
    const live = openTurn()

    const { container, rerender } = render(
      <MessageList {...base} messages={messages} live={live} />,
    )
    const node = transcript(container)

    // Scroll up during the turn — this is the case the pinning rule exists to protect.
    node.scrollTop = 10
    node.dispatchEvent(new Event('scroll'))

    // More of the same turn arrives.
    rerender(
      <MessageList {...base} messages={messages} live={{ ...live, text: 'Two miners' }} />,
    )

    expect(node.scrollTop).toBe(10)
  })

  it('follows tokens while the operator is still at the bottom', () => {
    restore = overflowing()
    const messages = [ask('count the miners')]
    const live = openTurn()

    const { container, rerender } = render(
      <MessageList {...base} messages={messages} live={live} />,
    )
    const node = transcript(container)

    // Actually at the bottom: inside the pin threshold, and recorded there by the scroll handler.
    node.scrollTop = SCROLL_HEIGHT - CLIENT_HEIGHT
    node.dispatchEvent(new Event('scroll'))

    rerender(<MessageList {...base} messages={messages} live={{ ...live, text: '2 miners.' }} />)

    expect(node.scrollTop).toBe(SCROLL_HEIGHT)
  })
})
