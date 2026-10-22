import type { Command } from 'commander';
import { pkg } from '../lib/pkg.js';

// Group G — Meta & agent discovery
export function registerVersion(program: Command): void {
  program
    .command('version')
    .description('Print the CLI version')
    .action(() => {
      // Data command: the version string goes to stdout.
      process.stdout.write(`${pkg.name} ${pkg.version}\n`);
    });
}
