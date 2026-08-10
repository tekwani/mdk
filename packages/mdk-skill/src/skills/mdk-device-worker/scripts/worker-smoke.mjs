#!/usr/bin/env node
// In-process smoke harness for a Worker Plugin — no Kernel, no DHT.
//
//   node worker-smoke.mjs <worker-dir> [--config <json | path>]
//
// Device config comes from --config (inline JSON or a .json file) or from
// <worker-dir>/smoke.config.js exporting { setup } -> { config, commands?,
// teardown? }. Asserts: the plugin loads, every declared telemetry handler
// returns the contract-declared type, bounded number params reject
// out-of-range values, and each smoke.config command executes.

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))

const TYPE_OK = {
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  string: (v) => typeof v === 'string',
  boolean: (v) => typeof v === 'boolean',
  array: (v) => Array.isArray(v),
  object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v)
}

// Replica of the Kernel dispatcher's pre-dispatch validation
// (CommandDispatcher._validateCommand) — bounds are enforced Kernel-side,
// so an in-process harness must check them itself. Kept in sync manually.
function validateCommand (capabilities, command, params) {
  if (!capabilities.commands) return { valid: true }
  const commands = capabilities.commands
  const cmdDef = Array.isArray(commands)
    ? commands.find((c) => c.name === command)
    : commands[command]

  if (!cmdDef) return { valid: false, error: `ERR_COMMAND_NOT_IN_CAPABILITIES: ${command}` }

  if (cmdDef.params && Array.isArray(cmdDef.params) && params) {
    for (const paramDef of cmdDef.params) {
      const value = params[paramDef.name]
      if (value === undefined) continue
      if (paramDef.type === 'number' && typeof value !== 'number') {
        return { valid: false, error: `ERR_PARAM_TYPE: ${paramDef.name} must be number` }
      }
      if (paramDef.type === 'string' && typeof value !== 'string') {
        return { valid: false, error: `ERR_PARAM_TYPE: ${paramDef.name} must be string` }
      }
      if (paramDef.type === 'number') {
        if (paramDef.min !== undefined && value < paramDef.min) {
          return { valid: false, error: `ERR_PARAM_RANGE: ${paramDef.name} below min ${paramDef.min}` }
        }
        if (paramDef.max !== undefined && value > paramDef.max) {
          return { valid: false, error: `ERR_PARAM_RANGE: ${paramDef.name} above max ${paramDef.max}` }
        }
      }
    }
  }
  return { valid: true }
}

function findWorkerBase (startDirs) {
  if (process.env.MDK_WORKER_BASE) return process.env.MDK_WORKER_BASE
  for (const start of startDirs) {
    let dir = start
    for (;;) {
      const candidate = path.join(dir, 'backend', 'core', 'mdk-worker')
      if (fs.existsSync(path.join(candidate, 'lib', 'plugin-loader.js'))) return candidate
      const parent = path.dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  }
  return null
}

function parseArgs (argv) {
  const args = { workerDir: null, config: null }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--config') args.config = argv[++i]
    else if (!args.workerDir) args.workerDir = argv[i]
  }
  return args
}

const { workerDir: workerDirArg, config: configArg } = parseArgs(process.argv.slice(2))
if (!workerDirArg) {
  console.error('usage: node worker-smoke.mjs <worker-dir> [--config <json | path>]')
  process.exit(1)
}

const workerDir = path.resolve(process.cwd(), workerDirArg)
const pluginDir = fs.existsSync(path.join(workerDir, 'plugin', 'mdk-contract.json'))
  ? path.join(workerDir, 'plugin')
  : workerDir
if (!fs.existsSync(path.join(pluginDir, 'mdk-contract.json'))) {
  console.error(`ERR_SMOKE_NO_PLUGIN: no plugin/mdk-contract.json under ${workerDir}`)
  process.exit(1)
}

const requireFromWorker = createRequire(path.join(workerDir, 'noop.js'))
const requireFromScript = createRequire(path.join(SCRIPT_DIR, 'noop.js'))

let loadPlugin
const base = findWorkerBase([workerDir, SCRIPT_DIR])
if (base) {
  loadPlugin = requireFromScript(path.join(base, 'lib', 'plugin-loader.js')).loadPlugin
} else {
  try {
    loadPlugin = requireFromWorker('@tetherto/mdk-worker').loadPlugin
  } catch {
    console.error('ERR_SMOKE_NO_WORKER_BASE: cannot locate backend/core/mdk-worker (set MDK_WORKER_BASE or install @tetherto/mdk-worker)')
    process.exit(1)
  }
}

const failures = []
let checks = 0
function check (ok, label, detail) {
  checks++
  if (ok) {
    console.log(`  ok    ${label}`)
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`)
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

async function resolveSpec () {
  if (configArg) {
    if (configArg.trim().startsWith('{')) return { config: JSON.parse(configArg) }
    const p = path.resolve(process.cwd(), configArg)
    if (p.endsWith('.json')) return { config: JSON.parse(fs.readFileSync(p, 'utf8')) }
    const mod = requireFromWorker(p)
    return mod.setup ? mod.setup() : { config: mod }
  }
  const smokeConfig = path.join(workerDir, 'smoke.config.js')
  if (!fs.existsSync(smokeConfig)) {
    console.error(`ERR_SMOKE_NO_CONFIG: no --config given and no ${smokeConfig}`)
    process.exit(1)
  }
  return requireFromWorker(smokeConfig).setup()
}

async function main () {
  const plugin = requireFromWorker(pluginDir)
  const loaded = loadPlugin(plugin)
  const contract = loaded.contract
  console.log(`smoke: ${contract.metadata.brand} (${contract.metadata.deviceFamily}) — ${loaded.handlers.telemetry.size} telemetry, ${loaded.handlers.commands.size} commands`)
  check(true, 'plugin loads (loadPlugin: contract + every handler module)')

  const spec = await resolveSpec()
  const deviceId = 'smoke-0'

  let device = null
  try {
    device = await plugin.connect(spec.config, { deviceId })
    check(true, 'connect() probes the device')
  } catch (err) {
    check(false, 'connect() probes the device', err.message)
  }

  if (device) {
    const ctx = Object.freeze({ deviceId, device, config: spec.config, services: null })

    // Telemetry sweep — same shape as WorkerRuntime._collectMetrics.
    for (const entry of contract.capabilities.telemetry || []) {
      const typeOk = TYPE_OK[entry.type] || ((v) => v !== undefined)
      try {
        const value = await loaded.handlers.telemetry.get(entry.name)(ctx, {})
        check(value !== undefined && typeOk(value),
          `telemetry '${entry.name}' returns a ${entry.type}`,
          value === undefined ? 'returned undefined' : `returned ${JSON.stringify(value)}`)
      } catch (err) {
        check(false, `telemetry '${entry.name}' returns a ${entry.type}`, err.message)
      }
    }

    for (const cmd of contract.capabilities.commands || []) {
      for (const p of cmd.params || []) {
        if (p.type !== 'number' || p.min === undefined || p.max === undefined) continue
        const below = validateCommand(contract.capabilities, cmd.name, { [p.name]: p.min - 1 })
        check(!below.valid && /ERR_PARAM_RANGE/.test(below.error || ''),
          `command '${cmd.name}' rejects ${p.name}=${p.min - 1} (below min)`, below.error || 'accepted')
        const above = validateCommand(contract.capabilities, cmd.name, { [p.name]: p.max + 1 })
        check(!above.valid && /ERR_PARAM_RANGE/.test(above.error || ''),
          `command '${cmd.name}' rejects ${p.name}=${p.max + 1} (above max)`, above.error || 'accepted')
        const atBounds = validateCommand(contract.capabilities, cmd.name, { [p.name]: p.min }).valid &&
          validateCommand(contract.capabilities, cmd.name, { [p.name]: p.max }).valid
        check(atBounds, `command '${cmd.name}' accepts ${p.name} at [${p.min}, ${p.max}]`)
      }
    }

    for (const [name, params] of Object.entries(spec.commands || {})) {
      const gate = validateCommand(contract.capabilities, name, params)
      if (!gate.valid) {
        check(false, `command '${name}' executes with sample params`, gate.error)
        continue
      }
      const handler = loaded.handlers.commands.get(name)
      if (!handler) {
        check(false, `command '${name}' executes with sample params`, 'not declared in contract')
        continue
      }
      try {
        await handler(ctx, params)
        check(true, `command '${name}' executes with sample params`)
      } catch (err) {
        check(false, `command '${name}' executes with sample params`, err.message)
      }
    }

    if (loaded.disconnect) {
      try { await loaded.disconnect(device, { deviceId }) } catch {}
    }
  }

  if (spec.teardown) await spec.teardown()

  if (failures.length) {
    console.error(`\nSMOKE FAIL: ${failures.length}/${checks} check(s) failed`)
    process.exit(1)
  }
  console.log(`\nSMOKE PASS: ${checks} check(s)`)
  process.exit(0)
}

main().catch((err) => {
  console.error(`ERR_SMOKE: ${err.message}`)
  process.exit(1)
})
