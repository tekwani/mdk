import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

/**
 * The project's machine-local secrets file. `mdk.yaml` is meant to be committed,
 * so secret setup answers live here and the spec only holds `${NAME}`
 * placeholders (resolved by `loadStackSpec`). Always gitignored — see
 * `ensureProjectGitignore`.
 */
export const ENV_FILE = '.env';

const ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Parses `<projectDir>/.env`; `{}` when it is absent or unreadable. */
export function readProjectEnv(projectDir: string): Record<string, string> {
  const file = join(projectDir, ENV_FILE);
  if (!existsSync(file)) return {};
  try {
    return parseEnv(readFileSync(file, 'utf8')) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Quotes a value so Node's dotenv parser reads it back verbatim: single quotes
 * and backticks are literal, double quotes are a last resort (they expand `\n`).
 */
function quote(value: string): string {
  if (/[\r\n]/.test(value)) throw new Error('a .env value cannot contain a line break');
  for (const q of ["'", '`', '"']) {
    if (!value.includes(q) && !(q === '"' && value.includes('\\n'))) return `${q}${value}${q}`;
  }
  throw new Error('a .env value cannot contain all of \', ` and "');
}

/**
 * Sets `NAME=value` lines in `<projectDir>/.env`, replacing an existing line for
 * the same name or appending. The file is owner-only (0600).
 */
export function writeProjectEnv(projectDir: string, vars: Record<string, string>): string {
  const file = join(projectDir, ENV_FILE);
  let content = existsSync(file) ? readFileSync(file, 'utf8') : '';
  for (const [name, value] of Object.entries(vars)) {
    if (!ENV_NAME_RE.test(name)) throw new Error(`invalid environment variable name "${name}"`);
    const line = `${name}=${quote(value)}`;
    const re = new RegExp(`^${name}=.*$`, 'm');
    content = re.test(content)
      ? content.replace(re, () => line)
      : `${content}${content && !content.endsWith('\n') ? '\n' : ''}${line}\n`;
  }
  writeFileSync(file, content, { encoding: 'utf8', mode: 0o600 });
  chmodSync(file, 0o600);
  return file;
}
