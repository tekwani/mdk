#!/usr/bin/env node
// Copy-assembler: reads sources.map.json, copies source-of-truth artifacts
// into dist/skills/, injects {{MDK_VERSION}}, and enforces the layout and
// SKILL.md line budget. Nothing in dist/ is hand-edited.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url))
const PKG_DIR = path.dirname(SRC_DIR)
const REPO_ROOT = path.resolve(PKG_DIR, '..', '..')
const DIST = path.join(PKG_DIR, 'dist', 'skills')

const SKILL_MD_MAX_LINES = 500

// Flat sibling skills — clients discover <skills-dir>/<name>/SKILL.md one
// level deep, so nested sub-skills would never trigger.
const REQUIRED = [
  'mdk/SKILL.md',
  'mdk/references/architecture.md',
  'mdk/references/package-index.md',
  'mdk/references/protocol.md',
  'mdk/references/glossary.md',
  'mdk/references/mdk-contract.schema.json',
  'mdk-app-plugin/SKILL.md',
  'mdk-ui-component/SKILL.md',
  'mdk-deployment/SKILL.md',
  'mdk-device-worker/SKILL.md',
  'mdk-device-worker/references/mdk-contract.schema.json',
  'mdk-device-worker/references/contract-authoring.md',
  'mdk-device-worker/references/worker-base-api.md',
  'mdk-device-worker/references/device-families.md',
  'mdk-device-worker/references/local-testing.md',
  'mdk-device-worker/assets/mdk-contract.template.json',
  'mdk-device-worker/assets/worker-template/plugin/mdk-contract.json',
  'mdk-device-worker/assets/worker-template/plugin/index.js',
  'mdk-device-worker/assets/worker-template/mock/server.js',
  'mdk-device-worker/assets/worker-template/smoke.config.js',
  'mdk-device-worker/scripts/validate-contract.mjs',
  'mdk-device-worker/scripts/worker-smoke.mjs'
]

function fail (msg) {
  console.error(`ERR_ASSEMBLE: ${msg}`)
  process.exit(1)
}

function copyEntry (entry) {
  const src = path.resolve(REPO_ROOT, entry.source)
  const dest = path.resolve(DIST, entry.dest)
  if (!fs.existsSync(src)) fail(`source missing: ${entry.source}`)

  const excluded = new Set(entry.exclude || [])
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (from) => !excluded.has(path.basename(from))
  })

  const stat = fs.statSync(src)
  console.log(`  copied ${entry.source} -> dist/skills/${entry.dest}${stat.isDirectory() ? '/' : ''}`)
}

function walk (dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

function injectVersion (files, version) {
  let count = 0
  for (const file of files) {
    if (!file.endsWith('.md')) continue
    const body = fs.readFileSync(file, 'utf8')
    if (!body.includes('{{MDK_VERSION}}')) continue
    fs.writeFileSync(file, body.replaceAll('{{MDK_VERSION}}', version))
    count++
  }
  console.log(`  injected mdk_version ${version} into ${count} file(s)`)
}

function check (files) {
  for (const rel of REQUIRED) {
    if (!fs.existsSync(path.join(DIST, rel))) fail(`required artifact missing after assembly: ${rel}`)
  }
  for (const file of files) {
    if (path.basename(file) !== 'SKILL.md') continue
    const lines = fs.readFileSync(file, 'utf8').split('\n').length
    if (lines > SKILL_MD_MAX_LINES) {
      fail(`${path.relative(DIST, file)} is ${lines} lines (budget ${SKILL_MD_MAX_LINES}) — move content to references/`)
    }
    console.log(`  ${path.relative(DIST, file)}: ${lines} lines (budget ${SKILL_MD_MAX_LINES})`)
  }
}

const map = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'sources.map.json'), 'utf8'))
const mdkVersion = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version

console.log(`assembling MDK Developer Skill suite (mdk ${mdkVersion}) -> ${path.relative(REPO_ROOT, DIST)}`)
fs.rmSync(DIST, { recursive: true, force: true })
fs.mkdirSync(DIST, { recursive: true })

for (const entry of map.entries) copyEntry(entry)

const files = walk(DIST)
injectVersion(files, mdkVersion)
check(files)

console.log(`assembled ${files.length} files`)
