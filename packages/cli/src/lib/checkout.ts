import { basename, dirname } from 'node:path';

/**
 * Root of the MDK monorepo checkout the CLI runs from, or null for a published
 * install. Only the known `<root>/packages/cli` layout is accepted — never a walk
 * up the tree, which would let any ancestor directory (a shared `/tmp`, a home
 * directory) plant the templates or packages the CLI then copies and installs.
 */
export function checkoutRoot(cliRoot: string): string | null {
  const packagesDir = dirname(cliRoot);
  if (basename(cliRoot) !== 'cli' || basename(packagesDir) !== 'packages') return null;
  return dirname(packagesDir);
}
