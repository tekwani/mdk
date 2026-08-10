#!/usr/bin/env node
'use strict'

// Thin wrapper around linkinator: scopes the crawl to git-tracked Markdown only,
// not a raw filesystem glob. A `**/*.md` glob also picks up gitignored files
// physically sitting in a maintainer's working directory (personal scratch notes,
// local checklists) — files CI never sees, since its checkout starts clean.
// Checking them locally produces false positives (and false SFW-blocked hosts)
// that don't reflect anything in the actual doc corpus.
// See docs/reference/maintainers/linters.md for policy and rationale.

import { execFileSync, spawnSync } from 'node:child_process'

const REPO_ROOT = process.cwd()

const files = execFileSync('git', ['ls-files', '*.md'], { cwd: REPO_ROOT, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)

if (files.length === 0) {
  console.error('No tracked Markdown files found.')
  process.exit(1)
}

const result = spawnSync(
  'npx',
  ['--yes', 'linkinator@^7.6.0', '--config', 'linkinator.config.json', ...files],
  { cwd: REPO_ROOT, stdio: 'inherit' }
)

process.exit(result.status ?? 1)
