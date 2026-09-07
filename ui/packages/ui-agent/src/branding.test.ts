/**
 * Keeps the product name renameable from one place.
 *
 * "Co-pilot" is a placeholder pending a naming decision, so no component may
 * hardcode it — otherwise the rename becomes a hunt through the tree and some
 * `aria-label` gets missed.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { AGENT_LABELS, AGENT_NAME } from './branding'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)))

/** Where the name legitimately appears: the constant itself, and this test. */
const ALLOWED = new Set(['branding.ts', 'branding.test.ts'])

/**
 * Filenames and identifiers are a separate, mechanical rename and are not what
 * this guards — `co-pilot.tsx` exporting `CoPilot` is fine, and so is naming
 * either in a doc comment. Only strings that can reach the screen count, so
 * comments are stripped first and backticks are left out of the quote set
 * (JSDoc code spans use them).
 */
const NAME_IN_STRING = /['"][^'"\n]*[Cc]o-?[Pp]ilot[^'"\n]*['"]/

const COMMENTS = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g

/** Module specifiers follow the filenames, which are not part of this rename. */
const MODULE_SPECIFIERS = /\bfrom\s*['"][^'"]+['"]|\bimport\(\s*['"][^'"]+['"]\s*\)/g

function runtimeSource(file: string): string {
  return readFileSync(file, 'utf8').replaceAll(COMMENTS, '').replaceAll(MODULE_SPECIFIERS, '')
}

function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === 'fixtures') continue
      found.push(...sourceFiles(full))
    } else if (/\.tsx?$/.test(name) && !ALLOWED.has(relative(SRC, full))) {
      found.push(full)
    }
  }
  return found
}

describe('branding', () => {
  it('is the single source of the display name', () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => NAME_IN_STRING.test(runtimeSource(file)))
      .map((file) => relative(SRC, file))

    expect(offenders, 'these files hardcode the product name — use AGENT_LABELS instead').toEqual(
      [],
    )
  })

  it('derives every accessible name from AGENT_NAME', () => {
    const lower = AGENT_NAME.toLowerCase()

    expect(AGENT_LABELS.name).toBe(AGENT_NAME)
    expect(AGENT_LABELS.open).toContain(lower)
    expect(AGENT_LABELS.close).toContain(lower)
    expect(AGENT_LABELS.composer).toContain(lower)
  })

  it('keeps the name out of the CSS class prefix and the storage key', async () => {
    // Both are compatibility surfaces — renaming the product must not restyle
    // consumers' overrides or orphan their stored history.
    const { CONVERSATION_STORAGE_KEY } = await import('./core/conversation-store')
    const styles = readFileSync(resolve(SRC, 'styles.scss'), 'utf8')

    expect(CONVERSATION_STORAGE_KEY).not.toMatch(/pilot/i)
    expect(styles).not.toMatch(/pilot/i)
  })
})
