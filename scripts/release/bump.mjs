#!/usr/bin/env node
// Moves the whole release line to one version and resyncs everything that follows from it.
//
// Usage: npm run release:bump -- <version> [--dry-run] [--skip-registry] [--offline]
//
// What it does, in order:
//   1. every package.json on the line gets `version` = <version>, and every internal
//      @tetherto/mdk-* `^X` pin, in all four dependency fields, becomes ^<version>
//   2. every mdk-app.yaml gets `version:` = <version>, except fixtures and the scaffold template,
//      which stay at SCAFFOLD_APP_VERSION (0.1.0)
//   3. the README release links move to v<version>, and the link-check skip list gains the new tag
//   4. every package-lock.json is regenerated
//   5. the mdk-ui-component skill's UI registry is regenerated (--skip-registry to leave it)
//   6. release:check runs; the script exits 1 if it finds anything
//
// It never commits, tags, or publishes. --dry-run lists the edits and writes nothing.
// Afterwards: draft the changelog (skills/changelog), dry-run the publish plan, and review the diff.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { EXIT_PREREQUISITE } from '../../docs/scripts/sync-ui-registry.mjs'
import { runChecks } from './check.mjs'
import {
  OFF_LINE,
  REPO_ROOT,
  applyAppBump,
  applyBump,
  assertSemver,
  listAppManifests,
  listManifests,
  lockDirs,
  regenerateLock,
  rootVersion,
  writeManifest,
} from './lib.mjs'

const TAG_URL = 'https://github.com/tetherto/mdk/releases/tag/v'
const LINKINATOR = 'linkinator.config.json'

// Pure: whether the skip list already carries the tag URL for `version`.
export function hasTagSkip(text, version) {
  return text.includes(`"${TAG_URL}${version}"`)
}

// Pure: README release links from `from` to `to`.
export function bumpReadme(text, from, to) {
  return text.replaceAll(`${TAG_URL}${from}`, `${TAG_URL}${to}`).replaceAll(`[v${from}]`, `[v${to}]`)
}

// Pure: adds the new tag URL to linkinator's skip list, right after the previous one. The tag does
// not exist until the release is cut, so the link checker would 404 on the release notes.
export function bumpLinkinator(text, from, to) {
  const prev = `    "${TAG_URL}${from}",\n`
  const next = `    "${TAG_URL}${to}",\n`
  if (text.includes(next) || !text.includes(prev)) return text
  return text.replace(prev, `${prev}${next}`)
}

function main() {
  const args = process.argv.slice(2)
  const flag = (name) => args.includes(`--${name}`)
  const version = args.find((a) => !a.startsWith('--'))
  const dryRun = flag('dry-run')

  assertSemver(version)
  const from = rootVersion()
  console.log(`${dryRun ? '[dry run] ' : ''}release line ${from} -> ${version}`)

  let edits = 0
  for (const { file, json } of listManifests()) {
    if (OFF_LINE.has(file)) continue
    const changes = applyBump(json, version)
    if (!changes.length) continue
    edits++
    console.log(`  ${file}: ${changes.length} change(s)`)
    if (!dryRun) writeManifest(file, json)
  }

  for (const { file, text, version: v } of listAppManifests()) {
    const next = applyAppBump(text, version)
    if (next === null) continue
    edits++
    console.log(`  ${file}: version ${v} -> ${version}`)
    if (!dryRun) fs.writeFileSync(path.join(REPO_ROOT, file), next)
  }

  for (const [file, fn] of [
    ['README.md', bumpReadme],
    [LINKINATOR, bumpLinkinator],
  ]) {
    const abs = path.join(REPO_ROOT, file)
    const text = fs.readFileSync(abs, 'utf8')
    const next = fn(text, from, version)
    if (file === LINKINATOR && !hasTagSkip(next, version)) {
      // bumpLinkinator found no v<from> line to anchor on (different indent, or the entry was
      // removed). Without the skip entry the link check 404s on the release notes' tag link.
      console.warn(`  warning: ${file} has no skip entry for ${TAG_URL}${version}; add it by hand, after the previous release's entry`)
    }
    if (next === text) continue
    edits++
    console.log(`  ${file}: updated`)
    if (!dryRun) fs.writeFileSync(abs, next)
  }

  if (dryRun) {
    console.log(`[dry run] ${edits} file(s) would change; nothing written`)
    return
  }

  for (const dir of lockDirs()) {
    console.log(`  regenerating ${dir}/package-lock.json`)
    regenerateLock(dir)
  }

  if (!flag('skip-registry')) {
    const r = spawnSync('npm', ['run', 'generate:ui-registry'], { cwd: REPO_ROOT, stdio: 'inherit' })
    if (r.status === EXIT_PREREQUISITE) console.warn('  UI registry skipped (ui/ dependencies not installed); run `npm run generate:ui-registry` later')
    else if (r.status !== 0) throw new Error('npm run generate:ui-registry failed; fix it or rerun with --skip-registry')
  }

  return runChecks({ version, offline: flag('offline') }).then(({ problems }) => {
    for (const p of problems) console.log(p)
    if (problems.length) {
      console.error(`release:check found ${problems.length} problem(s)`)
      process.exit(1)
    }
    console.log(`release:check OK. ${version} is staged in the working tree, uncommitted.`)
    console.log('Next: draft the changelog, dry-run the npm publish plan, review `git diff`.')
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  Promise.resolve()
    .then(main)
    .catch((err) => {
      console.error(err.message)
      process.exit(2)
    })
}
