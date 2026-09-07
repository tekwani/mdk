/* eslint-disable no-console */
/**
 * Fails the build when a component stylesheet is not reachable from
 * `src/styles.scss`.
 *
 * Components in this package deliberately do not `import './foo.scss'` from
 * their `.tsx` — the single `src/styles.scss` entry is what Vite compiles into
 * the published `dist/styles.css`. That keeps the emitted JS free of SCSS
 * references, but it also means a new partial that nobody `@use`s compiles,
 * type-checks, passes tests, and renders completely unstyled in a consumer app.
 * This catches that at build time instead.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'src')
const entry = join(srcDir, 'styles.scss')

/** Every `.scss` under src/, except the entry itself. */
function collectStylesheets(dir) {
  const found = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      found.push(...collectStylesheets(full))
    } else if (name.endsWith('.scss') && full !== entry) {
      found.push(full)
    }
  }
  return found
}

/** Follow `@use`/`@forward` from the entry, resolving SCSS partial naming. */
function collectReachable(from, seen = new Set()) {
  if (seen.has(from)) return seen
  seen.add(from)

  const source = readFileSync(from, 'utf8')
  const specifiers = [...source.matchAll(/@(?:use|forward)\s+['"]([^'"]+)['"]/g)].map((m) => m[1])

  for (const specifier of specifiers) {
    // Bare specifiers are package imports (e.g. the devkit mixins), not ours.
    if (!specifier.startsWith('.')) continue

    const base = resolve(dirname(from), specifier)
    const candidates = [
      `${base}.scss`,
      join(dirname(base), `_${base.split('/').pop()}.scss`),
      join(base, 'index.scss'),
      join(base, '_index.scss'),
    ]

    const resolved = candidates.find((candidate) => {
      try {
        return statSync(candidate).isFile()
      } catch {
        return false
      }
    })

    if (resolved) collectReachable(resolved, seen)
  }

  return seen
}

const reachable = collectReachable(entry)
const orphans = collectStylesheets(srcDir).filter((file) => !reachable.has(file))

if (orphans.length > 0) {
  const list = orphans.map((file) => `  - src/${relative(srcDir, file)}`).join('\n')
  console.error(
    `check:styles — ${orphans.length} stylesheet(s) are not reachable from src/styles.scss:\n${list}\n\n`
    + 'Add an `@use` line for each to src/styles.scss, or they will ship unstyled.',
  )
  process.exit(1)
}

console.log(`check:styles — ok (${reachable.size - 1} stylesheet(s) forwarded)`)
