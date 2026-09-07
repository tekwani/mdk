import type { JSX } from 'react'
import { useMemo } from 'react'

import { Typography } from '@tetherto/mdk-react-devkit/primitives'
import { ChatUIEntry, CoPilot, createConversationStore } from '@tetherto/mdk-ui-agent'

import { DemoBlock } from '../../components/demo-block'
import { DemoPageHeader } from '../../components/demo-page-header'
import { PROMPTS, TOOL_LABELS } from './demo-content'
import { createDemoGateway } from './demo-gateway'

import './agent-co-pilot-page.scss'

export const AgentCoPilotPage = (): JSX.Element => {
  // One gateway, two stores: the docked panel and the page variant hold separate
  // conversations so they do not overwrite each other's transcript.
  const gateway = useMemo(() => createDemoGateway(), [])
  const dockedStore = useMemo(() => createConversationStore({ storage: null }), [])
  const pageStore = useMemo(() => createConversationStore({ storage: null }), [])

  return (
    <div className="agent-co-pilot-page">
      <DemoPageHeader
        title="Agent Co-pilot"
        description={
          <>
            The operator co-pilot from
            {' '}
            <code>@tetherto/mdk-ui-agent</code>
            , driven here by a stand-in gateway so it works with no backend running. Against a real
            stack it streams the agent plugin&apos;s six-event contract over SSE.
          </>
        }
      />

      <DemoBlock
        title="Try it"
        description="The stand-in routes on keywords rather than a model, but the transport, the streaming and the approval round-trip are the real ones."
      >
        <ul className="agent-co-pilot-page__prompts">
          {PROMPTS.map(({ prompt, shows }) => (
            <li key={prompt}>
              <code>{prompt}</code>
              <Typography variant="secondary" size="sm">
                {' — '}
                {shows}
              </Typography>
            </li>
          ))}
        </ul>
      </DemoBlock>

      <DemoBlock
        title="Docked overlay"
        description="How it ships by default: one line in the app root, collapsed to a launcher in the corner until it is opened. Look bottom-right."
      >
        <CoPilot
          store={dockedStore}
          fetchImpl={gateway.fetchImpl}
          toolLabels={TOOL_LABELS}
          status="Demo gateway · 4 tools"
        />
        <Typography variant="secondary">
          The panel is fixed to the viewport corner, so it stays put as this page scrolls.
        </Typography>
      </DemoBlock>

      <DemoBlock
        title="As a page"
        description="The same conversation rendered full-height, for mounting on a route instead of over one."
      >
        <div className="agent-co-pilot-page__frame">
          <ChatUIEntry
            store={pageStore}
            fetchImpl={gateway.fetchImpl}
            toolLabels={TOOL_LABELS}
            status="Demo gateway · 4 tools"
          />
        </div>
      </DemoBlock>
    </div>
  )
}
