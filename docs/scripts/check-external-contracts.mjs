#!/usr/bin/env node
// Nightly breakage check for the partner-maintained Worker contracts listed in
// backend/workers/external-workers.json. A pinned contract can go unreachable from outside this
// repo (the partner moves/deletes the file, privates the repo, or force-pushes so GitHub
// garbage-collects the pinned SHA) and nothing else here would notice: the only code that fetches
// it is backend/workers/scripts/generate-catalogue.js, which only runs on a PR that touches a file
// in this repo. A partner-side change touches no such file.
//
//   npm run check:external-contracts
//
// Exit codes: 0 every entry is reachable, its repository URL resolves, and its contract is
// schema-valid; 1 one or more findings, including a broken run itself.
//
// Findings are not reimplemented here — `npm run generate:catalogue` already produces them in
// backend/workers/docs/catalogue.json's conformanceGaps array (source: 'external'), so this script
// runs that generator for real and reads its output back, the same way docs/scripts/regenerate-docs.mjs
// does. The one check added here is the repository URL itself (checkRepoUrls): the generator
// fetches only the raw contract file, so a repository that was renamed, transferred or deleted
// while GitHub's CDN still serves the pinned blob would otherwise go unnoticed.
//
// Deliberately scoped to breakage only (unreachable URL, private repo, GC'd SHA, schema
// violation, repository gone) — these are what generate:catalogue's existing fetch already surfaces
// as a 404/parse error, plus the repository check. Whether a pin is merely *stale* (the partner's
// file changed again after the pin, but the pin itself still resolves fine) is a separate question.
// Whether the registry is *complete* against the Workers examples/mvp-site pins is checked on every
// PR by test/external-workers-registry.test.mjs, because that can only break from inside this repo.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '../..')
const WORKERS_DIR = path.join(REPO_ROOT, 'backend/workers')
const MANIFEST_PATH = path.join(WORKERS_DIR, 'external-workers.json')
const CATALOGUE_JSON_PATH = path.join(WORKERS_DIR, 'docs/catalogue.json')
const REPORT_PATH = path.join(REPO_ROOT, 'external-check-report.md')

// Runs the generator for real (writes backend/workers/docs/catalogue.json and
// supported-workers.md, same as a normal `npm run generate:catalogue`) rather than importing it,
// matching regenerate-docs.mjs's existing convention of running it from the repo root, where the
// script is defined. A missing or malformed external-workers.json is fatal there by design (see
// the generator's own comments), so that failure surfaces here as a finding too, not a silent skip.
function runGenerateCatalogue () {
  const res = spawnSync('npm', ['run', 'generate:catalogue'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })
  if (res.error) throw new Error(`could not run \`npm run generate:catalogue\`: ${res.error.message}`)
  if (res.status !== 0) throw new Error(`\`npm run generate:catalogue\` exited ${res.status}; see its output above`)
}

function reachabilitySchemaFindings () {
  if (!existsSync(CATALOGUE_JSON_PATH)) {
    return [{ label: '(catalogue.json)', messages: ['generate:catalogue did not produce backend/workers/docs/catalogue.json'] }]
  }
  const catalogue = JSON.parse(readFileSync(CATALOGUE_JSON_PATH, 'utf8'))
  const gaps = Array.isArray(catalogue.conformanceGaps) ? catalogue.conformanceGaps : []
  return gaps
    .filter((gap) => gap.source === 'external')
    .map((gap) => ({ label: gap.contract, messages: gap.errors || [] }))
}

// Distinguishes "no external Workers" (a valid, supported empty array) from a broken manifest — a
// missing file or a non-array value is a configuration error and must not be read as "nothing to
// check": that would let an accidental deletion or shape change silently disable the nightly.
// generate-catalogue.js draws this same line for the same reason (see its own comments).
export function readManifest (manifestPath = MANIFEST_PATH) {
  if (!existsSync(manifestPath)) {
    throw new Error(`external-workers.json not found at ${manifestPath}`)
  }
  const raw = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (!Array.isArray(raw)) {
    throw new Error(`external-workers.json must be a JSON array, but parsed as ${raw === null ? 'null' : typeof raw}`)
  }
  return raw
}

const REPO_URL_TIMEOUT_MS = 10_000

const stripSlash = (url) => String(url).replace(/\/$/, '')

// One HEAD per repoUrl, following redirects. A non-2xx means the repository is gone or private;
// a redirect that lands on a different repository means it was renamed or transferred and the
// registry should follow. `fetchImpl` is injectable so the test never touches the network.
export async function checkRepoUrls (manifest, { fetchImpl = fetch, timeoutMs = REPO_URL_TIMEOUT_MS } = {}) {
  const findings = []
  for (const entry of manifest) {
    const label = `${entry.name} (${entry.repoUrl})`
    try {
      const res = await fetchImpl(entry.repoUrl, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) })
      if (!res.ok) {
        findings.push({ label, messages: [`repoUrl returned HTTP ${res.status}; the repository may have been deleted or made private`] })
      } else if (res.redirected && stripSlash(res.url) !== stripSlash(entry.repoUrl)) {
        findings.push({ label, messages: [`repoUrl redirects to ${res.url}; update repoUrl in backend/workers/external-workers.json`] })
      }
    } catch (err) {
      const reason = err?.name === 'TimeoutError' ? `timed out after ${timeoutMs / 1000}s` : err?.message
      findings.push({ label, messages: [`repoUrl could not be reached (${reason})`] })
    }
  }
  return findings
}

export function renderReport (findings) {
  if (findings.length === 0) {
    return '# External contract check\n\nEvery partner-maintained entry is reachable, its repository URL resolves, and its contract is schema-valid.\n'
  }
  const lines = ['# External contract check', '', 'Findings:', '']
  for (const { label, messages } of findings) {
    lines.push(`- **${label}**`)
    for (const message of messages) lines.push(`  - ${message}`)
  }
  return lines.join('\n') + '\n'
}

async function main () {
  let findings
  try {
    const manifest = readManifest()
    if (manifest.length === 0) {
      console.log('[check-external-contracts] external-workers.json has no entries; nothing to check.')
      process.exit(0)
    }

    runGenerateCatalogue()
    findings = [...reachabilitySchemaFindings(), ...await checkRepoUrls(manifest)]
  } catch (err) {
    findings = [{ label: '(check-external-contracts)', messages: [err.message] }]
  }

  writeFileSync(REPORT_PATH, renderReport(findings))

  if (findings.length === 0) {
    console.log('[check-external-contracts] every entry is reachable, its repository URL resolves, and its contract is schema-valid.')
    process.exit(0)
  }

  console.error(`[check-external-contracts] ${findings.length} finding(s):`)
  for (const { label, messages } of findings) {
    console.error(`  ${label}`)
    for (const message of messages) console.error(`    - ${message}`)
  }
  console.error(`[check-external-contracts] report written to ${path.relative(REPO_ROOT, REPORT_PATH)}`)
  process.exit(1)
}

// Only run when invoked directly, so a test file can import the pure helpers above without
// spawning the generator as a side effect — same guard as sync-ui-registry.mjs.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('[check-external-contracts] failed to run:', err)
    process.exit(1)
  })
}
