import { INSTALL_SPEC_RE } from './npm.js';
import { isLocalPackagePath } from './spec.js';

/**
 * Where `mdk add` installs a package from: the npm registry or a GitHub repo.
 */
export interface PackageSource {
  kind: 'npm' | 'github';
  /** The argument handed to `npm install`. */
  installSpec: string;
  /** Known up front for npm (the package part of the spec); learnt from the install for GitHub. */
  packageName?: string;
  /** A directory inside the installed package (npm packages that ship several apps). */
  subpath?: string;
}

// The owner starts with a letter or digit, so `../x` is never read as a repo;
// a ref is a branch, tag or SHA (`/` allowed for `release/1.x`).
const GITHUB_URL = /^(?:git\+)?https:\/\/github\.com\/([A-Za-z0-9][\w.-]*)\/([\w.-]+?)(?:\.git)?(?:#([\w./-]+))?$/;
const GITHUB_SHORTHAND = /^(?:github:)?([A-Za-z0-9][\w.-]*)\/([\w.-]+?)(?:\.git)?(?:#([\w./-]+))?$/;
const NPM_NAME = /^[a-z0-9][a-z0-9._~-]*$/;

function github(owner: string, repo: string, ref?: string): PackageSource {
  return { kind: 'github', installSpec: `github:${owner}/${repo}${ref ? `#${ref}` : ''}` };
}

/**
 * Classifies an `mdk add` source:
 *
 * - `github:owner/repo[#ref]`, `owner/repo[#ref]` or `https://github.com/owner/repo[.git][#ref]`
 * - an npm spec: `pkg`, `pkg@1.2.3`, `@scope/pkg[@range]`, with an optional trailing subpath
 *   (`@scope/pkg/apps/ops`) naming a directory inside the package.
 *
 * `owner/repo` is read as GitHub, as npm itself does; an unscoped npm package with a
 * subpath is therefore ambiguous and has to be written `pkg@latest/sub`.
 */
export function parseSource(raw: string): PackageSource {
  const source = raw.trim();
  if (!source) throw new Error('Give a package source: an npm package or a GitHub repo (owner/repo).');
  if (isLocalPackagePath(source) || source.startsWith('file:') || source.startsWith('~')) {
    throw new Error(
      `"${raw}" is a path. \`mdk add\` installs from npm or GitHub; for a package on disk, ` +
        'reference it by path in mdk.yaml (`package: ./apps/<name>`), or scaffold one with `mdk create`.',
    );
  }

  const url = GITHUB_URL.exec(source);
  if (url) return github(url[1]!, url[2]!, url[3]);

  if (source.startsWith('github:')) {
    const short = GITHUB_SHORTHAND.exec(source);
    if (!short) throw new Error(`"${raw}" is not a valid GitHub source (expected github:owner/repo[#ref]).`);
    return github(short[1]!, short[2]!, short[3]);
  }

  if (!source.startsWith('@')) {
    const short = GITHUB_SHORTHAND.exec(source);
    if (short && !source.includes('@')) return github(short[1]!, short[2]!, short[3]);
  }

  const segments = source.split('/');
  const nameSegments = source.startsWith('@') ? 2 : 1;
  const head = segments.slice(0, nameSegments);
  const subpath = segments.slice(nameSegments).join('/');
  if (head.length < nameSegments || (source.startsWith('@') && head[0]!.length < 2)) {
    throw new Error(`"${raw}" is not a valid npm package (expected @scope/name).`);
  }

  // `name@range` carries the version on the last name segment.
  const last = head[head.length - 1]!;
  const at = last.indexOf('@');
  const bareLast = at === -1 ? last : last.slice(0, at);
  const range = at === -1 ? '' : last.slice(at);
  const bareHead = [...head.slice(0, -1), bareLast];
  const packageName = bareHead.join('/');
  const nameOnly = bareHead[bareHead.length - 1]!;
  if (!NPM_NAME.test(nameOnly) || (nameSegments === 2 && !/^@[a-z0-9][a-z0-9._~-]*$/.test(bareHead[0]!))) {
    throw new Error(`"${raw}" is not a valid npm package name.`);
  }
  if (at !== -1 && range.length < 2) throw new Error(`"${raw}" has an empty version after "@".`);
  if (subpath && !subpath.split('/').every((s) => /^[A-Za-z0-9_][\w.-]*$/.test(s))) {
    throw new Error(`"${raw}" is not a valid package subpath (directory names only, no "..").`);
  }

  if (range && !INSTALL_SPEC_RE.test(`${packageName}${range}`)) {
    throw new Error(`"${raw}" has a version npm install cannot take as one argument (no spaces; use e.g. ^1.2.0).`);
  }

  return {
    kind: 'npm',
    installSpec: `${packageName}${range}`,
    packageName,
    ...(subpath ? { subpath } : {}),
  };
}
