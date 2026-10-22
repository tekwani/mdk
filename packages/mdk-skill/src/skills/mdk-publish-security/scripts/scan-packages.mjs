#!/usr/bin/env node
// Pre-publish security scan for every publishable package in an npm monorepo.
//
//   node scan-packages.mjs [--root <repo>] [--pkg <dir>]... [--audit] [--smoke] [--registry]
//                          [--keep-smoke] [--json] [--out <file>]
//
// Discovers every git-tracked package.json that does not set "private": true
// (or only the --pkg dirs), then runs the mechanical checks from
// PUBLISH_CHECKLIST.md / NPM_PACKAGES.md on each one:
//
//   packaging   files allowlist, publishConfig.access, repository, prepack build,
//               install scripts, file:/workspace:/link: deps, tarball contents,
//               main/exports/bin targets present in the tarball, bin shebang
//   deps        loose ranges (*, latest, >=), deps on private workspace packages,
//               root/package overrides that consumers will not get, dev tools
//               declared as required peers
//   imports     relative require/import escaping the package dir, bare imports
//               missing from dependencies
//   secrets     key/token/password patterns, private IPs and internal hosts in
//               every file that would land in the tarball
//   sast        grep-level leads for the 18 vulnerability classes and the UI
//               classes U1–U12 in ../references/vuln-classes.md — LEADS, not
//               findings; triage each
//   audit       (--audit) npm audit --omit=dev in the workspace that owns each
//               package, e.g. ui/ with its own lockfile (needs network)
//   smoke       (--smoke) npm pack every package (runs its own prepack), install all
//               tarballs together in a scratch project outside the repo, import every
//               main/exports entry, run every bin with --help, then npm audit that
//               project: the consumer's view, without root overrides (needs network)
//   registry    (--registry) npm view each name: unclaimed names, versions already
//               published, repository mismatch (squat), npm whoami (needs network)
//
// Zero-dependency. Exit 0 always unless the scan itself fails; severity is in
// the report. Results go to stdout as Markdown (default) or JSON (--json).
// --out creates a new file and fails if the path already exists (or is a symlink).

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { builtinModules } from 'node:module'
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const opt = { root: process.cwd(), pkgs: [], audit: false, smoke: false, registry: false, keepSmoke: false, json: false, out: null }
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--root') opt.root = path.resolve(args[++i])
  else if (a === '--pkg') opt.pkgs.push(args[++i])
  else if (a === '--audit') opt.audit = true
  else if (a === '--smoke') opt.smoke = true
  else if (a === '--registry') opt.registry = true
  else if (a === '--keep-smoke') opt.keepSmoke = true
  else if (a === '--json') opt.json = true
  else if (a === '--out') opt.out = args[++i]
  else if (a === '-h' || a === '--help') {
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 35).join('\n'))
    process.exit(0)
  } else {
    console.error(`ERR_ARG: unknown argument ${a}`)
    process.exit(2)
  }
}

// Fail before the (slow) scan rather than after it. The `wx` open at write time
// is the real guard: O_EXCL never follows a symlink planted in the meantime.
if (opt.out) {
  let exists = false
  try { fs.lstatSync(opt.out); exists = true } catch {}
  if (exists) {
    console.error(`ERR_ARG: --out ${opt.out} already exists (or is a symlink); choose a new path, e.g. "$(mktemp -d)/mdk-scan.md"`)
    process.exit(2)
  }
}

const SELF = path.basename(new URL(import.meta.url).pathname)
const BUILTINS = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)])
const CODE_EXT = /\.(c|m)?(j|t)sx?$/
const SKIP_DIRS = new Set(['node_modules', '.git', 'coverage', '.nyc_output'])

function run (cmd, argv, cwd, { timeout, env } = {}) {
  try {
    return { ok: true, out: execFileSync(cmd, argv, { cwd, env: env && { ...process.env, ...env }, timeout, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }) }
  } catch (err) {
    return { ok: false, out: String(err.stdout || ''), err: String(err.stderr || err.message), timedOut: err.signal === 'SIGTERM' }
  }
}

// First line of an error that says what went wrong, not the stack.
function firstError (text) {
  const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean)
  const pick = lines.find((l) => /404 Not Found|No matching version|Cannot find|ERR_MODULE_NOT_FOUND|ETARGET/.test(l)) ||
    lines.find((l) => /Error|ERR_|E404|ENOENT/.test(l))
  return (pick || lines[0] || 'no output').slice(0, 240)
}

// Every workspace package (private or not): name → { dir, private }.
let WORKSPACE = new Map()
function discover () {
  const ls = run('git', ['ls-files', '--', '*package.json', 'package.json'], opt.root)
  if (!ls.ok) throw new Error(`git ls-files failed: ${ls.err}`)
  const all = ls.out.split('\n').filter(Boolean)
    .filter((f) => !/(^|\/)(node_modules|dist|templates|fixtures?)\//.test(f))
    .map((f) => path.resolve(opt.root, path.dirname(f)))
  WORKSPACE = new Map(all.map((dir) => [readJson(path.join(dir, 'package.json')), dir])
    .filter(([pj]) => pj && pj.name)
    .map(([pj, dir]) => [pj.name, { dir, private: pj.private === true }]))
  if (opt.pkgs.length) return opt.pkgs.map((p) => path.resolve(opt.root, p))
  return [...WORKSPACE.values()].filter((w) => !w.private).map((w) => w.dir)
}

// Relative file targets of an "exports" map (strings at any depth), skipping patterns.
function exportTargets (exp) {
  if (typeof exp === 'string') return exp.includes('*') ? [] : [exp]
  if (!exp || typeof exp !== 'object') return []
  return Object.values(exp).flatMap(exportTargets)
}

// Import specifiers a consumer can use: "name" and each non-pattern "./sub" export.
function entrySpecs (pj) {
  if (pj.exports && typeof pj.exports === 'object' && Object.keys(pj.exports).some((k) => k.startsWith('.'))) {
    return Object.keys(pj.exports).filter((k) => !k.includes('*') && k !== './package.json')
      .map((k) => (k === '.' ? pj.name : `${pj.name}/${k.slice(2)}`))
  }
  return pj.main || pj.exports || !pj.bin ? [pj.name] : []
}

function binEntries (pj) {
  if (typeof pj.bin === 'string') return [[pj.name.split('/').pop(), pj.bin]]
  return Object.entries(pj.bin || {})
}

const norm = (f) => path.posix.normalize(String(f).replace(/^\.\//, ''))

function readJson (f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null }
}

// Files npm would pack. Prefer npm's own answer; fall back to a walk.
function tarballFiles (dir) {
  const r = run('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], dir)
  if (r.ok) {
    try {
      const j = JSON.parse(r.out)
      return { source: 'npm pack', files: j[0].files.map((f) => f.path), size: j[0].unpackedSize }
    } catch {}
  }
  const files = []
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name)) continue
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else files.push(path.relative(dir, p))
    }
  }
  walk(dir)
  return { source: 'walk (npm pack failed)', files, size: null }
}

const SHIP_SMELLS = [
  [/(^|\/)(tests?|__tests__|spec)\//, 'test code'],
  [/(^|\/)mocks?\//, 'mock server / fixtures'],
  [/(^|\/)fixtures?\//, 'fixtures'],
  [/(^|\/)coverage\//, 'coverage output'],
  [/^(?!.*(^|\/)mocks?\/)(.*\/)?(db|store)\//, 'local database / store dir'],
  [/(^|\/)\.env(\.|$)/, '.env file'],
  [/\.(pem|key|p12|pfx|crt|keystore)$/i, 'key / certificate file'],
  [/(^|\/)config\/(?!.*\.example\.)[^/]+\.json$/, 'real config file (not *.example.*)'],
  [/\.sh$/, 'shell script'],
  [/\.(sqlite|db|log)$/i, 'database / log file'],
  [/(^|\/)\.(npmrc|netrc)$/, 'registry credentials file']
]

const SECRET_PATTERNS = [
  [/-----BEGIN (RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/, 'private key block'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key id'],
  [/gh[pousr]_[A-Za-z0-9]{36,}/, 'GitHub token'],
  [/npm_[A-Za-z0-9]{36}/, 'npm token'],
  [/xox[abprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/sk-[A-Za-z0-9]{32,}/, 'API secret key (sk-)'],
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/\b(?:api[_-]?key|apikey|secret|token|passw(?:or)?d|auth)\b["']?\s*[:=]\s*["'][^"'\s$]{12,}["']/i, 'hard-coded credential literal'],
  [/\b(?:seed|privateKey|secretKey|mnemonic)\b["']?\s*[:=]\s*["'][0-9a-f]{32,}["']/i, 'hard-coded key material (hex)'],
  [/\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/, 'private IP address'],
  [/\b[a-z0-9-]+\.(internal|corp|lan|intra)\b/i, 'internal hostname']
]

// Grep-level leads per vulnerability class. Keyed to references/vuln-classes.md.
const SAST_RULES = [
  ['command-exec', /\bchild_process\b|\b(exec|execSync|execFile|execFileSync|spawn|spawnSync|fork)\s*\(/, 'process execution'],
  ['command-exec', /shell\s*:\s*true/, 'spawn with shell:true'],
  ['injection', /\beval\s*\(|new\s+Function\s*\(|\bvm\.(runIn|Script|compileFunction)/, 'dynamic code evaluation'],
  ['injection', /\brequire\s*\(\s*[^'"`)\s][^)]*\)|import\s*\(\s*[^'"`)\s]/, 'dynamic require/import of a computed path'],
  ['injection', /`\s*(SELECT|INSERT|UPDATE|DELETE)\b[^`]*\$\{|\.(query|exec|prepare|run|all|get)\s*\(\s*`[^`]*\$\{/i, 'SQL built with template literal'],
  ['path-traversal', /path\.(join|resolve)\s*\([^)]*\b(req|request|params|query|body|args|input|name|id|file|dir|pkg|package)\b/i, 'path built from a possibly user-controlled value'],
  ['fs-dangerous', /\bfs(\.promises)?\.(rm|rmSync|rmdir|rmdirSync|unlink|unlinkSync|rename|renameSync|chmod|chmodSync|chown|symlink|symlinkSync|copyFile|cp|cpSync)\s*\(|\brimraf\b/, 'destructive / permission-changing fs op'],
  ['fs-dangerous', /\bfs(\.promises)?\.(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|mkdir|mkdirSync)\s*\(/, 'fs write'],
  ['toctou', /\b(existsSync|access|accessSync|statSync|lstatSync)\s*\(/, 'check-then-act candidate'],
  ['ssrf', /\b(fetch|axios(\.\w+)?|got|request|undici\.\w+|https?\.(get|request))\s*\(\s*(?!['"`]https?:)/, 'outbound request with computed URL'],
  ['ssrf', /new\s+URL\s*\([^)]*(req|params|query|body|config|opts|options)/i, 'URL built from external input'],
  ['proto-pollution', /__proto__|constructor\s*\.\s*prototype|\bprototype\s*\[/, 'prototype access'],
  ['proto-pollution', /\b(merge|deepMerge|extend|defaultsDeep|set|setWith)\s*\(|Object\.assign\s*\(\s*(\w+)\s*,\s*(req|body|params|payload|data|msg|input)/i, 'deep merge / assign of external object'],
  ['proto-pollution', /\w+\[\s*(key|k|prop|name|field|path\[\w+\])\s*\]\s*=/, 'computed-key assignment'],
  ['deserialization', /\b(v8\.deserialize|unserialize|yaml\.load\s*\((?![^)]*safe)|node-serialize|serialize-javascript|BSON\.deserialize|msgpack\.(decode|unpack))/i, 'unsafe deserializer'],
  ['deserialization', /JSON\.parse\s*\(/, 'JSON.parse (check try/catch, size, prototype keys)'],
  ['crypto', /createHash\s*\(\s*['"](md5|sha1)['"]|createCipher\s*\(|\bdes\b|\brc4\b|ecb/i, 'weak hash / cipher'],
  ['crypto', /Math\.random\s*\(/, 'Math.random (not for secrets/ids)'],
  ['crypto', /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED|strictSSL\s*:\s*false|checkServerIdentity\s*:\s*\(\s*\)\s*=>/, 'TLS verification disabled'],
  ['crypto', /\s===?\s*[^=]*(token|secret|signature|hmac|digest|password)\b|\b(token|secret|signature|hmac|digest|password)\s*===?\s/i, 'non-constant-time secret comparison'],
  ['insecure-defaults', /['"]0\.0\.0\.0['"]|host\s*:\s*['"]::['"]/, 'binds all interfaces'],
  ['insecure-defaults', /origin\s*:\s*(true|['"]\*['"])|Access-Control-Allow-Origin['"]?\s*[,:]\s*['"]\*/, 'permissive CORS'],
  ['insecure-defaults', /\b(auth|authentication|requireAuth|secure|verify|tls|ssl)\s*:\s*false\b|\bdebug\s*:\s*true\b/i, 'security toggle defaulting off / debug on'],
  ['insecure-defaults', /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|example)/, 'plain-http URL'],
  ['authz', /\b(skipAuth|noAuth|bypass|allowAll|whitelist\s*=\s*null|isAdmin\s*=\s*true|role\s*[:=]\s*['"]admin)/i, 'auth bypass flag'],
  ['authz', /\.(get|post|put|patch|delete|route|register|respond|handle|method|addMethod|on)\s*\(\s*['"`][^'"`]+['"`]\s*,\s*(async\s*)?\(?\s*\w*\s*(,\s*\w+)?\)?\s*=>/, 'route/RPC handler — confirm an auth check precedes it'],
  ['secret-leak', /(console\.(log|info|warn|error|debug)|\blog(ger)?\.(info|warn|error|debug|trace)|debug)\s*\([^)]*\b(token|secret|password|passwd|apiKey|api_key|privateKey|seed|mnemonic|authorization|cookie|credential)/i, 'secret-shaped identifier in a log call'],
  ['secret-leak', /\b(reply|res)\.(send|json)\s*\([^)]*\b(err|error)\b(\.stack)?|stack\s*:\s*err\.stack/, 'error object / stack returned to caller'],
  ['race', /setInterval\s*\(|\bawait\b.*\bfor\s*\(|Promise\.all\s*\(/, 'concurrency site (check shared-state mutation)'],
  ['input', /\bparseInt\s*\([^,)]*\)|Number\s*\(\s*(req|params|query|body)/, 'numeric parse of external input without radix/range'],
  ['input', /\bnew\s+RegExp\s*\(\s*(?!['"`])/, 'RegExp from dynamic input (ReDoS/injection)'],
  // UI classes (references/vuln-classes.md U1–U9)
  ['xss', /dangerouslySetInnerHTML|\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML\s*\(|document\.write\s*\(/, 'HTML sink (U1)'],
  ['xss', /rehype-raw|allowDangerousHtml\s*:\s*true/, 'raw HTML enabled in markdown rendering (U1)'],
  ['url', /window\.open\s*\(|location\.(href|assign|replace)\b\s*[=(]|\bwindow\.location\s*=/, 'navigation sink (U2)'],
  ['url', /target\s*=\s*['"{]?_blank(?![^>]*noopener)/, 'target=_blank without rel=noopener (U5)'],
  ['browser-storage', /\b(localStorage|sessionStorage)\.setItem\s*\(|createJSONStorage|persist\s*\(/, 'persisted browser state — tokens/fleet data? (U3/U9)'],
  ['browser-storage', /URLSearchParams\([^)]*location\.search|location\.search\b.*\b(token|auth)/i, 'value read from the URL — token adoption? (U3)'],
  ['postmessage', /addEventListener\s*\(\s*['"]message['"]|\.postMessage\s*\(/, 'postMessage — origin checked? (U5)']
]

const SECRET_RULES = SECRET_PATTERNS.map(([re, label]) => ({ cls: 'secrets', re, label }))
const SAST = SAST_RULES.map(([cls, re, label]) => ({ cls, re, label }))
const NOISY_CLASSES = new Set(['race', 'toctou', 'deserialization', 'fs-dangerous', 'authz', 'browser-storage'])
// Dev tools that must never be required peers: npm 7+ installs required peers for every consumer.
const DEV_TOOL_PEERS = /^(vitest|jest|@jest\/.*|@testing-library\/.*|vite|webpack|eslint.*|prettier|typescript|@types\/.*|ts-node|tsx|storybook|@storybook\/.*|playwright|@playwright\/.*|cypress)$/

function lineScan (text, rules) {
  const hits = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (l.length > 2000) continue // minified / data
    const trimmed = l.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue
    for (const { cls, re, label } of rules) {
      if (re.test(l)) hits.push({ line: i + 1, cls, label, text: trimmed.slice(0, 160) })
    }
  }
  return hits
}

function importsOf (text) {
  const out = []
  const re = /(?:require\s*\(\s*|import\s+(?:[\w*{}\s,]+\s+from\s+)?|import\s*\(\s*|export\s+[\w*{}\s,]+\s+from\s+)['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(text))) out.push({ spec: m[1], line: text.slice(0, m.index).split('\n').length })
  return out
}

function bareName (spec) {
  if (spec.startsWith('@')) return spec.split('/').slice(0, 2).join('/')
  return spec.split('/')[0]
}

function scanPackage (dir) {
  const pj = readJson(path.join(dir, 'package.json'))
  const rel = path.relative(opt.root, dir) || '.'
  const r = { name: pj.name, version: pj.version, path: rel, findings: [], leads: [], tarball: null, audit: null }
  const add = (severity, check, msg, where) => r.findings.push({ severity, check, msg, where })

  // packaging metadata
  if (!Array.isArray(pj.files)) add('high', 'files-allowlist', 'no "files" allowlist; tarball ships everything not .npmignore/.gitignore-d')
  if (pj.name.startsWith('@') && pj.publishConfig?.access !== 'public') add('medium', 'publish-access', 'scoped package without publishConfig.access — first publish defaults to restricted')
  if (!pj.repository) add('medium', 'repository', 'no "repository" field — npm --provenance needs it')
  if (!pj.license) add('medium', 'license', 'no "license" field')
  const scripts = pj.scripts || {}
  for (const s of ['preinstall', 'install', 'postinstall', 'prepare']) {
    if (scripts[s]) add(s === 'prepare' ? 'low' : 'high', 'install-scripts', `"${s}" script runs on consumers' machines: ${scripts[s]}`)
  }
  const entryPoints = [pj.main, ...Object.values(pj.bin || {}), ...(typeof pj.bin === 'string' ? [pj.bin] : [])].filter(Boolean)
  for (const e of entryPoints) {
    if (/(^|\/)(dist|build|lib-out)\//.test(e) && !fs.existsSync(path.join(dir, e)) && !scripts.prepack && !scripts.prepublishOnly) {
      add('high', 'prepack-build', `entry ${e} is a build output, absent from the tree, and no prepack/prepublishOnly builds it`)
    }
  }
  const declared = { ...pj.dependencies, ...pj.peerDependencies, ...pj.optionalDependencies }
  const rootOverrides = readJson(path.join(opt.root, 'package.json'))?.overrides || {}
  for (const [d, v] of Object.entries({ ...declared })) {
    const spec = String(v).trim()
    if (/^(file:|link:|workspace:|git\+|github:|https?:)/.test(spec)) add('high', 'dep-source', `dependency ${d} uses non-registry spec "${v}" — breaks or is unpinned for consumers`)
    else if (/^(\*|x|latest|next|)$/i.test(spec) || /^>=?[^<|]*$/.test(spec)) {
      add(d.startsWith(pj.name.split('/')[0] + '/') ? 'high' : 'medium', 'loose-range', `dependency ${d} uses unbounded range "${spec}" — accepts any future major or a hijacked release; pin to ^x.y.z`)
    }
    const ws = WORKSPACE.get(d)
    if (ws?.private) add('high', 'private-dep', `depends on ${d}, which is "private": true in this repo — 404 for consumers`)
    // Fine when the package's own range already carries the override's floor (^4.12.34 vs >=4.12.34).
    const floor = (v) => String(v).match(/\d+\.\d+\.\d+/)?.[0]
    const sameFloor = typeof rootOverrides[d] === 'string' && floor(rootOverrides[d]) && floor(rootOverrides[d]) === floor(spec)
    if (rootOverrides[d] !== undefined && dir !== opt.root && !sameFloor) add('medium', 'root-override', `root package.json overrides ${d} → ${JSON.stringify(rootOverrides[d])}; consumers do not get root overrides — raise the range here`)
  }
  const optionalPeers = pj.peerDependenciesMeta || {}
  for (const d of Object.keys(pj.peerDependencies || {})) {
    if (DEV_TOOL_PEERS.test(d) && optionalPeers[d]?.optional !== true) {
      add('medium', 'dev-peer', `dev tool "${d}" is a required peerDependency — npm 7+ installs it into every consumer; drop it or mark it optional`)
    }
  }
  if (pj.overrides && dir !== opt.root) add('low', 'package-overrides', `"overrides" in a published package is ignored for consumers: ${Object.keys(pj.overrides).join(', ')}`)

  // tarball contents
  const tb = tarballFiles(dir)
  r.tarball = { source: tb.source, count: tb.files.length, size: tb.size }

  // entry points must be in the tarball (a prepack build may create them — confirm with --smoke)
  const shipped = new Set(tb.files.map(norm))
  const inTarball = (t) => [norm(t), norm(t) + '.js', norm(t) + '.json', path.posix.join(norm(t), 'index.js')].some((c) => shipped.has(c))
  const built = scripts.prepack || scripts.prepublishOnly
  const targets = [
    ...(pj.main ? [['main', pj.main]] : []),
    ...exportTargets(pj.exports).map((t) => ['exports', t]),
    ...binEntries(pj).map(([n, t]) => [`bin ${n}`, t])
  ]
  for (const [kind, t] of targets) {
    if (!inTarball(t)) add(built ? 'low' : 'high', 'entry-missing', `${kind} target ${t} is not in the tarball${built ? ' (prepack may build it — confirm with --smoke)' : ''}`)
  }
  for (const [n, t] of binEntries(pj)) {
    const f = path.join(dir, t)
    if (fs.existsSync(f) && !fs.readFileSync(f, 'utf8').startsWith('#!')) add('high', 'bin-shebang', `bin ${n} (${t}) has no #! line — fails when run as a command`)
  }
  if (pj.main && !pj.exports) add('low', 'exports-map', 'no "exports" map — consumers can deep-require any shipped file, so internals become public API')
  const smells = {}
  for (const f of tb.files) for (const [re, why] of SHIP_SMELLS) if (re.test(f)) (smells[why] ||= []).push(f)
  for (const [why, files] of Object.entries(smells)) {
    const sev = /key|\.env|credentials|real config|database/.test(why) ? 'high' : 'medium'
    add(sev, 'tarball-contents', `tarball ships ${why}: ${files.slice(0, 5).join(', ')}${files.length > 5 ? ` (+${files.length - 5} more)` : ''}`)
  }

  // per-file: secrets, imports, sast
  const undeclared = new Map()
  for (const f of tb.files) {
    const abs = path.join(dir, f)
    let text
    try {
      const st = fs.statSync(abs)
      if (st.size > 2 << 20) continue
      text = fs.readFileSync(abs, 'utf8')
    } catch { continue }
    if (text.includes('\u0000')) continue

    const isTestish = /(^|\/)(tests?|__tests__|mocks?|fixtures?)\//.test(f)
    for (const h of lineScan(text, SECRET_RULES)) {
      if (/example|placeholder|xxx|changeme|<[^>]+>|\$\{|process\.env/i.test(h.text)) continue
      const network = /private IP|internal hostname/.test(h.label)
      if (network && isTestish) continue
      const sev = network || isTestish ? 'low' : 'high'
      add(sev, 'secrets', `${h.label}: ${h.text}`, `${f}:${h.line}`)
    }

    if (!CODE_EXT.test(f) || /\.d\.ts$/.test(f)) continue
    for (const { spec, line } of importsOf(text)) {
      if (spec.startsWith('.')) {
        const target = path.resolve(path.dirname(abs), spec)
        if (!target.startsWith(dir + path.sep) && target !== dir) {
          add('high', 'escaping-import', `relative import "${spec}" resolves outside the package (${path.relative(opt.root, target)}) — missing after npm install`, `${f}:${line}`)
        }
      } else if (!BUILTINS.has(spec) && !spec.startsWith('node:') && !/^[#$~]/.test(spec)) {
        const n = bareName(spec)
        if (n !== pj.name && !declared[n] && !/(^|\/)(tests?|mocks?|fixtures?|scripts?|templates?|assets)\//.test(f)) {
          if (!undeclared.has(n)) undeclared.set(n, `${f}:${line}`)
        }
      }
    }
    // Leads only in shipped runtime code; tests/mocks are triaged via tarball-contents.
    if (isTestish || /(^|\/)(templates?|assets)\//.test(f) || path.basename(f) === SELF) continue
    for (const h of lineScan(text, SAST)) r.leads.push({ ...h, where: `${f}:${h.line}` })
  }
  for (const [n, where] of undeclared) {
    const dev = pj.devDependencies?.[n]
    add('high', 'undeclared-dep', `imports "${n}" but it is ${dev ? 'only a devDependency' : 'not declared in dependencies'}`, where)
  }

  // npm audit (network)
  if (opt.audit) {
    // Audit from the workspace that owns the package (ui/ has its own lockfile).
    let wsRoot = dir
    while (wsRoot !== opt.root && wsRoot !== path.dirname(wsRoot) && !fs.existsSync(path.join(wsRoot, 'package-lock.json'))) wsRoot = path.dirname(wsRoot)
    const auditArgs = ['audit', '--omit=dev', '--json', ...(wsRoot === dir ? [] : [`--workspace=${pj.name}`])]
    const a = run('npm', auditArgs, wsRoot)
    try {
      const j = JSON.parse(a.out || '{}')
      r.audit = j.metadata?.vulnerabilities || j.error || null
      const v = j.metadata?.vulnerabilities || {}
      if ((v.critical || 0) + (v.high || 0) > 0) add('high', 'npm-audit', `npm audit: ${v.critical || 0} critical, ${v.high || 0} high, ${v.moderate || 0} moderate (prod deps)`)
      else if (v.moderate) add('medium', 'npm-audit', `npm audit: ${v.moderate} moderate (prod deps)`)
    } catch { r.audit = { error: (a.err || 'unparseable npm audit output').slice(0, 300) } }
  }
  return r
}

// Pack every package, install the tarballs together in a scratch project outside the
// repo (so escaping ../.. paths cannot resolve), then import each entry and run each bin.
// npm pack runs the package's own prepack/prepare (our build); install uses --ignore-scripts.
const MISSING_MODULE = /Cannot find (module|package)|ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|ERR_PACKAGE_PATH_NOT_EXPORTED/

function smoke (dirs, results) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-smoke-'))
  const tarDir = path.join(tmp, 'tarballs')
  const proj = path.join(tmp, 'project')
  fs.mkdirSync(tarDir)
  fs.mkdirSync(proj)
  const summary = { dir: opt.keepSmoke ? tmp : null, install: null, audit: null }
  const tarballs = []
  dirs.forEach((dir, i) => {
    // prepack output can precede the JSON on stdout, so find the new tarball on disk instead.
    const before = new Set(fs.readdirSync(tarDir))
    const p = run('npm', ['pack', '--pack-destination', tarDir], dir, { timeout: 300000 })
    const made = fs.readdirSync(tarDir).find((f) => !before.has(f) && f.endsWith('.tgz'))
    if (made) tarballs.push(path.join(tarDir, made))
    else results[i].findings.push({ severity: 'high', check: 'smoke-pack', msg: `npm pack failed: ${firstError(p.err || p.out)}` })
  })
  fs.writeFileSync(path.join(proj, 'package.json'), JSON.stringify({ name: 'mdk-publish-smoke', version: '0.0.0', private: true }))
  const inst = run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', ...tarballs], proj, { timeout: 600000 })
  summary.install = inst.ok ? `ok (${tarballs.length} tarballs)` : `failed: ${firstError(inst.err)}`
  if (!inst.ok) {
    for (const r of results) r.findings.push({ severity: 'high', check: 'smoke-install', msg: `installing the packed tarballs together failed: ${firstError(inst.err)}` })
  } else {
    dirs.forEach((dir, i) => {
      const pj = readJson(path.join(dir, 'package.json'))
      const add = (severity, check, msg) => results[i].findings.push({ severity, check, msg })
      for (const spec of entrySpecs(pj)) {
        const r = run(process.execPath, ['--input-type=module', '-e', 'await import(process.env.SMOKE_SPEC); process.exit(0)'], proj, { timeout: 30000, env: { SMOKE_SPEC: spec } })
        if (r.timedOut) add('medium', 'smoke-import', `import("${spec}") did not return within 30s — side effects at load time`)
        else if (!r.ok && MISSING_MODULE.test(r.err)) add('high', 'smoke-import', `import("${spec}") fails after install: ${firstError(r.err)}`)
        else if (!r.ok) add('low', 'smoke-import', `import("${spec}") throws at load time (confirm it is intentional): ${firstError(r.err)}`)
      }
      for (const [n, t] of binEntries(pj)) {
        const f = path.join(proj, 'node_modules', pj.name, t)
        if (!fs.existsSync(f)) { add('high', 'smoke-bin', `bin ${n} → ${t} is missing from the installed package`); continue }
        const r = run(process.execPath, [f, '--help'], proj, { timeout: 30000 })
        if (r.timedOut) add('medium', 'smoke-bin', `bin ${n} --help did not exit within 30s`)
        else if (!r.ok && MISSING_MODULE.test(r.err)) add('high', 'smoke-bin', `bin ${n} --help fails: ${firstError(r.err)}`)
        else if (!r.ok) add('low', 'smoke-bin', `bin ${n} --help exits non-zero: ${firstError(r.err)}`)
      }
    })
    // Consumer-view audit: no root overrides, real resolved ranges.
    const a = run('npm', ['audit', '--omit=dev', '--json'], proj, { timeout: 300000 })
    try {
      const j = JSON.parse(a.out || '{}')
      summary.audit = j.metadata?.vulnerabilities || firstError(a.err)
      summary.vulnerable = Object.values(j.vulnerabilities || {})
        .filter((v) => ['moderate', 'high', 'critical'].includes(v.severity))
        .map((v) => `${v.name} (${v.severity}${v.fixAvailable ? '' : ', no fix'})`)
    } catch { summary.audit = firstError(a.err || 'unparseable npm audit output') }
  }
  if (!opt.keepSmoke) fs.rmSync(tmp, { recursive: true, force: true })
  return summary
}

// Registry state per name: unclaimed (confirm scope ownership before docs tell people
// to install it), version already taken, or published from a different repository.
function registry (dirs, results) {
  const who = run('npm', ['whoami'], opt.root, { timeout: 30000 })
  const summary = { whoami: who.ok ? who.out.trim() : `not logged in (${firstError(who.err)})`, scopes: {} }
  const localRepo = readJson(path.join(opt.root, 'package.json'))?.repository
  const repoUrl = (r) => String(r?.url || r || '').replace(/^git\+/, '').replace(/\.git$/, '').toLowerCase()
  dirs.forEach((dir, i) => {
    const pj = readJson(path.join(dir, 'package.json'))
    const add = (severity, check, msg) => results[i].findings.push({ severity, check, msg })
    const scope = pj.name.startsWith('@') ? pj.name.split('/')[0] : null
    if (scope && !(scope in summary.scopes)) {
      const org = run('npm', ['access', 'list', 'packages', scope, '--json'], opt.root, { timeout: 30000 })
      let n = null
      try { n = Object.keys(JSON.parse(org.out || '{}')).length } catch {}
      summary.scopes[scope] = n !== null
        ? `${n} package(s) already published under ${scope} — the scope is claimed; confirm with \`npm org ls ${scope.slice(1)}\` (logged in) that you are a member with publish rights`
        : `cannot list (${firstError(org.err)}) — the scope may be unclaimed; create the org before anyone else does`
    }
    const v = run('npm', ['view', pj.name, '--json'], opt.root, { timeout: 30000 })
    if (!v.ok && /E404/.test(v.err)) { add('low', 'registry-unclaimed', `${pj.name} is not on the registry — confirm you own ${scope || 'the name'} before docs tell users to install it`); return }
    if (!v.ok) { add('low', 'registry-unclaimed', `npm view failed: ${firstError(v.err)}`); return }
    let info
    try { info = JSON.parse(v.out) } catch { return }
    if ([].concat(info.versions || []).includes(pj.version)) add('high', 'registry-version', `${pj.name}@${pj.version} is already published — bump before publishing`)
    const theirs = repoUrl(info.repository)
    const ours = repoUrl(pj.repository || localRepo)
    if (theirs && ours && theirs !== ours) add('high', 'registry-owner', `registry ${pj.name} points at ${theirs}, not ${ours} — possible name squat; check maintainers: ${[].concat(info.maintainers || []).join(', ')}`)
  })
  return summary
}

function toMarkdown (results, repo) {
  const sevOrder = { high: 0, medium: 1, low: 2 }
  const out = ['# Pre-publish security scan', '', `Root: \`${opt.root}\` · packages: ${results.length} · ${new Date().toISOString()}`, '']
  if (repo.smoke) {
    out.push(`Smoke install: ${repo.smoke.install}${repo.smoke.dir ? ` (kept at \`${repo.smoke.dir}\`)` : ''}`, '')
    out.push(`Consumer-view npm audit (fresh install, no root overrides): \`${JSON.stringify(repo.smoke.audit)}\``, '')
    if (repo.smoke.vulnerable?.length) out.push(`Vulnerable: ${repo.smoke.vulnerable.join(', ')} — trace with \`npm ls <name>\` in the kept smoke project (\`--keep-smoke\`)`, '')
  }
  if (repo.registry) {
    out.push(`npm whoami: ${repo.registry.whoami}`, '')
    for (const [s, v] of Object.entries(repo.registry.scopes)) out.push(`Scope \`${s}\`: ${v}`, '')
  }
  out.push('| Package | Tarball files | High | Medium | Low | SAST leads |', '| --- | --- | --- | --- | --- | --- |')
  for (const r of results) {
    const c = (s) => r.findings.filter((f) => f.severity === s).length
    out.push(`| \`${r.name}\` | ${r.tarball.count} | ${c('high')} | ${c('medium')} | ${c('low')} | ${r.leads.length} |`)
  }
  for (const r of results) {
    out.push('', `## \`${r.name}\` (${r.path})`, '')
    if (r.audit) out.push(`npm audit: \`${JSON.stringify(r.audit)}\``, '')
    const fs_ = [...r.findings].sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity])
    if (!fs_.length) out.push('No mechanical findings.')
    for (const f of fs_) out.push(`- **${f.severity}** \`${f.check}\` ${f.msg}${f.where ? ` — \`${f.where}\`` : ''}`)
    const byCls = {}
    for (const l of r.leads) (byCls[l.cls] ||= []).push(l)
    if (Object.keys(byCls).length) {
      out.push('', '<details><summary>SAST leads (triage manually)</summary>', '')
      for (const [cls, ls] of Object.entries(byCls)) {
        const shown = NOISY_CLASSES.has(cls) ? ls.slice(0, 15) : ls.slice(0, 40)
        out.push(`- **${cls}** (${ls.length})`)
        for (const l of shown) out.push(`  - \`${l.where}\` ${l.label}: \`${l.text.replace(/`/g, "'")}\``)
        if (shown.length < ls.length) out.push(`  - … ${ls.length - shown.length} more`)
      }
      out.push('', '</details>')
    }
  }
  return out.join('\n') + '\n'
}

try {
  const dirs = discover()
  if (!dirs.length) throw new Error('no publishable packages found')
  const results = dirs.map(scanPackage)
  const repo = {}
  if (opt.smoke) repo.smoke = smoke(dirs, results)
  if (opt.registry) repo.registry = registry(dirs, results)
  const body = opt.json ? JSON.stringify({ repo, packages: results }, null, 2) : toMarkdown(results, repo)
  if (opt.out) fs.writeFileSync(opt.out, body, { flag: 'wx', mode: 0o600 })
  else process.stdout.write(body)
  const highs = results.reduce((n, r) => n + r.findings.filter((f) => f.severity === 'high').length, 0)
  console.error(`scanned ${results.length} package(s): ${highs} high-severity mechanical finding(s)`)
} catch (err) {
  console.error(`ERR_SCAN: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
}
