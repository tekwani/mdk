#!/usr/bin/env node
// Copies each assembled skill from dist/skills/ into the target project's
// client skills directory.
//
//   node src/install.mjs [--client cursor|claude|all] [--target <project-root>]
//
// The project root defaults to the enclosing git repo of cwd, so this works
// both inside the monorepo and when consumed from npm.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url))
const PKG_DIR = path.dirname(SRC_DIR)
const DIST = path.join(PKG_DIR, 'dist', 'skills')

const CLIENT_DIRS = {
  cursor: ['.cursor', 'skills'],
  claude: ['.claude', 'skills']
}

function fail (msg) {
  console.error(`ERR_INSTALL: ${msg}`)
  process.exit(1)
}

function parseArgs (argv) {
  const args = { client: 'all', target: null }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--client') args.client = argv[++i]
    else if (argv[i] === '--target') args.target = argv[++i]
  }
  return args
}

function findProjectRoot (startDir) {
  let dir = startDir
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return startDir
    dir = parent
  }
}

const { client, target } = parseArgs(process.argv.slice(2))
const clients = client === 'all' ? Object.keys(CLIENT_DIRS) : [client]
if (!clients.every((c) => CLIENT_DIRS[c])) fail(`unknown client '${client}' — use cursor | claude | all`)

if (!fs.existsSync(DIST)) fail(`nothing assembled at ${DIST} — run \`node src/assemble.mjs\` first`)
const skills = fs.readdirSync(DIST, { withFileTypes: true }).filter((e) => e.isDirectory())
if (!skills.length) fail(`no skills found in ${DIST}`)

const projectRoot = target ? path.resolve(process.cwd(), target) : findProjectRoot(process.cwd())

for (const c of clients) {
  const targetDir = path.join(projectRoot, ...CLIENT_DIRS[c])
  fs.mkdirSync(targetDir, { recursive: true })
  for (const skill of skills) {
    fs.rmSync(path.join(targetDir, skill.name), { recursive: true, force: true })
    fs.cpSync(path.join(DIST, skill.name), path.join(targetDir, skill.name), { recursive: true })
  }
  console.log(`installed ${skills.length} skill(s) -> ${path.relative(process.cwd(), targetDir) || '.'}`)
}

console.log('done — installed skill dirs are generated artifacts; keep them gitignored')
