import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);

const TYPE_OK: Record<string, (v: unknown) => boolean> = {
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  string: (v) => typeof v === 'string',
  boolean: (v) => typeof v === 'boolean',
  array: (v) => Array.isArray(v),
  object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
};

interface ContractParam {
  name: string;
  type?: string;
  required?: boolean;
  enum?: unknown[];
  min?: number;
  max?: number;
}

interface ContractEntry {
  name: string;
  type?: string;
  params?: ContractParam[];
}

interface MdkWorkerRuntime {
  loadContract(dir: string): {
    dir: string;
    contract: {
      metadata: { brand?: string; deviceFamily?: string };
      capabilities: { telemetry?: ContractEntry[]; commands?: ContractEntry[] };
    };
    entries: { telemetry: Map<string, string>; commands: Map<string, string> };
  };
  createInstance(opts: {
    dir: string;
    entries: { telemetry: Map<string, string>; commands: Map<string, string> };
    device: Record<string, unknown>;
  }): { telemetry: Map<string, (params: object) => unknown>; commands: Map<string, (params: object) => unknown> };
  validateParams(declared: ContractParam[] | undefined, params: object): string | null;
}

/** What smoke.config.js `setup()` resolves to: the mock device and how to reach it. */
interface SmokeSpec {
  config?: Record<string, unknown>;
  env?: Record<string, unknown>;
  pluginConfig?: Record<string, unknown>;
  /** Sample params per command name, executed against the mock. */
  commands?: Record<string, object>;
  /** Stops the mock device; its presence enables the device-stopped failure pass. */
  teardown?: () => unknown;
  /**
   * Telemetry served from the worker's own store rather than the device (a
   * `history` log, say), which keeps answering once it stops. These must still
   * settle and return their declared type instead of failing with an ERR_*.
   */
  offlineTelemetry?: string[];
}

export interface SmokeOutcome {
  /** Checks that passed. */
  passed: number;
  /** One line per failed check. */
  failures: string[];
  /** Passes that could not run (no teardown to stop the mock with). */
  warnings: string[];
}

function withDeadline<T>(run: () => T | Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolvePromise, rejectPromise) => {
    // Deliberately not unref'd: against a hung handler this timer is the only
    // handle on the event loop — unref it and node exits 0 before it fires.
    const timer = setTimeout(() => rejectPromise(new Error(`ERR_SMOKE_TIMEOUT: ${label} did not settle within ${ms}ms`)), ms);
    Promise.resolve()
      .then(run)
      .then(resolvePromise, rejectPromise)
      .finally(() => clearTimeout(timer));
  });
}

/** A value the runtime's param gate accepts for `p`, for params a probe is not about. */
function gateValue(p: ContractParam): unknown {
  if (Array.isArray(p.enum) && p.enum.length) return p.enum[0];
  switch (p.type) {
    case 'number':
      return typeof p.min === 'number' ? p.min : typeof p.max === 'number' ? Math.min(p.max, 0) : 0;
    case 'boolean':
      return false;
    case 'string':
      return '';
    default:
      return {};
  }
}

/**
 * A param set for `cmd` that passes its gate: the smoke config's sample when
 * it has one, every other required param filled with a valid value. The gate
 * checks params in declaration order and `required` before range, so a probe
 * that sends only the param under test fails on the first missing required
 * param instead of the bound it means to test. Optional params stay absent —
 * the gate skips them, and a filler value ('' / {} / false) could make the
 * handler reject for its own reasons, passing the self-rejection check for
 * the wrong one.
 */
function baselineParams(cmd: ContractEntry, sample: object | undefined): Record<string, unknown> {
  const filled = Object.fromEntries((cmd.params ?? []).filter((p) => p.required === true).map((p) => [p.name, gateValue(p)]));
  return { ...filled, ...(sample ?? {}) };
}

async function resolveSpec(workerDir: string, config: string | undefined): Promise<SmokeSpec> {
  const requireFromWorker = createRequire(join(workerDir, 'noop.js'));
  if (config) {
    if (config.trim().startsWith('{')) return { config: JSON.parse(config) };
    const file = isAbsolute(config) ? config : resolve(config);
    if (file.endsWith('.json')) return { config: JSON.parse(readFileSync(file, 'utf8')) };
    const mod = requireFromWorker(file);
    return mod.setup ? mod.setup() : { config: mod };
  }
  const smokeConfig = join(workerDir, 'smoke.config.js');
  if (!existsSync(smokeConfig)) {
    throw new Error(`ERR_SMOKE_NO_CONFIG: no --smoke-config given and no ${smokeConfig}`);
  }
  return requireFromWorker(smokeConfig).setup();
}

/**
 * Behavioural checks against the worker's own mock device — no Kernel, no DHT.
 * Live pass: every declared telemetry handler returns its declared type, the
 * runtime's param gate rejects out-of-range values, every smoke.config sample
 * command executes, and a handler called with an out-of-range param rejects
 * with an ERR_* of its own (the worker is reachable on its own RPC key, so it
 * must not rely on the Kernel's gate). Stopped pass, after `teardown()`: every
 * handler rejects with an ERR_* within the deadline — no hang, no crash, no
 * stale value. Two exceptions: a `health` channel may instead report a non-OK
 * status (its job is to say the device is down), and the smoke config's
 * `offlineTelemetry` channels must return their declared type. Every handler
 * call is bounded by `timeoutMs`.
 */
export async function runWorkerSmoke(workerDir: string, opts: { config?: string; timeoutMs?: number } = {}): Promise<SmokeOutcome> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const outcome: SmokeOutcome = { passed: 0, failures: [], warnings: [] };
  const check = (ok: boolean, label: string, detail?: string): void => {
    if (ok) outcome.passed++;
    else outcome.failures.push(`smoke: ${label}${detail ? ` — ${detail}` : ''}`);
  };

  const runtime = require('@tetherto/mdk-worker') as MdkWorkerRuntime;
  const pluginDir = existsSync(join(workerDir, 'plugin', 'mdk-contract.json')) ? join(workerDir, 'plugin') : workerDir;
  const { contract, entries, dir } = runtime.loadContract(pluginDir);
  const spec = await resolveSpec(workerDir, opts.config);

  // setup() has started the mock: stop it however the checks end, or its open
  // socket keeps the process alive after a handler fails to load.
  let stopped = false;
  const stop = async (): Promise<void> => {
    if (stopped || !spec.teardown) return;
    stopped = true;
    await withDeadline(() => spec.teardown!(), timeoutMs, 'teardown()');
  };

  try {
    const instance = runtime.createInstance({
      dir,
      entries,
      device: {
        id: 'smoke-0',
        opts: Object.freeze({ ...(spec.config ?? {}) }),
        env: Object.freeze({ ...(spec.env ?? {}) }),
        config: Object.freeze({ ...(spec.pluginConfig ?? {}) }),
        workerId: 'smoke',
        logger: () => {},
      },
    });

    const telemetry = contract.capabilities.telemetry ?? [];
    const commands = contract.capabilities.commands ?? [];

    for (const entry of telemetry) {
      const label = `telemetry '${entry.name}' returns a ${entry.type}`;
      const typeOk = TYPE_OK[entry.type ?? ''] ?? ((v: unknown) => v !== undefined);
      try {
        const value = await withDeadline(() => instance.telemetry.get(entry.name)!({}), timeoutMs, label);
        check(value !== undefined && typeOk(value), label, value === undefined ? 'returned undefined' : `returned ${JSON.stringify(value)}`);
      } catch (error) {
        check(false, label, message(error));
      }
    }

    for (const cmd of commands) {
      const base = baselineParams(cmd, spec.commands?.[cmd.name]);
      for (const p of cmd.params ?? []) {
        if (p.type !== 'number' || typeof p.min !== 'number' || typeof p.max !== 'number') continue;
        const below = runtime.validateParams(cmd.params, { ...base, [p.name]: p.min - 1 });
        check(below !== null && below.startsWith('ERR_PARAM_RANGE'), `param gate rejects '${cmd.name}' ${p.name}=${p.min - 1}`, below ?? 'accepted');
        const above = runtime.validateParams(cmd.params, { ...base, [p.name]: p.max + 1 });
        check(above !== null && above.startsWith('ERR_PARAM_RANGE'), `param gate rejects '${cmd.name}' ${p.name}=${p.max + 1}`, above ?? 'accepted');
        const atMin = runtime.validateParams(cmd.params, { ...base, [p.name]: p.min });
        const atMax = runtime.validateParams(cmd.params, { ...base, [p.name]: p.max });
        check(atMin === null && atMax === null, `param gate accepts '${cmd.name}' ${p.name} at [${p.min}, ${p.max}]`, atMin ?? atMax ?? undefined);
      }
    }

    for (const [name, params] of Object.entries(spec.commands ?? {})) {
      const label = `command '${name}' executes with sample params`;
      const cmd = commands.find((c) => c.name === name);
      const handler = instance.commands.get(name);
      if (!cmd || !handler) {
        check(false, label, 'not declared in contract');
        continue;
      }
      const gate = runtime.validateParams(cmd.params, params);
      if (gate !== null) {
        check(false, label, gate);
        continue;
      }
      try {
        await withDeadline(() => handler(params), timeoutMs, label);
        check(true, label);
      } catch (error) {
        check(false, label, message(error));
      }
    }

    // The worker is reachable on its own RPC key, so each handler must reject
    // bad input itself, not lean on the Kernel's gate.
    for (const cmd of commands) {
      const p = (cmd.params ?? []).find((q) => q.type === 'number' && typeof q.min === 'number');
      if (!p) continue;
      const label = `command '${cmd.name}' itself rejects ${p.name}=${p.min! - 1} with an ERR_*`;
      // Otherwise valid params, so the handler rejects the bound, not a missing param.
      const params = { ...baselineParams(cmd, spec.commands?.[cmd.name]), [p.name]: p.min! - 1 };
      await expectErr(() => instance.commands.get(cmd.name)!(params), timeoutMs, label, check);
    }

    if (!spec.teardown) {
      outcome.warnings.push('smoke: no teardown() in the smoke config — device-stopped behaviour not checked');
      return outcome;
    }
    await stop();

    const offline = new Set(spec.offlineTelemetry ?? []);
    for (const name of offline) {
      if (!telemetry.some((entry) => entry.name === name)) check(false, `offlineTelemetry '${name}' is a declared telemetry channel`);
    }
    for (const entry of telemetry) {
      const read = (): unknown => instance.telemetry.get(entry.name)!({});
      if (offline.has(entry.name)) {
        const label = `telemetry '${entry.name}' still returns a ${entry.type} from the worker's store when the device is stopped`;
        const typeOk = TYPE_OK[entry.type ?? ''] ?? ((v: unknown) => v !== undefined);
        try {
          const value = await withDeadline(read, timeoutMs, label);
          check(value !== undefined && typeOk(value), label, `returned ${JSON.stringify(value)}`);
        } catch (error) {
          check(false, label, message(error));
        }
      } else if (entry.name === 'health') {
        const label = `telemetry 'health' reports a non-OK status or fails with an ERR_* when the device is stopped`;
        await expectErr(read, timeoutMs, label, check, (value) => isNonOkHealth(value));
      } else {
        const label = `telemetry '${entry.name}' fails with an ERR_* when the device is stopped`;
        await expectErr(read, timeoutMs, label, check);
      }
    }
    for (const [name, params] of Object.entries(spec.commands ?? {})) {
      const handler = instance.commands.get(name);
      if (!handler) continue;
      const label = `command '${name}' fails with an ERR_* when the device is stopped`;
      await expectErr(() => handler(params), timeoutMs, label, check);
    }

    return outcome;
  } finally {
    await stop().catch(() => {});
  }
}

async function expectErr(
  run: () => unknown,
  timeoutMs: number,
  label: string,
  check: (ok: boolean, label: string, detail?: string) => void,
  /** A resolved value that also counts as failing correctly. */
  acceptResolved?: (value: unknown) => boolean,
): Promise<void> {
  try {
    const value = await withDeadline(run, timeoutMs, label);
    check(acceptResolved?.(value) ?? false, label, `resolved with ${JSON.stringify(value)}`);
  } catch (error) {
    const text = message(error);
    check(/(^|: )ERR_[A-Z_]+/.test(text) && !text.startsWith('ERR_SMOKE_TIMEOUT'), label, text);
  }
}

/** A health verdict that says the device is not fine: `{ status }` with any value but OK. */
function isNonOkHealth(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const { status } = value as { status?: unknown };
  return typeof status === 'string' && status !== '' && status !== 'OK';
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
