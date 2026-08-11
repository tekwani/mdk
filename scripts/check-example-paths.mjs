#!/usr/bin/env node
'use strict'

// Verifies every `examples/...` path named in tracked Markdown (prose or
// fenced code, not just Markdown links) resolves to a real file or directory.
// See docs/reference/maintainers/linters.md for policy and rationale.

import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const REPO_ROOT = process.cwd()
const CONFIG_PATH = path.join(REPO_ROOT, 'example-paths.config.json')

const CANDIDATE_RE = /(?<![\w/.-])examples\/[A-Za-z0-9_][A-Za-z0-9_./-]*/g
const TRAILING_PUNCT_RE = /[.,)`:;*]+$/
const PLACEHOLDER_NEXT_CHARS = new Set(['<', '>', '*', '{', '}', '…'])

function loadConfig () {
  const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  const skipFiles = raw.skipFiles || []
  const skipPaths = raw.skipPaths || []
  const notes = raw._skip_notes || {}

  const missingNotes = [...skipFiles, ...skipPaths].filter((entry) => !notes[entry])
  if (missingNotes.length > 0) {
    throw new Error(
      `example-paths.config.json: every skipFiles/skipPaths entry needs a _skip_notes entry ` +
      `(a silent skip with no note is a false negative waiting to happen). Missing notes for: ${missingNotes.join(', ')}`
    )
  }

  return {
    skipFiles: skipFiles.map(globToRegExp),
    skipPaths
  }
}

function globToRegExp (glob) {
  let re = '^'
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++
        if (glob[i + 1] === '/') {
          i++
          re += '(?:.*/)?'
        } else {
          re += '.*'
        }
      } else {
        re += '[^/]*'
      }
    } else if ('.+^${}()|[]\\'.includes(c)) {
      re += '\\' + c
    } else {
      re += c
    }
  }
  re += '$'
  return new RegExp(re)
}

function isSkippedFile (relFile, skipFiles) {
  return skipFiles.some((re) => re.test(relFile))
}

function isSkippedPath (candidate, skipPaths) {
  return skipPaths.some((p) => candidate === p || candidate.startsWith(p + '/'))
}

function listTrackedMarkdown () {
  const out = execFileSync('git', ['ls-files', '*.md'], { cwd: REPO_ROOT, encoding: 'utf8' })
  return out.split('\n').filter(Boolean)
}

function extractCandidates (line) {
  const candidates = []
  for (const match of line.matchAll(CANDIDATE_RE)) {
    const raw = match[0]
    const end = match.index + raw.length
    const nextChar = line[end]
    if (nextChar !== undefined && PLACEHOLDER_NEXT_CHARS.has(nextChar)) continue
    const trimmed = raw.replace(TRAILING_PUNCT_RE, '')
    if (!trimmed) continue
    candidates.push({ candidate: trimmed, column: match.index + 1 })
  }
  return candidates
}

function resolves (candidate, relFile) {
  const relativeToFile = path.join(path.dirname(relFile), candidate)
  if (existsSync(path.join(REPO_ROOT, relativeToFile))) return true
  if (existsSync(path.join(REPO_ROOT, candidate))) return true
  return false
}

function main () {
  const config = loadConfig()
  const files = listTrackedMarkdown()
  const findingsByFile = new Map()

  for (const relFile of files) {
    if (isSkippedFile(relFile, config.skipFiles)) continue

    const content = readFileSync(path.join(REPO_ROOT, relFile), 'utf8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      for (const { candidate } of extractCandidates(lines[i])) {
        if (isSkippedPath(candidate, config.skipPaths)) continue
        if (resolves(candidate, relFile)) continue

        if (!findingsByFile.has(relFile)) findingsByFile.set(relFile, [])
        findingsByFile.get(relFile).push({ line: i + 1, candidate })
      }
    }
  }

  if (findingsByFile.size === 0) {
    console.log('check:example-paths — no missing example paths found.')
    return
  }

  console.log('check:example-paths — missing example paths found:\n')
  for (const [relFile, findings] of findingsByFile) {
    console.log(relFile)
    for (const { line, candidate } of findings) {
      console.log(`  ${line}: ${candidate}`)
    }
    console.log('')
  }

  const total = [...findingsByFile.values()].reduce((sum, f) => sum + f.length, 0)
  console.log(`${total} missing example path(s) across ${findingsByFile.size} file(s).`)
  process.exitCode = 1
}

main()
