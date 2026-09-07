/**
 * Drift guard against the producer.
 *
 * `backend/core/agent/src/events.js` is the contract of record; this package
 * restates it because that module is Node-only and unpublished. If the two ever
 * disagree, the panel silently ignores an event type it should be rendering —
 * invariant 5 says unknown types are dropped, not thrown on, so nothing else
 * would notice.
 *
 * Skipped when the backend is absent, so a standalone `ui/` checkout still
 * passes.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { AGENT_CONTRACT_VERSION, EVENT, TERMINAL_EVENTS } from './events'

const PRODUCER = resolve(
  dirname(fileURLToPath(import.meta.url)),
  // src/core -> src -> ui-agent -> packages -> ui -> repo root
  '../../../../../backend/core/agent/src/events.js',
)

const source = existsSync(PRODUCER) ? readFileSync(PRODUCER, 'utf8') : null

describe.skipIf(source === null)('agent event contract', () => {
  it('declares the same six event types as the producer', () => {
    const block = /export const EVENT = Object\.freeze\(\{([^}]*)\}\)/.exec(source ?? '')?.[1] ?? ''
    const produced = [...block.matchAll(/:\s*'([^']+)'/g)].map((match) => match[1]).sort()

    expect(produced).toHaveLength(6)
    expect(produced).toEqual([...Object.values(EVENT)].sort())
  })

  it('agrees with the producer on the contract version', () => {
    const version = /export const CONTRACT_VERSION = '([^']+)'/.exec(source ?? '')?.[1]
    expect(version).toBe(AGENT_CONTRACT_VERSION)
  })

  it('agrees that done and error are the only terminal events', () => {
    const block
      = /const terminalTypes = new Set\(\[([^\]]*)\]\)/.exec(source ?? '')?.[1] ?? ''
    const produced = [...block.matchAll(/EVENT\.([A-Z_]+)/g)]
      .map((match) => EVENT[match[1] as keyof typeof EVENT])
      .sort()

    expect(produced).toEqual([...TERMINAL_EVENTS].sort())
  })
})
