import { isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * Worker, plugin, app, dashboard and stack names. Each one becomes a single path
 * segment and (part of) an npm package name, so it must not contain `/`, `\`,
 * start with `.`, or carry anything a shell or source file would interpret.
 */
export const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

/** npm scope for `--org`, checked after an optional leading `@` is stripped. */
export const ORG_RE = /^[a-z0-9][a-z0-9._-]*$/;

export function isValidName(name: string): boolean {
  return NAME_RE.test(name);
}

export type OrgResult = { ok: true; org?: string } | { ok: false; message: string };

/**
 * Normalises a `--org` value: strips one leading `@` and validates the rest.
 * An absent or empty value means "no scope".
 */
export function parseOrg(org: string | undefined): OrgResult {
  if (org == null) return { ok: true };
  const bare = org.trim().replace(/^@/, '');
  if (!bare) return { ok: true };
  if (!ORG_RE.test(bare)) {
    return {
      ok: false,
      message: `Invalid --org "${org}". Use lowercase letters, digits, '.', '_' or '-' (an optional leading '@' is allowed).`,
    };
  }
  return { ok: true, org: bare };
}

/** True when `child` resolves to `parent` itself or a path strictly beneath it. */
export function isInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}
