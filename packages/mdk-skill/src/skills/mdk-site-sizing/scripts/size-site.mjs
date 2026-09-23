#!/usr/bin/env node
// Size a site from facts JSON or a plain description. Prints JSON (default)
// or Markdown (--md). Never invents numbers: lookup is envelope-only.
//
//   node size-site.mjs facts.json
//   node size-site.mjs --description "eighty Whatsminer M56S on a site-server"
//   node size-site.mjs --envelope ../references/envelope.json facts.json --md

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSiteDescription, sizeSite, renderRecommendation } from './lib.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_ENVELOPE = path.resolve(SCRIPT_DIR, '..', 'references', 'envelope.json')

const args = process.argv.slice(2)
let envelopePath = DEFAULT_ENVELOPE
let description = null
let factsPath = null
let asMd = false

for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--md') asMd = true
  else if (a === '--envelope') envelopePath = args[++i]
  else if (a === '--description') description = args[++i]
  else if (a.startsWith('-')) {
    console.error(`unknown flag ${a}`)
    process.exit(2)
  } else factsPath = a
}

if (!description && !factsPath) {
  console.error('usage: node size-site.mjs [--envelope <path>] [--md] <facts.json | --description "...">')
  process.exit(2)
}

const envelope = JSON.parse(fs.readFileSync(envelopePath, 'utf8'))
const facts = description
  ? parseSiteDescription(description)
  : JSON.parse(fs.readFileSync(factsPath, 'utf8'))
const rec = sizeSite(facts, envelope)
process.stdout.write(asMd ? renderRecommendation(rec) : JSON.stringify({ facts, recommendation: rec }, null, 2) + '\n')
