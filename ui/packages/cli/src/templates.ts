import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type TemplateMeta = {
  /** Stable template id, used as the directory name and CLI flag value. */
  id: string
  /** Short, human-friendly name (one to three words). */
  label: string
  /** One-line description shown in `--list-templates`. */
  description: string
}

export type ResolvedTemplate = {
  meta: TemplateMeta
  /** Absolute path to the template directory. */
  path: string
}

/**
 * Where a template's source tree lives in the DEV/source checkout:
 *  - `example` — a runnable app under the repo-root `examples/` dir (the
 *    `mdk-ui-shell` template is a real Vite app you can `npm run dev` in place).
 *  - `bundled` — a scaffold-only tree under `packages/cli/templates/` (e.g.
 *    `starter`), never runnable on its own.
 *
 * In the PUBLISHED CLI both kinds are flattened under `dist/templates/<id>` by
 * `scripts/copy-templates.mjs`, so `resolveTemplateDir` checks there first.
 */
type TemplateSource = { kind: 'example' | 'bundled'; dir: string }

type TemplateEntry = Omit<TemplateMeta, 'id'> & { source: TemplateSource }

/**
 * The templates the CLI can scaffold from. Registry (rather than filesystem
 * discovery) because templates now span two source roots — the runnable
 * `examples/` app and the bundled `packages/cli/templates/` scaffolds — that
 * only reunite under `dist/templates/` once published.
 */
const TEMPLATES: Record<string, TemplateEntry> = {
  'mdk-ui-shell': {
    label: 'MDK UI Shell',
    description:
      'Bare application backbone: Google OAuth sign-in, the token lifecycle, and the app frame (header + user menu + sidebar) around a Home landing page. Ships with no feature pages — add them with `mdk-ui add page` (the reference pages like Dashboard, Alerts and Pool Manager are managed pages the CLI wires in on demand).',
    source: { kind: 'example', dir: 'mdk-ui-shell-template' },
  },
  starter: {
    label: 'Starter',
    description: 'Minimal Vite + React + MDK app with routing wired for `mdk-ui add page`.',
    source: { kind: 'bundled', dir: 'starter' },
  },
}

const here = dirname(fileURLToPath(import.meta.url))

/**
 * Resolve a template's directory in both the published CLI (`dist/templates/`)
 * and the dev/source checkout (`examples/` for runnable templates,
 * `packages/cli/templates/` for bundled ones).
 */
const resolveTemplateDir = (id: string, source: TemplateSource): string => {
  const candidates: string[] = [
    // Published CLI: copy-templates flattens every template under dist/templates/.
    join(here, 'templates', source.dir),
  ]

  if (source.kind === 'bundled') {
    // Dev/src: packages/cli/templates/<dir> (next to src/).
    candidates.push(join(here, '..', 'templates', source.dir))
  } else {
    // Dev/src: walk up to the repo root that holds examples/<dir>.
    let dir = here
    while (dir !== dirname(dir)) {
      candidates.push(join(dir, 'examples', source.dir))
      dir = dirname(dir)
    }
  }

  const found = candidates.find((p) => existsSync(p))
  if (!found) {
    throw new Error(
      `Could not locate the "${id}" template directory. Searched: ${candidates.join(', ')}`,
    )
  }
  return found
}

export const listTemplates = (): TemplateMeta[] =>
  Object.entries(TEMPLATES)
    .map(([id, { label, description }]) => ({ id, label, description }))
    .sort((a, b) => a.id.localeCompare(b.id))

export const findTemplate = (id: string): ResolvedTemplate => {
  const entry = TEMPLATES[id]
  if (!entry) {
    const available = Object.keys(TEMPLATES).sort().join(', ') || '(none)'
    throw new Error(`Template "${id}" not found. Available: ${available}`)
  }
  return {
    meta: { id, label: entry.label, description: entry.description },
    path: resolveTemplateDir(id, entry.source),
  }
}
