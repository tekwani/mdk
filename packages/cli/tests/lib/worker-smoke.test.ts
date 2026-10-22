import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runWorkerSmoke } from '../../src/lib/worker-smoke.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

const CONTRACT = {
  metadata: { provider: 'test', deviceFamily: 'miner', brand: 'Smoke', modelsSupported: ['S1'], overview: 'Fixture.' },
  capabilities: {
    telemetry: [{ name: 'power', type: 'number', handler: 'src/power.js', description: 'W' }],
    commands: [
      {
        name: 'setPowerLimit',
        handler: 'src/set-power-limit.js',
        params: [{ name: 'watts', type: 'number', min: 100, max: 3500 }],
      },
    ],
    health: { supportedStates: ['OK'] },
    errors: {},
  },
};

// A worker whose "device" is a state file the smoke config flips: 'up' while
// the mock runs, 'down' after teardown().
function smokeWorker(opts: { whenDown?: 'throw' | 'hang'; handlerChecksBounds?: boolean; teardown?: boolean } = {}): string {
  const { whenDown = 'throw', handlerChecksBounds = true, teardown = true } = opts;
  const dir = makeTmpDir();
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'smoke-rig', version: '0.1.0' }));
  writeFileSync(join(dir, 'mdk-contract.json'), JSON.stringify(CONTRACT));

  const down = whenDown === 'hang' ? 'return new Promise(() => {})' : "throw new Error('ERR_DEVICE_UNREACHABLE: mock stopped')";
  const guard = `
    const fs = require('fs')
    const device = require('@tetherto/mdk-worker/device')
    const up = () => fs.readFileSync(device.opts.stateFile, 'utf8') === 'up'
  `;
  writeFileSync(join(dir, 'src', 'power.js'), `'use strict'\n${guard}\nmodule.exports = () => { if (!up()) { ${down} } return 1200 }\n`);
  writeFileSync(
    join(dir, 'src', 'set-power-limit.js'),
    `'use strict'\n${guard}\nmodule.exports = (params) => {\n` +
      `  if (!up()) { ${down} }\n` +
      (handlerChecksBounds ? `  if (params.watts < 100 || params.watts > 3500) throw new Error('ERR_PARAM_RANGE: watts out of range')\n` : '') +
      `  return true\n}\n`,
  );
  writeFileSync(
    join(dir, 'smoke.config.js'),
    `'use strict'\nconst fs = require('fs')\nconst path = require('path')\n` +
      `exports.setup = () => {\n` +
      `  const stateFile = path.join(__dirname, 'device-state')\n` +
      `  fs.writeFileSync(stateFile, 'up')\n` +
      `  return {\n` +
      `    config: { stateFile },\n` +
      `    commands: { setPowerLimit: { watts: 200 } },\n` +
      (teardown ? `    teardown: () => fs.writeFileSync(stateFile, 'down'),\n` : '') +
      `  }\n}\n`,
  );
  return dir;
}

afterEach(cleanupTmpDirs);

describe('runWorkerSmoke', () => {
  it('passes a worker that behaves, including the device-stopped pass', async () => {
    const outcome = await runWorkerSmoke(smokeWorker());
    expect(outcome.failures).toEqual([]);
    expect(outcome.warnings).toEqual([]);
    // telemetry type, 3 param-gate checks, sample command, handler-rejects,
    // stopped telemetry, stopped command
    expect(outcome.passed).toBe(8);
  });

  it('fails a handler that relies on the Kernel gate instead of rejecting bad params itself', async () => {
    const outcome = await runWorkerSmoke(smokeWorker({ handlerChecksBounds: false }));
    expect(outcome.failures).toEqual([expect.stringContaining("command 'setPowerLimit' itself rejects watts=99")]);
  });

  it('turns a hang after device stop into a deadline failure instead of hanging', async () => {
    const outcome = await runWorkerSmoke(smokeWorker({ whenDown: 'hang' }), { timeoutMs: 300 });
    expect(outcome.failures).toHaveLength(2);
    for (const failure of outcome.failures) expect(failure).toContain('ERR_SMOKE_TIMEOUT');
  }, 10_000);

  it('warns instead of failing when the smoke config has no teardown', async () => {
    const outcome = await runWorkerSmoke(smokeWorker({ teardown: false }));
    expect(outcome.failures).toEqual([]);
    expect(outcome.warnings).toEqual([expect.stringContaining('device-stopped behaviour not checked')]);
    expect(outcome.passed).toBe(6);
  });

  it('probes each bound of a multi-param command with the other required params filled in', async () => {
    const dir = smokeWorker({ teardown: false });
    const contract = structuredClone(CONTRACT);
    contract.capabilities.commands.push({
      name: 'setFanTimer',
      handler: 'src/set-fan-timer.js',
      params: [
        { name: 'enabled', type: 'boolean', required: true },
        { name: 'interval', type: 'number', required: true, min: 1, max: 600 },
        { name: 'speed', type: 'number', required: true, min: 0, max: 100 },
      ],
    } as (typeof contract.capabilities.commands)[number]);
    writeFileSync(join(dir, 'mdk-contract.json'), JSON.stringify(contract));
    writeFileSync(
      join(dir, 'src', 'set-fan-timer.js'),
      `'use strict'\nmodule.exports = (p) => {\n` +
        `  if (typeof p.enabled !== 'boolean') throw new Error('ERR_PARAM_REQUIRED: enabled')\n` +
        `  if (!(p.interval >= 1 && p.interval <= 600) || !(p.speed >= 0 && p.speed <= 100)) throw new Error('ERR_PARAM_RANGE')\n` +
        `  return true\n}\n`,
    );

    const outcome = await runWorkerSmoke(dir);
    expect(outcome.failures).toEqual([]);
    // 6 from the base fixture, plus 3 gate checks for each of the two bounded params,
    // plus the handler's own rejection of interval=0
    expect(outcome.passed).toBe(6 + 6 + 1);
  });

  describe('device-stopped telemetry', () => {
    // Adds one telemetry channel to the fixture, and optionally a line to the
    // object smoke.config.js setup() returns.
    function withChannel(name: string, type: string, body: string, specLine = ''): string {
      const dir = smokeWorker();
      const contract = structuredClone(CONTRACT);
      contract.capabilities.telemetry.push({ name, type, handler: `src/${name}.js`, description: name });
      writeFileSync(join(dir, 'mdk-contract.json'), JSON.stringify(contract));
      writeFileSync(
        join(dir, 'src', `${name}.js`),
        `'use strict'\nconst fs = require('fs')\nconst device = require('@tetherto/mdk-worker/device')\n` +
          `const up = () => fs.readFileSync(device.opts.stateFile, 'utf8') === 'up'\n${body}\n`,
      );
      if (specLine) {
        const file = join(dir, 'smoke.config.js');
        writeFileSync(file, readFileSync(file, 'utf8').replace('  return {\n', `  return {\n    ${specLine},\n`));
      }
      return dir;
    }

    it('accepts a health channel that reports OFFLINE once the device stops', async () => {
      const dir = withChannel('health', 'object', `module.exports = () => ({ status: up() ? 'OK' : 'OFFLINE' })`);
      expect((await runWorkerSmoke(dir)).failures).toEqual([]);
    });

    it('fails a health channel that still reports OK once the device stops', async () => {
      const dir = withChannel('health', 'object', `module.exports = () => ({ status: 'OK' })`);
      expect((await runWorkerSmoke(dir)).failures).toEqual([expect.stringContaining("telemetry 'health' reports a non-OK status")]);
    });

    const history = `module.exports = () => [{ ts: 1 }]`;

    it('fails a store-backed channel that answers after stop unless offlineTelemetry lists it', async () => {
      expect((await runWorkerSmoke(withChannel('history', 'array', history))).failures).toEqual([
        expect.stringContaining("telemetry 'history' fails with an ERR_*"),
      ]);
      expect((await runWorkerSmoke(withChannel('history', 'array', history, "offlineTelemetry: ['history']"))).failures).toEqual([]);
    });

    it('still type-checks an offlineTelemetry channel after stop', async () => {
      const dir = withChannel('history', 'array', `module.exports = () => { if (!up()) return null; return [] }`, "offlineTelemetry: ['history']");
      expect((await runWorkerSmoke(dir)).failures).toEqual([expect.stringContaining("telemetry 'history' still returns a array")]);
    });

    it('fails an offlineTelemetry name the contract does not declare', async () => {
      const dir = withChannel('history', 'array', history, "offlineTelemetry: ['history', 'histroy']");
      expect((await runWorkerSmoke(dir)).failures).toEqual([expect.stringContaining("offlineTelemetry 'histroy'")]);
    });
  });

  it('stops the mock when a handler fails to load, so the process can exit', async () => {
    delete (globalThis as { __smokeStopped?: boolean }).__smokeStopped;
    const dir = smokeWorker();
    writeFileSync(join(dir, 'src', 'power.js'), `'use strict'\nrequire('./not-there')\n`);
    const file = join(dir, 'smoke.config.js');
    writeFileSync(file, readFileSync(file, 'utf8').replace("fs.writeFileSync(stateFile, 'down')", "(fs.writeFileSync(stateFile, 'down'), (globalThis.__smokeStopped = true))"));

    await expect(runWorkerSmoke(dir)).rejects.toThrow('ERR_INSTANCE_HANDLER_LOAD_FAILED');
    expect((globalThis as { __smokeStopped?: boolean }).__smokeStopped).toBe(true);
  });

  it('refuses to run without a device spec', async () => {
    const dir = smokeWorker();
    rmSync(join(dir, 'smoke.config.js'));
    await expect(runWorkerSmoke(dir)).rejects.toThrow('ERR_SMOKE_NO_CONFIG');
  });
});
