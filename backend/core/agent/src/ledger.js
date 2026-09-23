import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sha256 } from './manifest.js'

/**
 * An append-only log of eval runs, where each entry carries the hash of the one before it.
 *
 * The chain does not prove a result is true — nothing here can, because the number is produced
 * by the same machine that wants a good number. What it proves is narrower and still worth
 * having: no entry was altered after it was written. Editing one run means recomputing every
 * entry after it, which in a file under version control is a diff touching every line rather
 * than one.
 *
 * NDJSON rather than JSON: a run appends a line instead of rewriting the file, a torn write
 * damages one entry instead of all of them, and a review shows one added line per run.
 *
 * Results are local by policy — this file and the run directory beside it are gitignored. The
 * chain is for the operator reading their own history, not for publication.
 */

const GENESIS = '0'.repeat(64)

/**
 * JSON with object keys sorted, at every depth.
 *
 * The hash must not depend on the order a field happened to be built in. Two entries with the
 * same content and different key order would otherwise hash differently, and a verify would
 * report tampering that never happened.
 */
export function canonical (value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    const body = Object.keys(value).sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')
    return `{${body}}`
  }
  return JSON.stringify(value ?? null)
}

/** The hash an entry should carry, computed over everything else in it. */
export function entryHash (entry) {
  const { entryHash: _ignored, ...body } = entry
  return sha256(canonical(body))
}

/**
 * Read the chain. Never throws: a corrupt line is reported, not fatal, because one bad append
 * must not make the rest of the history unreadable.
 *
 * @returns {{rows: object[], errors: string[]}}
 */
export function readChain (path) {
  if (!existsSync(path)) return { rows: [], errors: [] }
  const rows = []
  const errors = []
  const lines = readFileSync(path, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (!line.trim()) return
    try {
      rows.push(JSON.parse(line))
    } catch {
      errors.push(`line ${i + 1}: not valid JSON`)
    }
  })
  return { rows, errors }
}

/**
 * Check every link and every body hash.
 *
 * Reports each break rather than stopping at the first: a chain broken in two places is a
 * different story from one broken in one, and the operator needs to see both.
 *
 * @returns {{ok: boolean, errors: string[]}}
 */
export function verifyChain (rows = []) {
  const errors = []
  let prev = GENESIS
  for (const row of rows) {
    const where = `seq ${row.seq ?? '?'}`
    if (row.prevHash !== prev) errors.push(`${where}: prevHash does not match the entry before it`)
    if (row.entryHash !== entryHash(row)) errors.push(`${where}: body was edited after it was written`)
    prev = row.entryHash
  }
  return { ok: errors.length === 0, errors }
}

/**
 * Append one run. Returns the entry as written.
 *
 * The summary is what lands here; the full report with its transcripts lives beside it under
 * `runs/` and is referenced by hash. A ledger that carried every transcript would be unreadable
 * within a week, and the transcripts are the part that must not be summarised away.
 */
export function appendRun (path, { runId, manifest, summary, reportSha256 }) {
  const { rows } = readChain(path)
  const last = rows[rows.length - 1]
  const entry = {
    seq: (last?.seq ?? 0) + 1,
    prevHash: last?.entryHash ?? GENESIS,
    runId,
    manifest,
    summary,
    reportSha256
  }
  entry.entryHash = entryHash(entry)
  mkdirSync(dirname(path), { recursive: true })
  appendFileSync(path, `${JSON.stringify(entry)}\n`)
  return entry
}

/**
 * Write the full report and return where it went and what it hashes to.
 *
 * The hash is taken over the bytes actually written, not over the object, so what a later
 * verify reads is exactly what was measured.
 */
export function writeRunFile (dir, runId, report) {
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${runId}.json`)
  const body = `${JSON.stringify(report, null, 2)}\n`
  writeFileSync(path, body)
  return { path, sha256: sha256(body) }
}
