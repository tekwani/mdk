import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { findTemplate, listTemplates } from './templates.js'

describe('listTemplates', () => {
  it('returns the registered templates', () => {
    const ids = listTemplates().map((t) => t.id)
    expect(ids).toContain('mdk-ui-shell')
    expect(ids).toContain('starter')
  })

  it('every template has valid id, label, and description', () => {
    for (const t of listTemplates()) {
      expect(typeof t.id).toBe('string')
      expect(t.id.length).toBeGreaterThan(0)
      expect(typeof t.label).toBe('string')
      expect(t.label.length).toBeGreaterThan(0)
      expect(typeof t.description).toBe('string')
      expect(t.description.length).toBeGreaterThan(0)
    }
  })

  it('is sorted by id and stable across calls', () => {
    const first = listTemplates().map((t) => t.id)
    const second = listTemplates().map((t) => t.id)
    expect(second).toEqual(first)
    expect(first).toEqual([...first].sort((a, b) => a.localeCompare(b)))
  })
})

describe('findTemplate', () => {
  it('resolves the bundled "starter" template to a dir on disk', () => {
    const template = findTemplate('starter')
    expect(template.meta.id).toBe('starter')
    expect(existsSync(template.path)).toBe(true)
  })

  it('resolves the runnable "mdk-ui-shell" example template to a dir on disk', () => {
    const template = findTemplate('mdk-ui-shell')
    expect(template.meta.id).toBe('mdk-ui-shell')
    expect(existsSync(template.path)).toBe(true)
    // The shell is a real runnable app: a package.json (not a .tpl) and its
    // on-demand demo pages live under _managed/.
    expect(existsSync(join(template.path, 'package.json'))).toBe(true)
    expect(existsSync(join(template.path, '_managed', 'pages'))).toBe(true)
  })

  it('every listed template resolves via findTemplate', () => {
    for (const meta of listTemplates()) {
      const resolved = findTemplate(meta.id)
      expect(resolved.meta.id).toBe(meta.id)
      expect(existsSync(resolved.path)).toBe(true)
    }
  })

  it('throws with "not found" message for unknown template id', () => {
    expect(() => findTemplate('nonexistent-template-xyz')).toThrow(/not found/)
  })
})
