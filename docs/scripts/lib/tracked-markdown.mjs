'use strict'

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// Shared by every docs-QA checker that needs "every git-tracked .md file":
// tracked files only, so a local run matches what a clean CI checkout sees
// (a gitignored scratch file or stray node_modules markdown never appears).
// Untracked-but-not-ignored files are included and deleted-but-unstaged files
// are dropped, so an uncommitted rename is checked as it will land; on a clean
// checkout both adjustments are no-ops.
export function listTrackedMarkdown (cwd = process.cwd()) {
  const out = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '--deduplicate', '*.md'],
    { cwd, encoding: 'utf8' }
  )
  return out.split('\n').filter((f) => f && fs.existsSync(path.join(cwd, f)))
}
