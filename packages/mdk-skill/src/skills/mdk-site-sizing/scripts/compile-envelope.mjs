#!/usr/bin/env node
// Compile measured (or fixture) capacity profiles into references/envelope.json.
//
//   node compile-envelope.mjs
//   node compile-envelope.mjs --from ../../../../../backend/tests/benchmark/results
//   node compile-envelope.mjs --from ./eval/profiles --out ../references/envelope.json

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileEnvelope } from './lib.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = path.resolve(SCRIPT_DIR, '..')
const DEFAULT_FROM = path.join(SKILL_DIR, 'eval', 'profiles')
const DEFAULT_OUT = path.join(SKILL_DIR, 'references', 'envelope.json')

const args = process.argv.slice(2)
let fromDir = DEFAULT_FROM
let outPath = DEFAULT_OUT
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--from') fromDir = path.resolve(args[++i])
  else if (args[i] === '--out') outPath = path.resolve(args[++i])
  else {
    console.error(`unknown flag ${args[i]}`)
    process.exit(2)
  }
}

if (!fs.existsSync(fromDir)) {
  console.error(`compile-envelope: source dir missing: ${fromDir}`)
  process.exit(1)
}

const files = fs.readdirSync(fromDir).filter((n) => n.endsWith('.json')).sort()
if (!files.length) {
  console.error(`compile-envelope: no .json profiles in ${fromDir}`)
  process.exit(1)
}

const raw = files.map((n) => JSON.parse(fs.readFileSync(path.join(fromDir, n), 'utf8')))
const envelope = compileEnvelope(raw, { compiledAt: '1970-01-01T00:00:00.000Z' })
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(envelope, null, 2) + '\n')
console.error(`compiled ${envelope.profiles.length} profile(s) -> ${outPath} (${envelope.provenance.kind})`)
