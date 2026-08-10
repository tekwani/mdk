'use strict'

// Per-process entrypoint: boots the MCP server, connecting to kernel by its
// .kernel-key public key via HRPC. Exposes MCP tools over Streamable HTTP so
// AI agents can query and control the mining site.
//   node mcp-server.js [--root <dir>] [--port <n>]
const path = require('path')
const fs = require('fs')
const http = require('http')
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js')
const { z } = require('zod')
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js')
const { createMdkClient } = require('../../../../backend/core/client')
const { ROOT, MCP_PORT } = require('../site')
const { arg } = require('../argv')

// Classify a device into a coarse type. PREFER the family the platform reports — the
// worker's mdk-contract.json `metadata.deviceFamily`, which the Kernel already retains —
// so this is robust for real sites whose ids do not follow the demo naming. The id-shape
// heuristic below is only a fallback for the demo, whose status projection does not
// surface the family yet. Deterministic and in code, so counts are computed here, not
// derived by the model from a raw dump.
const FAMILY_TO_TYPE = {
  miner: 'miner',
  container: 'container',
  sensor: 'sensor',
  powermeter: 'powermeter',
  'power-meter': 'powermeter',
  minerpool: 'pool',
  pool: 'pool'
}
function classifyDevice (id, family) {
  const byFamily = FAMILY_TO_TYPE[String(family ?? '').toLowerCase()]
  if (byFamily) return byFamily
  if (/^(antminer|avalon|whatsminer|whtsminer)-\d+$/i.test(id)) return 'miner'
  if (id.startsWith('container-')) return 'container'
  if (id.startsWith('site-sensor-')) return 'sensor'
  if (/powermeter/i.test(id)) return 'powermeter'
  if (/pool/i.test(id)) return 'pool'
  return 'other'
}

const POWER_MODES_BY_PREFIX = [
  { prefix: 'whatsminer-', modes: ['low', 'normal', 'high', 'sleep'] },
  { prefix: 'antminer-', modes: ['sleep', 'normal'] },
  { prefix: 'avalon-', modes: ['normal', 'high', 'sleep'] }
]
function powerModesFor (deviceId) {
  const match = POWER_MODES_BY_PREFIX.find((e) => deviceId.startsWith(e.prefix))
  return match
    ? { deviceId, supportedPowerModes: match.modes }
    : { deviceId, supportedPowerModes: null, reason: 'device type not recognised' }
}

// The vocabularies the agent contract defines. Duplicated rather than imported: this example is
// CJS and the contract ships as ESM, and a tool server in another language would restate them too.
const AXIS = {
  family: ['miner', 'container', 'powermeter', 'sensor', 'pool', 'all'],
  state: ['all', 'online', 'offline', 'error'],
  metric: ['hashrate', 'power', 'temperature', 'efficiency', 'uptime'],
  order: ['desc', 'asc']
}
const AGENT_META_KEY = 'x-mdk-agent'
const DEVICE_ATTRS = ['telemetry', 'state', 'capabilities', 'power_modes']
const METRIC_FIELDS = {
  hashrate: ['hashrate_avg', 'hashrate_rt', 'hashrate'],
  power: ['power'],
  temperature: ['temperature'],
  efficiency: ['efficiency'],
  uptime: ['uptime']
}

const json = (payload) => ({ content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] })

// One row per device, with readiness expressed in the contract's state vocabulary.
function collectDevices (status) {
  const rows = []
  for (const w of (status?.workers ?? [])) {
    const state = w.state === 'READY' ? 'online' : 'offline'
    for (const id of (w.deviceIds ?? [])) {
      rows.push({ deviceId: id, family: classifyDevice(id, w.deviceFamily), state, worker: w.workerId })
    }
  }
  return rows
}

const matches = (row, family, state) =>
  (family === 'all' || row.family === family) && (state === 'all' || row.state === state)

const plural = (family, n) => `${family === 'all' ? 'device' : family}${n === 1 ? '' : 's'}`

function readMetric (telemetry, metric) {
  const metrics = telemetry?.metrics ?? telemetry ?? {}
  for (const field of METRIC_FIELDS[metric]) {
    if (typeof metrics[field] === 'number') return metrics[field]
  }
  return null
}

// Fan out in bounded batches. A site runs to hundreds of devices, and one Promise.all over the
// whole fleet would open that many HRPC calls at once.
const TELEMETRY_CONCURRENCY = 8
async function mapInBatches (items, fn) {
  const results = []
  for (let i = 0; i < items.length; i += TELEMETRY_CONCURRENCY) {
    results.push(...await Promise.all(items.slice(i, i + TELEMETRY_CONCURRENCY).map(fn)))
  }
  return results
}

// Exported so unit tests can wire a fake client without starting the HTTP layer.
function registerTools (server, client) {
  server.registerTool(
    'get_status',
    {
      description: 'Low-level RAW dump of every worker and its device IDs. Unaggregated payload — use get_status only when you need one specific worker\'s raw fields.',
      inputSchema: {},
      annotations: { readOnlyHint: true }
    },
    async () => {
      const status = await client.getStatus()
      return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] }
    }
  )

  server.registerTool(
    'get_site_overview',
    {
      description: 'Site-wide INVENTORY totals only: number of workers, total number of devices, and how many devices of each type exist.',
      inputSchema: {},
      annotations: { readOnlyHint: true }
    },
    async () => {
      const status = await client.getStatus()
      const workers = status?.workers ?? []
      // Symmetric readiness at every level (workers, devices, each device type), with the
      // not-ready few NAMED. The model reads by lexical match — "how many miners are
      // ready" must find a field literally shaped like byType.miner.ready, and "is
      // anything down" must find the offender's id, or a small model substitutes the
      // nearest number it can see (e.g. workers.ready) and misanswers.
      const byType = {}
      let devTotal = 0
      let devReady = 0
      const notReadyDevices = []
      const notReadyWorkers = []
      for (const w of workers) {
        const isReady = w.state === 'READY'
        if (!isReady) notReadyWorkers.push({ workerId: w.workerId, state: w.state })
        for (const id of (w.deviceIds ?? [])) {
          const t = classifyDevice(id, w.deviceFamily)
          byType[t] ??= { total: 0, ready: 0 }
          byType[t].total++
          devTotal++
          if (isReady) { byType[t].ready++; devReady++ } else notReadyDevices.push(id)
        }
      }
      const overview = {
        workers: {
          total: workers.length,
          ready: workers.length - notReadyWorkers.length,
          notReady: notReadyWorkers.length,
          notReadyWorkers
        },
        devices: {
          total: devTotal,
          ready: devReady,
          notReady: devTotal - devReady,
          notReadyDevices,
          byType
        }
      }
      return { content: [{ type: 'text', text: JSON.stringify(overview, null, 2) }] }
    }
  )

  server.registerTool(
    'get_capabilities',
    {
      description: 'What ONE device CAN do: its supported commands (with parameters) and which telemetry ' +
      'fields it reports. Use for "what can I do to X" / "what commands does X support". ' +
      'NOT for current values or readings — those come from pull_telemetry.',
      inputSchema: { deviceId: z.string().describe('The device ID to query') },
      annotations: { readOnlyHint: true }
    },
    async ({ deviceId }) => {
      const caps = await client.getCapabilities(deviceId)
      return { content: [{ type: 'text', text: JSON.stringify(caps, null, 2) }] }
    }
  )

  server.registerTool(
    'pull_telemetry',
    {
      description: 'Live CURRENT readings for ONE device — the tool for any "what is X\'s … right now" ' +
      'question. Miners report: hashrate, power draw (W), temperature, efficiency, uptime, ' +
      'accepted/rejected shares, and power_mode — the CURRENT power mode. Powermeters report ' +
      'voltage/current/power; sensors report temperature. For the current power mode use THIS ' +
      'tool, not get_supported_power_modes (that lists allowed modes, not the active one).',
      inputSchema: {
        deviceId: z.string().describe('The device ID to query'),
        query: z.string().default('metrics').describe('Telemetry query type — use "metrics"')
      },
      annotations: { readOnlyHint: true }
    },
    async ({ deviceId, query }) => {
      const result = await client.pullTelemetry(deviceId, query)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  server.registerTool(
    'pull_state',
    {
      description: 'Bare online/offline status snapshot for a device — status ONLY, no metrics, no power ' +
      'mode, no readings. For readiness across the fleet use list_devices; for any actual ' +
      'reading (hashrate, temperature, power, power_mode) use pull_telemetry.',
      inputSchema: { deviceId: z.string().describe('The device ID to query') },
      annotations: { readOnlyHint: true }
    },
    async ({ deviceId }) => {
      const result = await client.pullState(deviceId)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  server.registerTool(
    'get_supported_power_modes',
    {
      description: 'Which power modes a device COULD be switched to (the allowed values for a ' +
      'set_power_mode command, e.g. sleep/normal/high). NOT the current power mode — the ' +
      'CURRENT power mode is the power_mode field returned by pull_telemetry.',
      inputSchema: { deviceId: z.string().describe('The device ID to query') },
      annotations: { readOnlyHint: true }
    },
    async ({ deviceId }) => {
      return { content: [{ type: 'text', text: JSON.stringify(powerModesFor(deviceId), null, 2) }] }
    }
  )

  server.registerTool(
    'send_command',
    {
      description: 'Send a command to a device (e.g. reboot, set_power_mode)',
      inputSchema: {
        deviceId: z.string().describe('The device ID to target'),
        command: z.string().describe('The command name'),
        params: z.record(z.unknown()).default({}).describe('Command parameters')
      },
      annotations: { readOnlyHint: false }
    },
    async ({ deviceId, command, params }) => {
      const result = await client.sendCommand(deviceId, command, params)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  registerAgentTools(server, client)
}

// The tools an agent may see: named <verb>_<entity>, parameters restricted to closed enums and
// id references, and every result carrying a summary the model can speak verbatim. The tools
// above stay registered for other MCP consumers but declare no agent metadata, so admission
// withholds them from the model.
function registerAgentTools (server, client) {
  const meta = (block) => ({ [AGENT_META_KEY]: { enabled: true, minCapability: 'small', ...block } })
  const family = z.enum(AXIS.family).default('all').describe('Device family to include.')
  const state = z.enum(AXIS.state).default('all').describe('Readiness to include.')
  const ref = z.string().meta({ 'x-mdk-ref': 'device' }).describe('A device id taken from a previous result.')

  server.registerTool(
    'summarize_site',
    {
      description: 'How the site is doing right now: worker and device totals, how many are online, and which are not.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
      _meta: meta({
        answers: 'How many workers and devices exist and how many are online.',
        useWhen: ['how is the site doing', 'give me a site overview', 'is anything down'],
        notFor: [
          'counting one family (use count_devices)',
          'listing devices (use list_devices)',
          'any reading, metric, power figure, energy use or cost — this tool holds none of them'
        ],
        returns: 'counts of workers and devices by family and state, plus the ids of anything offline. Inventory only: no readings, no power, no energy and no cost figures'
      })
    },
    async () => {
      const status = await client.getStatus()
      const workers = status?.workers ?? []
      const rows = collectDevices(status)
      const offline = rows.filter((r) => r.state === 'offline')
      const readyWorkers = workers.filter((w) => w.state === 'READY').length
      const byFamily = {}
      for (const r of rows) {
        byFamily[r.family] ??= { total: 0, online: 0 }
        byFamily[r.family].total++
        if (r.state === 'online') byFamily[r.family].online++
      }
      return json({
        summary: `${rows.length} devices across ${workers.length} workers — ${rows.length - offline.length} online, ${offline.length} offline` +
          (offline.length ? ` (${offline.map((r) => r.deviceId).join(', ')})` : '') + '.',
        workers: { total: workers.length, online: readyWorkers, offline: workers.length - readyWorkers },
        devices: { total: rows.length, online: rows.length - offline.length, offline: offline.length, byFamily }
      })
    }
  )

  server.registerTool(
    'count_devices',
    {
      description: 'How many devices match a family and a readiness state.',
      inputSchema: { family, state },
      annotations: { readOnlyHint: true },
      _meta: meta({
        answers: 'How many devices there are, by family and state.',
        useWhen: ['how many miners are there', 'number of offline devices', 'how many containers'],
        notFor: ['naming them (use list_devices)'],
        returns: 'a single count with a one-line summary'
      })
    },
    async ({ family, state }) => {
      const rows = collectDevices(await client.getStatus()).filter((r) => matches(r, family, state))
      const qualifier = state === 'all' ? '' : ` ${state}`
      return json({ summary: `${rows.length}${qualifier} ${plural(family, rows.length)}.`, count: rows.length, family, state })
    }
  )

  server.registerTool(
    'list_devices',
    {
      description: 'Which devices match a family and a readiness state, named individually.',
      inputSchema: { family, state },
      annotations: { readOnlyHint: true },
      _meta: meta({
        answers: 'Which devices match a family and state.',
        useWhen: ['list the miners', 'which devices are offline', 'show me the containers'],
        notFor: ['counting only (use count_devices)'],
        returns: 'the matching devices, one per line, with a one-line summary'
      })
    },
    async ({ family, state }) => {
      const rows = collectDevices(await client.getStatus()).filter((r) => matches(r, family, state))
      return json({
        summary: rows.length
          ? `${rows.length} ${plural(family, rows.length)}: ${rows.map((r) => r.deviceId).join(', ')}.`
          : `No ${plural(family, 0)} match.`,
        count: rows.length,
        devices: rows
      })
    }
  )

  server.registerTool(
    'get_device',
    {
      description: 'What one named device reports or supports: its live readings, its state, the commands it accepts, or the power modes it allows.',
      inputSchema: {
        ref,
        attr: z.enum(DEVICE_ATTRS).default('telemetry')
          .describe('Which aspect of the device to read.')
      },
      annotations: { readOnlyHint: true },
      _meta: meta({
        answers: 'One attribute of one named device.',
        useWhen: ['what is antminer-3 temperature', 'what can I do to avalon-1', 'is container-1 online'],
        notFor: ['anything across several devices (use list_devices or rank_devices)'],
        returns: 'the requested attribute with a one-line summary'
      })
    },
    async ({ ref, attr }) => {
      if (attr === 'capabilities') {
        return json({ summary: `Capabilities of ${ref}.`, deviceId: ref, capabilities: await client.getCapabilities(ref) })
      }
      if (attr === 'state') {
        return json({ summary: `State of ${ref}.`, deviceId: ref, state: await client.pullState(ref) })
      }
      if (attr === 'power_modes') {
        const modes = powerModesFor(ref)
        return json({
          summary: modes.supportedPowerModes
            ? `${ref} supports ${modes.supportedPowerModes.join(', ')}.`
            : `${ref} does not report power modes.`,
          ...modes
        })
      }
      const telemetry = await client.pullTelemetry(ref, 'metrics')
      return json({ summary: `Live readings for ${ref}.`, deviceId: ref, telemetry })
    }
  )

  server.registerTool(
    'rank_devices',
    {
      description: 'Devices of a family ordered by a metric, highest or lowest first.',
      inputSchema: {
        family,
        metric: z.enum(AXIS.metric).default('power').describe('The metric to order by.'),
        order: z.enum(AXIS.order).default('desc').describe('desc for the highest first, asc for the lowest.'),
        limit: z.number().int().min(1).max(50).default(5).describe('How many to return.')
      },
      annotations: { readOnlyHint: true },
      _meta: meta({
        answers: 'Which devices lead or trail on a metric.',
        useWhen: ['which miner has the lowest power', 'hottest miners', 'top 3 by hashrate'],
        notFor: ['one named device (use get_device)'],
        returns: 'an ordered list with the metric value, and a one-line summary'
      })
    },
    async ({ family, metric, order, limit }) => {
      const rows = collectDevices(await client.getStatus()).filter((r) => matches(r, family, 'all'))
      const readings = await mapInBatches(rows, async (row) => {
        try {
          return { row, value: readMetric(await client.pullTelemetry(row.deviceId, 'metrics'), metric) }
        } catch {
          return { row, value: null }
        }
      })
      const scored = readings.filter((r) => r.value !== null)
      scored.sort((a, b) => (order === 'asc' ? a.value - b.value : b.value - a.value))
      const top = scored.slice(0, limit).map(({ row, value }) => ({ deviceId: row.deviceId, family: row.family, [metric]: value }))
      const unavailable = readings.length - scored.length
      return json({
        summary: top.length
          ? `${order === 'asc' ? 'Lowest' : 'Highest'} ${metric}: ${top.map((d) => `${d.deviceId} (${d[metric]})`).join(', ')}.` +
            (unavailable ? ` ${unavailable} of ${readings.length} did not report.` : '')
          : `No ${plural(family, 0)} reported ${metric}${unavailable ? ` (${unavailable} did not report)` : ''}.`,
        metric,
        order,
        devices: top,
        unavailable
      })
    }
  )

  server.registerTool(
    'act_device',
    {
      description: 'Perform an action on one named device. Requires operator approval before it runs.',
      inputSchema: {
        ref,
        action: z.enum(['reboot', 'set_power_mode']).describe('The action to perform.'),
        mode: z.enum(['low', 'normal', 'high', 'sleep']).default('normal')
          .describe('The power mode to set. Ignored unless action is set_power_mode.')
      },
      annotations: { readOnlyHint: false },
      _meta: meta({
        answers: 'A state-changing action on one device.',
        useWhen: ['restart antminer-3', 'reboot that miner', 'set avalon-1 to sleep'],
        notFor: ['reading anything (use get_device)'],
        returns: 'the outcome of the action with a one-line summary'
      })
    },
    async ({ ref, action, mode }) => {
      // The enum is the union across families, so a mode valid for one device is offered for
      // all. Check it against this device before dispatching, or the operator approves a write
      // that fails at the hardware.
      if (action === 'set_power_mode') {
        const supported = powerModesFor(ref).supportedPowerModes
        if (!supported) return json({ summary: `${ref} does not report power modes, so it cannot be set.`, deviceId: ref, action })
        if (!supported.includes(mode)) {
          return json({
            summary: `${ref} does not support "${mode}" — it accepts ${supported.join(', ')}.`,
            deviceId: ref,
            action,
            supportedPowerModes: supported
          })
        }
      }
      const params = action === 'set_power_mode' ? { mode } : {}
      const result = await client.sendCommand(ref, action, params)
      return json({
        summary: `${action === 'reboot' ? 'Reboot' : `Set power mode to ${mode}`} on ${ref}: ${result?.status ?? 'sent'}.`,
        deviceId: ref,
        action,
        result
      })
    }
  )
}

// Try `port`, then walk upward on EADDRINUSE — a demo box often already has a prior
// run (or something else) bound to the default port. Any other listen error is real
// and should surface. Resolves with the port that actually got bound.
const PORT_SCAN_ATTEMPTS = 20
function listenOnFirstAvailablePort (server, port) {
  return new Promise((resolve, reject) => {
    let candidate = port
    let attempts = 0
    const tryListen = () => {
      const onError = (err) => {
        server.removeListener('listening', onListening)
        if (err.code === 'EADDRINUSE' && ++attempts < PORT_SCAN_ATTEMPTS) {
          candidate += 1
          tryListen()
          return
        }
        reject(err)
      }
      const onListening = () => {
        server.removeListener('error', onError)
        resolve(candidate)
      }
      server.once('error', onError)
      server.once('listening', onListening)
      server.listen(candidate, '127.0.0.1')
    }
    tryListen()
  })
}

async function main () {
  const root = arg('--root', ROOT)
  const port = Number(arg('--port', MCP_PORT))

  const kernelKeyFile = path.join(root, '.kernel-key')
  if (!fs.existsSync(kernelKeyFile)) throw new Error('ERR_KERNEL_KEY_MISSING: start kernel first')
  const kernelKey = fs.readFileSync(kernelKeyFile, 'utf8').trim()

  const client = createMdkClient({ hrpc: { key: kernelKey } })
  await client.connect({ warmup: true })

  const httpServer = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/mcp') {
      res.writeHead(404).end()
      return
    }
    const server = new McpServer({ name: 'mdk-full-site', version: '1.0.0' })
    registerTools(server, client)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    try {
      await server.connect(transport)
      await transport.handleRequest(req, res)
    } catch (err) {
      console.error(err)
      if (!res.writableEnded) res.writeHead(500).end()
    }
  })

  const boundPort = await listenOnFirstAvailablePort(httpServer, port)

  const shutdown = async () => {
    await client.close()
    httpServer.close(() => process.exit(0))
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)

  console.log('MDK_READY mcp-server port=%d kernel=%s', boundPort, kernelKey.slice(0, 16))
}

module.exports = { registerTools, classifyDevice, AXIS, AGENT_META_KEY, listenOnFirstAvailablePort }

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
