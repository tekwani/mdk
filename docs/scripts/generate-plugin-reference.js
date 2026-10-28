'use strict'

// Generates the shipped-app route tables in docs/reference/supported-apps.md.
//
// Source of truth: each plugin's mdk-plugin.json under backend/apps/* — the optional
// standalone plugins offered via `mdk onboard` (agent, demo).
// Per route, the table is derived from http.method/http.path (or a flat method/path) and
// description — so the published route list cannot drift from the manifests.
//
// The manifest "auth" and "permissions" fields are deliberately NOT published: no code reads them,
// so printing them as Required/Optional advertises protection the Gateway does not apply.
//
// Nothing here auto-registers: every plugin loads only when a stack names it.
//
// Output (regenerate with `npm run generate:plugin-reference`):
//   - the region between <!-- BEGIN GENERATED: supported-apps ... --> and
//     <!-- END GENERATED: supported-apps --> in docs/reference/supported-apps.md
//
// Usage: node docs/scripts/generate-plugin-reference.js

const fs = require('fs')
const path = require('path')

const REPO = path.resolve(__dirname, '../..')
const MD_OUT = path.join(REPO, 'docs/reference/supported-apps.md')
const BEGIN = '<!-- BEGIN GENERATED: supported-apps'
const END = '<!-- END GENERATED: supported-apps -->'

// Rendered/serialized in this order.
const BUCKET_ORDER = ['Optional apps']

const ROOTS = [
  { label: 'backend/apps', dir: path.join(REPO, 'backend/apps'), kind: 'standalone' }
]

function bucketOf () {
  return 'Optional apps'
}

// Find every immediate subdirectory of a root that ships an mdk-plugin.json.
function findPlugins (root) {
  if (!fs.existsSync(root.dir)) return []
  const out = []
  for (const entry of fs.readdirSync(root.dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const manifestPath = path.join(root.dir, entry.name, 'mdk-plugin.json')
    if (!fs.existsSync(manifestPath)) continue
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    const routes = (Array.isArray(manifest.routes) ? manifest.routes : []).map((route) => ({
      method: (route.http && route.http.method) || route.method || '',
      path: (route.http && route.http.path) || route.path || '',
      description: route.description || ''
    }))
    out.push({ dir: entry.name, name: manifest.name || entry.name, root: root.label, bucket: bucketOf(), routes })
  }
  return out
}

function collect () {
  const plugins = ROOTS.flatMap(findPlugins)
  // Group order = BUCKET_ORDER, then dir within a bucket.
  return plugins.sort((a, b) =>
    (BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket)) || a.dir.localeCompare(b.dir))
}

function cell (value) {
  return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|')
}

// House style: table cells carry no terminal full stop. Manifest descriptions are written as
// sentences, so drop only the final one — internal stops (multi-sentence descriptions, and
// dotted identifiers like telemetry.pull) are left alone.
function describe (value) {
  return cell(value).trimEnd().replace(/\.$/, '')
}

function pluginSection (plugin) {
  let out = `#### \`${plugin.dir}\`\n\n`
  out += '| Method | Path | Description |\n'
  out += '| --- | --- | --- |\n'
  for (const route of plugin.routes) {
    out += `| \`${cell(route.method)}\` | \`${cell(route.path)}\` | ${describe(route.description)} |\n`
  }
  return out
}

function renderMarkdown (plugins) {
  const blocks = []
  for (const bucket of BUCKET_ORDER) {
    // Only plugins that actually expose routes get a section — never a heading over an empty
    // table. A bucket left with no such plugins is dropped whole, so the page never carries a stranded heading.
    const rows = plugins.filter((p) => p.bucket === bucket && p.routes.length)
    if (!rows.length) continue
    blocks.push(`### ${bucket}\n\n` + rows.map(pluginSection).join('\n').trimEnd())
  }
  return blocks.join('\n\n')
}

function writeMarkdown (plugins) {
  if (!fs.existsSync(MD_OUT)) {
    console.error(`[generate-plugin-reference] target page missing: ${path.relative(REPO, MD_OUT)} — create it with the ${BEGIN} ... ${END} markers first`)
    process.exit(1)
  }
  const md = fs.readFileSync(MD_OUT, 'utf8')
  const beginIdx = md.indexOf(BEGIN)
  const endIdx = md.indexOf(END)
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    console.error(`[generate-plugin-reference] missing generated markers in ${path.relative(REPO, MD_OUT)}`)
    process.exit(1)
  }
  const beginLineEnd = md.indexOf('\n', beginIdx)
  const head = md.slice(0, beginLineEnd + 1)
  const tail = md.slice(endIdx)
  fs.writeFileSync(MD_OUT, `${head}\n${renderMarkdown(plugins)}\n\n${tail}`)
}

function main () {
  const plugins = collect()
  writeMarkdown(plugins)
  const skipped = plugins.length - plugins.filter((p) => p.routes.length).length
  const omitted = skipped ? ` (${skipped} without routes omitted from the page)` : ''
  console.log(`[generate-plugin-reference] ${plugins.length} plugins [${plugins.map((p) => p.dir).join(', ')}] → ${path.relative(REPO, MD_OUT)}${omitted}`)
}

if (require.main === module) main()

module.exports = { bucketOf, findPlugins, collect, renderMarkdown, pluginSection, describe, cell, BUCKET_ORDER, ROOTS }
