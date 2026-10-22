'use strict'

const test = require('brittle')
const path = require('path')
const os = require('os')
const fs = require('fs')
const { loadAppTools } = require('../../lib/from-gateway-plugin')

const FIXTURES_DIR = path.join(os.tmpdir(), 'mdk-mcp-from-gateway-plugin-test-' + Date.now())
const RUNTIME_KEY = 'c'.repeat(64)

function writeFixture (dir, files) {
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(dir, name)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2))
  }
}

// An app whose controllers throw if anything loads them: the tools must only
// read the route table.
function writeApp (name, { key = RUNTIME_KEY } = {}) {
  const appDir = path.join(FIXTURES_DIR, name)
  writeFixture(appDir, {
    'mdk-plugin.json': {
      name: '@example/mdk-app-devices',
      version: '1.0.0',
      description: 'device fleet routes',
      routes: [
        {
          id: 'devices.get',
          description: 'gets a device by id',
          http: {
            method: 'GET',
            path: '/devices/{id}',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'verbose', in: 'query', schema: { type: 'boolean' } }
            ]
          },
          safety: 'read-only',
          handler: './controllers/get-device.js'
        },
        {
          id: 'devices.reboot',
          description: 'reboots a device',
          http: { method: 'POST', path: '/devices/{id}/reboot' },
          safety: 'write',
          handler: './controllers/reboot-device.js'
        }
      ]
    },
    'controllers/get-device.js': 'throw new Error(\'loaded get-device\')',
    'controllers/reboot-device.js': 'throw new Error(\'loaded reboot-device\')'
  })
  const keyFile = path.join(appDir, 'runtime.key')
  if (key) fs.writeFileSync(keyFile, key)
  return { name, appDir, keyFile }
}

function fakeClient (result = { ok: true }) {
  const calls = []
  return { calls, invoke: async (...args) => { calls.push(args); return result } }
}

test('loadAppTools - converts an app\'s routes into MCP tools without loading a controller', (t) => {
  const tools = loadAppTools(writeApp('devices'), fakeClient())

  t.alike(tools.map((tool) => tool.id).sort(), ['devices_get', 'devices_reboot'], 'tool ids should match the sanitized route ids')
})

test('loadAppTools - tool.schema reflects the route\'s parameters', (t) => {
  const getDevice = loadAppTools(writeApp('schema'), fakeClient()).find((tool) => tool.id === 'devices_get')

  t.ok(getDevice.schema.id, 'required path param should be present in the schema')
  t.ok(getDevice.schema.verbose, 'optional query param should be present in the schema')
})

test('loadAppTools - tool.annotations.readOnlyHint reflects route safety', (t) => {
  const tools = loadAppTools(writeApp('annotations'), fakeClient())
  const getDevice = tools.find((tool) => tool.id === 'devices_get')
  const reboot = tools.find((tool) => tool.id === 'devices_reboot')

  t.is(getDevice.annotations.readOnlyHint, true, 'read-only route should map to readOnlyHint: true')
  t.is(reboot.annotations.readOnlyHint, false, 'write route should map to readOnlyHint: false')
  t.is(reboot.annotations.destructiveHint, true, 'write route should also set destructiveHint')
})

test('loadAppTools - a call is forwarded to the runtime named by the app\'s key file', async (t) => {
  const client = fakeClient({ id: 'dev-1', temp: 61 })
  const identity = { user: { userId: 'mcp-agent' } }
  const getDevice = loadAppTools(writeApp('forward'), client, { identity, timeoutMs: 1234 }).find((tool) => tool.id === 'devices_get')

  const result = await getDevice._handler({ id: 'dev-1', verbose: true })

  t.is(client.calls.length, 1, 'one call should reach the runtime client')
  const [key, routeId, req, opts] = client.calls[0]
  t.is(key, RUNTIME_KEY, 'to the key the runtime published')
  t.is(routeId, 'devices.get', 'by route id')
  t.alike([req.params, req.query], [{ id: 'dev-1' }, { verbose: true }], 'with the args reassembled into the request')
  t.alike(opts, { identity, timeoutMs: 1234 }, 'with the identity and the timeout')
  t.alike(JSON.parse(result.content[0].text), { id: 'dev-1', temp: 61 }, 'and the runtime\'s result becomes the tool output')
})

test('loadAppTools - without a published runtime key a call fails ERR_APP_RUNTIME_UNAVAILABLE', async (t) => {
  const client = fakeClient()
  const getDevice = loadAppTools(writeApp('down', { key: null }), client).find((tool) => tool.id === 'devices_get')

  await t.exception(() => getDevice._handler({ id: 'dev-1' }), /ERR_APP_RUNTIME_UNAVAILABLE: down$/)
  t.is(client.calls.length, 0, 'nothing should be sent')
})

test('loadAppTools - rejects an entry without appDir/keyFile', (t) => {
  t.exception(() => loadAppTools('/some/plugin/dir', fakeClient()), /ERR_INVALID_MCP_APP/)
})

test('loadAppTools - propagates loader errors (e.g. missing manifest)', (t) => {
  const appDir = path.join(FIXTURES_DIR, 'missing-manifest')
  fs.mkdirSync(appDir, { recursive: true })

  t.exception(() => loadAppTools({ name: 'missing', appDir, keyFile: path.join(appDir, 'runtime.key') }, fakeClient()), /ERR_PLUGIN_MANIFEST_MISSING/)
})
