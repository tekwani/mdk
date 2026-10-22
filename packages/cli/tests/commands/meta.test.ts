import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerVersion } from '../../src/commands/meta.js';
import { pkg } from '../../src/lib/pkg.js';

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerVersion(program);
  return program;
}

afterEach(() => vi.restoreAllMocks());

describe('mdk version', () => {
  it('prints the package name and version to stdout', async () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await buildProgram().parseAsync(['node', 'mdk', 'version']);
    expect(stdout).toHaveBeenCalledWith(`${pkg.name} ${pkg.version}\n`);
  });
});
