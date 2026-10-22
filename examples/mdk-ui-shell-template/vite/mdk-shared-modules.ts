import type { Plugin, ResolvedConfig } from 'vite'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import { MDK_APP_SHARED_MODULES } from '@tetherto/mdk-ui-foundation/app-shared-modules'

/**
 * Lends this shell's React, router, query client and MDK packages to the
 * installed apps' UIs it loads at runtime.
 *
 * An app's `ui/index.js` is built on its own and imports those packages by bare
 * specifier (`import { useState } from 'react'`). For it to render inside this
 * shell it must get *this* shell's instances — a second React breaks hooks, a
 * second adapter cannot see `MdkProvider`. So for every specifier in
 * `MDK_APP_SHARED_MODULES` this plugin:
 *
 * 1. Builds a small module re-exporting it, inside the shell's own module graph,
 *    so it is the very instance the shell runs: a separate entry chunk in a
 *    production build, a virtual module in dev.
 * 2. Writes an import map at the top of index.html, mapping the bare specifier to
 *    that module's URL. The browser applies it to every module it loads after —
 *    including the apps', whatever origin they come from.
 *
 * Cost: a shared package is kept whole in the build (an app may use any of its
 * exports), so the devkit is not tree-shaken here.
 */

const VIRTUAL_PREFIX = 'virtual:mdk-shared/'
const RESOLVED_PREFIX = '\0mdk-shared:'

// CommonJS packages: `export *` from one yields nothing once bundled, so their
// export names are read here and re-exported one by one.
const COMMONJS = new Set(['react', 'react/jsx-runtime', 'react-dom'])

const IDENTIFIER = /^[A-Z_$][\w$]*$/i

/** Build entry name for a specifier: `@tanstack/react-query` → `mdk-shared/tanstack-react-query`. */
const entryName = (specifier: string): string =>
  `mdk-shared/${specifier.replace(/^@/, '').replace(/[^\w.-]+/g, '-')}`

const reExport = (specifier: string, require: NodeJS.Require): string => {
  if (!COMMONJS.has(specifier)) return `export * from '${specifier}'\n`

  const names = Object.keys(require(specifier) as object).filter(
    (name) => name !== 'default' && IDENTIFIER.test(name),
  )
  return [
    `import mod from '${specifier}'`,
    'export default mod',
    `export const { ${names.join(', ')} } = mod`,
    '',
  ].join('\n')
}

export function mdkSharedModules(): Plugin {
  let config: ResolvedConfig
  let require: NodeJS.Require

  return {
    name: 'mdk-shared-modules',

    config(userConfig, { command }) {
      if (command !== 'build') {
        // Pre-bundle the third-party ones up front: discovered later (when the
        // first app imports react-dom, say) they would re-optimise mid-session
        // and reload the page.
        return {
          optimizeDeps: {
            include: MDK_APP_SHARED_MODULES.filter((s) => !s.startsWith('@tetherto/')),
          },
        }
      }

      const root = resolve(userConfig.root ?? process.cwd())
      const input = userConfig.build?.rollupOptions?.input
      const pages = typeof input === 'string'
        ? { index: input }
        : Array.isArray(input)
          ? Object.fromEntries(input.map((file, i) => [`page-${i}`, file]))
          : (input ?? { index: resolve(root, 'index.html') })

      return {
        build: {
          rollupOptions: {
            input: {
              ...pages,
              ...Object.fromEntries(
                MDK_APP_SHARED_MODULES.map((s) => [entryName(s), `${VIRTUAL_PREFIX}${s}`]),
              ),
            },
            // Keep each shared entry's exports: nothing in the shell imports
            // them, the apps (unknown at build time) do.
            preserveEntrySignatures: 'exports-only',
          },
        },
      }
    },

    configResolved(resolved) {
      config = resolved
      require = createRequire(resolve(resolved.root, 'package.json'))
    },

    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) return `${RESOLVED_PREFIX}${id.slice(VIRTUAL_PREFIX.length)}`
      if (id.startsWith(RESOLVED_PREFIX)) return id
      return undefined
    },

    load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return undefined
      return reExport(id.slice(RESOLVED_PREFIX.length), require)
    },

    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const imports: Record<string, string> = {}

        for (const specifier of MDK_APP_SHARED_MODULES) {
          if (ctx.server) {
            // Vite serves a `\0` virtual module at /@id/__x00__<id>.
            imports[specifier] = `${config.base}@id/__x00__${RESOLVED_PREFIX.slice(1)}${specifier}`
            continue
          }
          const chunk = Object.values(ctx.bundle ?? {}).find(
            (out) => out.type === 'chunk' && out.isEntry && out.facadeModuleId === `${RESOLVED_PREFIX}${specifier}`,
          )
          if (!chunk) throw new Error(`[mdk-shared-modules] no chunk was emitted for "${specifier}"`)
          imports[specifier] = `${config.base}${chunk.fileName}`
        }

        // First in <head>: an import map only applies to module loads that
        // start after it, and Vite's own client scripts are modules too.
        return [
          {
            tag: 'script',
            attrs: { type: 'importmap' },
            children: JSON.stringify({ imports }, null, 2),
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  }
}
