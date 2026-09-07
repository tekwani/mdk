'use strict'

const test = require('brittle')

const manifest = require('../../backend/mcp-plugins/site/mcp-plugin.json')

const AGENT_META_KEY = 'x-mdk-agent'
const CONTRACT = '../../../../backend/core/agent/src/tools.js'

const EXPECTED = ['act_device', 'count_devices', 'get_device', 'list_devices', 'rank_devices', 'summarize_site']

function descriptors () {
  return manifest.tools.map((tool) => ({
    name: tool.id,
    description: tool.description,
    ...(tool.annotations ? { annotations: tool.annotations } : {}),
    ...(tool.agent ? { _meta: { [AGENT_META_KEY]: tool.agent } } : {})
  }))
}

test('every agent-facing tool declares metadata the contract accepts', async (t) => {
  const { validateTool } = await import(CONTRACT)

  for (const descriptor of descriptors()) {
    const { ok, errors } = validateTool(descriptor)
    t.ok(ok, `${descriptor.name}: ${errors.join(' | ')}`)
  }
})

test('all six tools are admitted, so a silent skip cannot go unnoticed again', async (t) => {
  const { admitTools } = await import(CONTRACT)

  const { admitted, skipped } = admitTools(descriptors())

  t.alike(admitted.map((tool) => tool.name).sort(), EXPECTED, 'every tool reaches the agent')
  t.alike(skipped, [], 'and none is withheld')
})

test('the contract these tools declare is the one the agent speaks', async (t) => {
  const { TOOL_CONTRACT_VERSION } = await import(CONTRACT)

  for (const tool of manifest.tools) {
    t.is(tool.agent?.contract, TOOL_CONTRACT_VERSION, `${tool.id} tracks the agent's version`)
  }
})
