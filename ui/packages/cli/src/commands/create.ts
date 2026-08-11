import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { findTemplate } from '../templates.js'
import { runInit } from './init.js'

const MDK_PACKAGES = [
  '@tetherto/mdk-fonts',
  '@tetherto/mdk-ui-foundation',
  '@tetherto/mdk-react-adapter',
  '@tetherto/mdk-react-devkit',
] as const

/**
 * Walk up from `start` looking for an MDK monorepo root. Detected by the
 * presence of `packages/ui-foundation/package.json` whose name is `@tetherto/mdk-ui-foundation`.
 * Returns the absolute path of the monorepo root, or null if not inside one.
 */
const findMdkMonorepoRoot = (start: string): string | null => {
  let dir = start
  while (dir !== dirname(dir)) {
    const probe = join(dir, 'packages', 'ui-foundation', 'package.json')
    if (existsSync(probe)) {
      try {
        const pkg = JSON.parse(readFileSync(probe, 'utf8')) as { name?: string }
        if (pkg.name === '@tetherto/mdk-ui-foundation') return dir
      } catch {
        // ignore, keep walking
      }
    }
    dir = dirname(dir)
  }
  return null
}

/**
 * Fallback range for MDK deps if the CLI's own version can't be read. MDK
 * packages release in lockstep with the CLI, so its version is the source of
 * truth for standalone pins; `latest` is a safe last resort.
 */
const FALLBACK_MDK_RANGE = 'latest'

/** Package root of the CLI, in both `dist/commands/*.js` and `src/commands/*.ts`. */
const CLI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** The published range to pin standalone MDK deps to (`^<cliVersion>`). */
const publishedMdkRange = (): string => {
  try {
    const pkg = JSON.parse(readFileSync(join(CLI_ROOT, 'package.json'), 'utf8')) as {
      version?: string
    }
    if (pkg.version) return `^${pkg.version}`
  } catch {
    // fall through to the fallback range
  }
  return FALLBACK_MDK_RANGE
}

/**
 * Rewrite the scaffolded package.json for its target context. The generated
 * app keeps the bare name the user chose (the `@tetherto/` scope belongs to the
 * MDK library packages, not the app). The template's own `package.json` links
 * MDK packages via `file:` (so it runs in place); a generated app must never
 * inherit those unresolvable links:
 *   - INSIDE the monorepo → MDK deps `"*"` (npm workspace protocol; picks up
 *     the root `node_modules/@tetherto` symlinks).
 *   - STANDALONE → any `file:` MDK dep rewritten to a published range so it
 *     resolves from npm.
 */
const rewritePackageJson = (
  pkgJsonPath: string,
  { appName, isMonorepo }: { appName: string; isMonorepo: boolean },
): void => {
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as {
    name?: string
    dependencies?: Record<string, string>
  }
  pkg.name = appName
  const deps = pkg.dependencies
  if (deps) {
    const range = isMonorepo ? '*' : publishedMdkRange()
    for (const name of MDK_PACKAGES) {
      if (!(name in deps)) continue
      // Monorepo: always `*`. Standalone: only rewrite local `file:` links,
      // leaving any already-published range (e.g. the starter's) untouched.
      if (isMonorepo || deps[name]!.startsWith('file:')) deps[name] = range
    }
  }
  writeFileSync(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
}

/**
 * The shell template centralises its human-facing name in an `APP_NAME`
 * constant (src/constants/env.ts) — read by the browser tab and the Home page.
 * Rewrite it to the chosen app name. No-op for templates without that constant.
 */
const setDisplayName = (targetDir: string, appName: string): void => {
  const envPath = join(targetDir, 'src', 'constants', 'env.ts')
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf8')
  const next = content.replace(/(export const APP_NAME\s*=\s*)(['"]).*?\2/, `$1'${appName}'`)
  if (next !== content) writeFileSync(envPath, next, 'utf8')
}

export type CreateOptions = {
  appName: string
  /** Template id. Defaults to `mdk-ui-shell` inside the monorepo, `starter` elsewhere. */
  template?: string
  /** Parent directory for the new app. Defaults to `apps/` inside the monorepo, `process.cwd()` elsewhere. */
  cwd?: string
  /** Run npm install after scaffold. Defaults to `true` for standalone, `false` inside the monorepo (the root install handles it). */
  install?: boolean
  /** Agent context to seed. Defaults to `none` inside the monorepo, `cursor` elsewhere. */
  ide?: 'cursor' | 'claude' | 'none'
  out?: (line: string) => void
}

const NPM_PACKAGE_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

const validateAppName = (name: string): void => {
  if (!NPM_PACKAGE_NAME.test(name)) {
    throw new Error(
      `Invalid app name "${name}". Use lowercase letters, digits, hyphens, dots, and underscores (npm package-name rules).`,
    )
  }
}

const walk = (dir: string): string[] => {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
    } else {
      out.push(full)
    }
  }
  return out
}

/**
 * Local artifacts the runnable template accrues on disk (it is a real app you
 * can `npm run dev` in place) that must never be copied into a scaffolded app.
 * Matched by basename; directory matches skip the whole subtree.
 */
const COPY_EXCLUDES = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.env',
  '.env.local',
  '.vite',
  'package-lock.json',
])

const isCopyExcluded = (src: string): boolean => {
  const base = src.split('/').pop()!
  return COPY_EXCLUDES.has(base) || base.endsWith('.log') || base.endsWith('.tsbuildinfo')
}

/**
 * Post-process the freshly copied tree:
 *  - delete `_meta.json` (CLI-internal metadata).
 *  - rename `_gitignore` → `.gitignore` (npm strips real .gitignore on publish).
 *  - rename `package.json.tpl` → `package.json` and substitute `{{appName}}`.
 *  - substitute `{{appName}}` in any other text file that mentions it.
 */
const finalizeTree = (targetDir: string, appName: string): void => {
  const files = walk(targetDir)
  const substitute = (path: string): void => {
    const content = readFileSync(path, 'utf8')
    if (!content.includes('{{appName}}')) return
    writeFileSync(path, content.replaceAll('{{appName}}', appName), 'utf8')
  }

  for (const file of files) {
    const base = file.split('/').pop()!
    if (base === '_meta.json') {
      unlinkSync(file)
      continue
    }
    if (base === '_gitignore') {
      renameSync(file, join(file, '..', '.gitignore'))
      continue
    }
    if (base === 'package.json.tpl') {
      const renamed = join(file, '..', 'package.json')
      renameSync(file, renamed)
      substitute(renamed)
      continue
    }
    substitute(file)
  }
}

export const runCreate = (opts: CreateOptions): { appPath: string } => {
  const out =
    opts.out ??
    ((s: string) => {
      // eslint-disable-next-line no-console
      console.log(s)
    })

  validateAppName(opts.appName)

  // Resolve monorepo context from the user-supplied cwd if any, otherwise
  // from the actual working directory. The defaults pivot off this.
  const probeCwd = opts.cwd ?? process.cwd()
  const monorepoRoot = findMdkMonorepoRoot(probeCwd)
  const isMonorepo = monorepoRoot !== null

  const template = findTemplate(opts.template ?? (isMonorepo ? 'mdk-ui-shell' : 'starter'))

  // Parent directory: inside the monorepo, default to `<root>/apps`.
  const parentDir = opts.cwd ?? (isMonorepo ? join(monorepoRoot!, 'apps') : process.cwd())

  // Inner install only makes sense for standalone apps. Inside the
  // monorepo, defer to a single `npm install` at the root that wires up
  // the new workspace via symlinks.
  const shouldInstall = opts.install ?? !isMonorepo
  const ide = opts.ide ?? (isMonorepo ? 'none' : 'cursor')

  const targetDir = resolve(parentDir, opts.appName)
  if (existsSync(targetDir)) {
    throw new Error(`${targetDir} already exists. Pick a different name or delete it.`)
  }

  mkdirSync(targetDir, { recursive: true })
  cpSync(template.path, targetDir, { recursive: true, filter: (src) => !isCopyExcluded(src) })
  // `_managed/` holds the CLI-only demo page sources (Dashboard, Pool Manager,
  // Alerts, …) that `mdk-ui add page` copies on demand. A fresh app ships a bare
  // backbone, so strip the whole directory from the scaffold — it is read from
  // the template on disk, never from the generated app.
  rmSync(join(targetDir, '_managed'), { recursive: true, force: true })
  finalizeTree(targetDir, opts.appName)
  // Rewrite the package name + MDK dep protocol for the target context (workspace
  // `*` inside the monorepo, published range for a standalone app).
  rewritePackageJson(join(targetDir, 'package.json'), { appName: opts.appName, isMonorepo })
  // Inject the chosen name into the app's display-name constant (tab + Home).
  setDisplayName(targetDir, opts.appName)
  out(`✓ Scaffolded ${opts.appName} from template "${template.meta.id}"`)

  if (isMonorepo) {
    out(
      `→ Detected MDK monorepo at ${monorepoRoot!}; wired ${opts.appName} as a workspace.`,
    )
  }

  if (shouldInstall) {
    /* v8 ignore start -- spawns real `npm install`, untestable without mocking */
    out('→ Running npm install (this may take a minute)…')
    const result = spawnSync('npm', ['install'], {
      cwd: targetDir,
      stdio: 'inherit',
    })
    if (result.status !== 0) {
      throw new Error(
        `npm install failed with exit code ${result.status}. Run it manually in ${targetDir}.`,
      )
    }
    out('✓ Dependencies installed')

    runInit({
      packageName: '@tetherto/mdk-react-devkit',
      ide,
      cwd: targetDir,
      force: true,
      out,
    })
    /* v8 ignore stop */
  } else if (isMonorepo && opts.install !== false) {
    /* v8 ignore start -- spawns real `npm install`, untestable without mocking */
    out('→ Running npm install at the monorepo root to wire the workspace…')
    const result = spawnSync('npm', ['install'], {
      cwd: monorepoRoot!,
      stdio: 'inherit',
    })
    if (result.status !== 0) {
      throw new Error(
        `Root npm install failed with exit code ${result.status}. Run it manually in ${monorepoRoot!}.`,
      )
    }
    out('✓ Workspace wired into root node_modules')
    /* v8 ignore stop */
  }

  out('')
  out('Next steps:')
  if (isMonorepo) {
    out(`  npm run dev --workspace ${opts.appName}`)
  } else {
    out(`  cd ${opts.appName}`)
    if (!shouldInstall) {
      out('  npm install')
      out(`  npx mdk-ui init --ide ${ide}   # seed agent context files`)
    }
    out('  npm run dev')
  }

  return { appPath: targetDir }
}
