#!/usr/bin/env node
// Held-out bar: parse each site description, size it, match the measured envelope.
// Exit 0 only when every case matches. This is the skill's acceptance test.
//
//   node eval-held-out.mjs
//   node eval-held-out.mjs --held-out ../eval/held-out.json --envelope ../references/envelope.json

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSiteDescription, sizeSite, matchRecommendation } from './lib.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = path.resolve(SCRIPT_DIR, '..')

const args = process.argv.slice(2)
let heldOutPath = path.join(SKILL_DIR, 'eval', 'held-out.json')
let envelopePath = path.join(SKILL_DIR, 'references', 'envelope.json')
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--held-out') heldOutPath = path.resolve(args[++i])
  else if (args[i] === '--envelope') envelopePath = path.resolve(args[++i])
  else {
    console.error(`unknown flag ${args[i]}`)
    process.exit(2)
  }
}

const heldOut = JSON.parse(fs.readFileSync(heldOutPath, 'utf8'))
const envelope = JSON.parse(fs.readFileSync(envelopePath, 'utf8'))
const cases = heldOut.cases || []

let failed = 0
for (const c of cases) {
  const facts = parseSiteDescription(c.description)
  const rec = sizeSite(facts, envelope)
  const result = matchRecommendation(rec, c.expected)
  if (result.ok) {
    console.log(`PASS  ${c.id}`)
  } else {
    failed++
    console.log(`FAIL  ${c.id}`)
    for (const e of result.errors) console.log(`      ${e}`)
    console.log(`      facts: ${JSON.stringify({ devices: facts.devices, deviceCount: facts.deviceCount, host: facts.host })}`)
    console.log(`      rec:   ${JSON.stringify({ status: rec.status, tier: rec.tier, workerCount: rec.workerCount, matchingProfileId: rec.matchingProfileId, rssSumMiB: rec.rssSumMiB, supportedUpTo: rec.envelope?.supportedUpTo })}`)
  }
}

const n = cases.length
console.log(`${n - failed}/${n} held-out descriptions match the measured envelope`)
process.exit(failed ? 1 : 0)
