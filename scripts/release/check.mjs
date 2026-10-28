#!/usr/bin/env node
// Release consistency checks. Prints one line per problem and exits 1 if there are any.
//
// Usage: npm run release:check [-- <version>] [--offline]
//
// <version> defaults to the root package.json version. Checks:
//   versions     every package on the release line is at <version>
//   pins         every @tetherto/mdk-* pin, in all four dependency fields, is exactly ^<version>
//   apps         every release-line mdk-app.yaml is at <version>
//   private      no @tetherto/* package marked private here is already published on npm (the
//                publish step skips private packages without an error, so it would silently ship
//                without it). Needs the network; --offline skips it
//   locks        regenerating every package-lock.json changes nothing (CI's per-package gate)
//
// The publish plan itself is a separate dry run: .github/scripts/npm-publish.mjs lives in the
// public repo. Run `node npm-publish.mjs plan --ref <branch>` from a checkout that has it.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  OFF_LINE,
  REPO_ROOT,
  SCAFFOLD_APP_VERSION,
  assertSemver,
  findBadPins,
  listAppManifests,
  listManifests,
  lockDirs,
  regenerateLock,
  registryStatus,
  rootVersion,
} from './lib.mjs'

export async function runChecks({ version, offline = false, cwd = REPO_ROOT } = {}) {
  const target = version ?? rootVersion(cwd)
  assertSemver(target)
  const problems = []
  const manifests = listManifests(cwd)

  for (const { file, json } of manifests) {
    if (OFF_LINE.has(file)) continue
    if (json.version !== target) {
      problems.push(`versions\t${file}\t${json.name}@${json.version ?? '<none>'} != ${target}`)
    }
    for (const { field, name, spec } of findBadPins(json, target)) {
      problems.push(`pins\t${file}\t${field}\t${name}@${spec} (want ^${target})`)
    }
  }

  const apps = listAppManifests(cwd)
  const lineApps = apps.filter((a) => a.version && a.version !== SCAFFOLD_APP_VERSION)
  for (const { file, version: v } of lineApps) {
    if (v !== target) problems.push(`apps\t${file}\tversion: ${v} (want ${target})`)
  }

  if (!offline) {
    for (const { file, json } of manifests) {
      if (json.private !== true || !json.name?.startsWith('@tetherto/')) continue
      const status = await registryStatus(json.name)
      if (status === 200) problems.push(`private\t${file}\t${json.name} is private here but published on npm`)
      else if (status !== 404) problems.push(`private\t${file}\t${json.name}: registry answered ${status}, not 200/404`)
    }
  }

  for (const dir of lockDirs(cwd)) {
    const lock = path.join(cwd, dir, 'package-lock.json')
    const before = fs.readFileSync(lock, 'utf8')
    try {
      regenerateLock(dir, cwd)
      if (fs.readFileSync(lock, 'utf8') !== before) problems.push(`locks\t${dir}/package-lock.json\tout of sync with package.json`)
    } finally {
      fs.writeFileSync(lock, before) // a check never leaves the tree changed
    }
  }

  return { target, problems }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const offline = args.includes('--offline')
  const version = args.find((a) => !a.startsWith('--'))
  runChecks({ version, offline })
    .then(({ target, problems }) => {
      for (const p of problems) console.log(p)
      console.log(problems.length ? `release:check FAILED for ${target} (${problems.length} problem(s))` : `release:check OK for ${target}`)
      process.exit(problems.length ? 1 : 0)
    })
    .catch((err) => {
      console.error(err.message)
      process.exit(2)
    })
}
