'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')

const {
  rawFileUrl,
  blobUrl,
  toDocsLink,
  unconfirmedEntry,
  fetchExternalEntries,
  buildEntries,
  compileValidator,
  formatModels,
  familySection,
  otherFamiliesSection,
  FULL_SHA_RE
} = require('../../scripts/generate-catalogue.js')

const VALID_REF = 'a47fa82020454f9bfa9963ccaaa319b7948e8aa2'

function validContract (overrides = {}) {
  return {
    metadata: {
      provider: 'demo',
      deviceFamily: 'miner',
      brand: 'Demo',
      modelsSupported: [],
      overview: 'test fixture',
      ...overrides.metadata
    },
    capabilities: {
      telemetry: [],
      commands: [],
      health: { supportedStates: [] },
      errors: {},
      ...overrides.capabilities
    }
  }
}

function writeManifest (entries) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-workers-'))
  const manifestPath = path.join(dir, 'external-workers.json')
  fs.writeFileSync(manifestPath, JSON.stringify(entries, null, 2))
  return manifestPath
}

function writeContractFile (rootDir, relPath, content) {
  const full = path.join(rootDir, relPath)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
  return full
}

function withFetch (impl, fn) {
  const original = global.fetch
  global.fetch = impl
  return fn().finally(() => { global.fetch = original })
}

const manifestEntry = (over = {}) => ({
  name: 'demo-worker',
  brand: 'Demo',
  provider: 'demo',
  family: 'miner',
  repoUrl: 'https://github.com/demo/demo-worker',
  ref: VALID_REF,
  contractPath: 'mdk-contract.json',
  ...over
})

// --- rawFileUrl / blobUrl / toDocsLink -------------------------------------------------

test('rawFileUrl builds a raw.githubusercontent.com URL from a plain github.com repo URL', (t) => {
  const url = rawFileUrl('https://github.com/demo/demo-worker', VALID_REF, 'mdk-contract.json')
  t.is(url, `https://raw.githubusercontent.com/demo/demo-worker/${VALID_REF}/mdk-contract.json`)
})

test('rawFileUrl rejects a repoUrl that is not a plain github.com URL', (t) => {
  t.exception(() => rawFileUrl('https://gitlab.com/demo/demo-worker', VALID_REF, 'mdk-contract.json'))
})

test('blobUrl builds a human-viewable github.com blob URL', (t) => {
  const url = blobUrl('https://github.com/demo/demo-worker', VALID_REF, 'mdk-contract.json')
  t.is(url, `https://github.com/demo/demo-worker/blob/${VALID_REF}/mdk-contract.json`)
})

test('toDocsLink passes an absolute URL through unchanged', (t) => {
  t.is(toDocsLink('https://github.com/demo/demo-worker'), 'https://github.com/demo/demo-worker')
})

test('toDocsLink converts a repo-relative path to a page-relative one', (t) => {
  const link = toDocsLink('backend/workers/miners/antminer/README.md')
  t.ok(link.startsWith('..'), 'should be relative, walking up from backend/workers/docs/')
  t.ok(link.endsWith('miners/antminer/README.md'))
})

test('toDocsLink passes through a falsy value unchanged', (t) => {
  t.is(toDocsLink(null), null)
})

// --- FULL_SHA_RE -------------------------------------------------------------------------

test('FULL_SHA_RE accepts a full 40-character commit SHA', (t) => {
  t.ok(FULL_SHA_RE.test(VALID_REF))
})

test('FULL_SHA_RE rejects a branch name', (t) => {
  t.absent(FULL_SHA_RE.test('main'))
})

test('FULL_SHA_RE rejects a tag name', (t) => {
  t.absent(FULL_SHA_RE.test('v1.0.0'))
})

test('FULL_SHA_RE rejects a short SHA', (t) => {
  t.absent(FULL_SHA_RE.test('a47fa82'))
})

// --- unconfirmedEntry ----------------------------------------------------------------------

test('unconfirmedEntry uses manifest fields and flags itself unconfirmed', (t) => {
  const e = unconfirmedEntry(manifestEntry())
  t.is(e.source, 'external')
  t.is(e.confirmed, false)
  t.is(e.conformant, false)
  t.is(e.brand, 'Demo')
  t.is(e.family, 'miner')
  t.is(e.usage, blobUrl('https://github.com/demo/demo-worker', VALID_REF, 'mdk-contract.json'))
})

test('unconfirmedEntry falls back to the package name when no brand is given', (t) => {
  const e = unconfirmedEntry(manifestEntry({ brand: undefined }))
  t.is(e.brand, 'demo-worker')
})

// --- formatModels ----------------------------------------------------------------------

test('formatModels joins a non-empty model list', (t) => {
  t.is(formatModels({ models: ['A', 'B'], source: 'external', confirmed: true }), 'A, B')
})

test('formatModels explains an empty list for a confirmed external contract', (t) => {
  t.is(
    formatModels({ models: [], source: 'external', confirmed: true }),
    'Not enumerated; see manufacturer documentation'
  )
})

test('formatModels does not claim "not enumerated" for an unconfirmed row', (t) => {
  t.is(formatModels({ models: [], source: 'external', confirmed: false }), '—')
})

test('formatModels uses a plain dash for an empty in-repo model list', (t) => {
  t.is(formatModels({ models: [], source: 'in-repo', confirmed: true }), '—')
})

// --- familySection anchors ---------------------------------------------------------------

test('familySection includes the heading prefix so two sources never collide on the same anchor', (t) => {
  const entries = [{
    family: 'miner', brand: 'A', provider: 'a', models: [], package: 'p', link: 'https://x', usage: null, conformant: true, confirmed: true
  }]
  const manufacturer = familySection(entries, 'miner', 3, 'Manufacturer-maintained')
  const mdk = familySection(entries, 'miner', 3, 'MDK-maintained')
  t.ok(manufacturer.startsWith('### Manufacturer-maintained Miners'))
  t.ok(mdk.startsWith('### MDK-maintained Miners'))
  t.not(manufacturer.split('\n')[0], mdk.split('\n')[0])
})

// --- fetchExternalEntries ----------------------------------------------------------------

test('fetchExternalEntries throws when the manifest file does not exist', async (t) => {
  const validate = compileValidator()
  const missingPath = path.join(os.tmpdir(), 'definitely-does-not-exist-' + Date.now(), 'external-workers.json')
  await t.exception(() => fetchExternalEntries(validate, missingPath))
})

test('fetchExternalEntries throws on invalid manifest JSON rather than reporting a gap', async (t) => {
  // A malformed manifest has the same consequence as a missing one — every external entry
  // disappears at once — so it's treated as fatal broken configuration, same as a missing file.
  const validate = compileValidator()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-workers-'))
  const manifestPath = path.join(dir, 'external-workers.json')
  fs.writeFileSync(manifestPath, '{ not valid json')

  await t.exception(() => fetchExternalEntries(validate, manifestPath))
})

test('fetchExternalEntries throws when the manifest does not parse to an array', async (t) => {
  const validate = compileValidator()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-workers-'))
  const manifestPath = path.join(dir, 'external-workers.json')
  fs.writeFileSync(manifestPath, JSON.stringify({ not: 'an array' }))

  await t.exception(() => fetchExternalEntries(validate, manifestPath))
})

test('fetchExternalEntries rejects a non-SHA ref without attempting a fetch', async (t) => {
  const validate = compileValidator()
  const manifestPath = writeManifest([manifestEntry({ ref: 'main' })])
  let fetchCalled = false

  const { entries, gaps } = await withFetch(async () => { fetchCalled = true }, () =>
    fetchExternalEntries(validate, manifestPath))

  t.absent(fetchCalled, 'must not fetch an unpinned ref')
  t.is(entries.length, 1)
  t.is(entries[0].confirmed, false)
  t.is(gaps.length, 1)
  t.ok(gaps[0].errors[0].includes('not a full 40-character commit SHA'))
})

test('fetchExternalEntries keeps an unconfirmed row on a non-OK HTTP response', async (t) => {
  const validate = compileValidator()
  const manifestPath = writeManifest([manifestEntry()])

  const { entries, gaps } = await withFetch(
    async () => ({ ok: false, status: 404 }),
    () => fetchExternalEntries(validate, manifestPath)
  )

  t.is(entries.length, 1)
  t.is(entries[0].confirmed, false)
  t.is(entries[0].brand, 'Demo', 'still labeled from the manifest, not dropped')
  t.is(gaps.length, 1)
  t.ok(gaps[0].errors[0].includes('HTTP 404'))
})

test('fetchExternalEntries keeps an unconfirmed row when the fetch itself throws (network error)', async (t) => {
  const validate = compileValidator()
  const manifestPath = writeManifest([manifestEntry()])

  const { entries, gaps } = await withFetch(
    async () => { throw new Error('getaddrinfo ENOTFOUND') },
    () => fetchExternalEntries(validate, manifestPath)
  )

  t.is(entries.length, 1)
  t.is(entries[0].confirmed, false)
  t.ok(gaps[0].errors[0].includes('Check your network connection'))
})

test('fetchExternalEntries flags a schema-non-conformant but fetched contract as non-conformant, not unconfirmed', async (t) => {
  const validate = compileValidator()
  const manifestPath = writeManifest([manifestEntry()])
  const badContract = { metadata: { provider: 'demo' } } // missing required fields

  const { entries, gaps } = await withFetch(
    async () => ({ ok: true, json: async () => badContract }),
    () => fetchExternalEntries(validate, manifestPath)
  )

  t.is(entries.length, 1)
  t.is(entries[0].confirmed, true, 'the fetch succeeded — only validation failed')
  t.is(entries[0].conformant, false)
  t.ok(gaps.length >= 1)
})

test('fetchExternalEntries prefers contract brand, then manifest brand, then contract provider, then manifest provider', async (t) => {
  const validate = compileValidator()

  // Contract supplies brand directly.
  let manifestPath = writeManifest([manifestEntry()])
  let result = await withFetch(
    async () => ({ ok: true, json: async () => validContract({ metadata: { brand: 'Contract Brand' } }) }),
    () => fetchExternalEntries(validate, manifestPath)
  )
  t.is(result.entries[0].brand, 'Contract Brand')

  // Contract omits brand -> falls back to manifest's brand, not straight to provider.
  manifestPath = writeManifest([manifestEntry({ brand: 'Manifest Brand' })])
  result = await withFetch(
    async () => ({ ok: true, json: async () => validContract({ metadata: { brand: undefined, provider: 'demo-inc' } }) }),
    () => fetchExternalEntries(validate, manifestPath)
  )
  t.is(result.entries[0].brand, 'Manifest Brand')

  // Neither contract nor manifest brand present -> falls back to contract provider.
  manifestPath = writeManifest([manifestEntry({ brand: undefined })])
  result = await withFetch(
    async () => ({ ok: true, json: async () => validContract({ metadata: { brand: undefined, provider: 'contract-provider' } }) }),
    () => fetchExternalEntries(validate, manifestPath)
  )
  t.is(result.entries[0].brand, 'contract-provider')
})

test('fetchExternalEntries produces a real entry with an empty model list rendered as "not enumerated"', async (t) => {
  const validate = compileValidator()
  const manifestPath = writeManifest([manifestEntry()])

  const { entries } = await withFetch(
    async () => ({ ok: true, json: async () => validContract() }),
    () => fetchExternalEntries(validate, manifestPath)
  )

  t.is(entries[0].models.length, 0)
  t.is(formatModels(entries[0]), 'Not enumerated; see manufacturer documentation')
})

test('fetchExternalEntries isolates one bad entry from another good one in the same manifest', async (t) => {
  const validate = compileValidator()
  const manifestPath = writeManifest([
    manifestEntry({ name: 'broken-worker', ref: 'not-a-sha' }),
    manifestEntry({ name: 'good-worker' })
  ])

  const { entries, gaps } = await withFetch(
    async () => ({ ok: true, json: async () => validContract() }),
    () => fetchExternalEntries(validate, manifestPath)
  )

  t.is(entries.length, 2)
  t.is(gaps.length, 1, 'only the broken entry produced a gap')
  const broken = entries.find((e) => e.package === 'broken-worker')
  const good = entries.find((e) => e.package === 'good-worker')
  t.is(broken.confirmed, false)
  t.is(good.confirmed, true)
})

test('fetchExternalEntries applies a per-fetch timeout via AbortSignal', async (t) => {
  const validate = compileValidator()
  const manifestPath = writeManifest([manifestEntry()])
  let sawSignal = false

  await withFetch(
    async (url, opts) => {
      sawSignal = !!(opts && opts.signal)
      return { ok: true, json: async () => validContract() }
    },
    () => fetchExternalEntries(validate, manifestPath)
  )

  t.ok(sawSignal, 'fetch must be called with an abort signal so a hung host cannot stall generation')
})

// --- buildEntries: an unparseable in-repo contract must not vanish --------------------------

test('buildEntries keeps an unparseable in-repo contract as an unconfirmed row instead of dropping it', (t) => {
  const validate = compileValidator()
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workers-root-'))
  writeContractFile(root, 'miners/broken/plugin/mdk-contract.json', '{ not valid json')

  const { entries, gaps } = buildEntries(validate, root)

  t.is(entries.length, 1, 'a broken contract still gets a row, matching how a broken external fetch is handled')
  t.is(entries[0].confirmed, false)
  t.is(entries[0].family, 'unknown')
  t.is(entries[0].brand, 'broken', 'falls back to the package directory name when metadata could not be read')
  t.is(gaps.length, 1)
  t.ok(gaps[0].errors[0].includes('Invalid JSON'))
})

test('buildEntries does not add a placeholder row for an unparseable sample contract', (t) => {
  const validate = compileValidator()
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workers-root-'))
  writeContractFile(root, 'samples/broken/plugin/mdk-contract.json', '{ not valid json')

  const { entries, gaps } = buildEntries(validate, root)

  t.is(entries.length, 0, 'samples never enter the catalogue, broken or not')
  t.is(gaps.length, 1, 'the gap is still reported even though no row is added')
})

test('buildEntries still parses a valid in-repo contract correctly given an explicit root', (t) => {
  const validate = compileValidator()
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workers-root-'))
  writeContractFile(root, 'miners/demo/plugin/mdk-contract.json', JSON.stringify(validContract()))

  const { entries, gaps } = buildEntries(validate, root)

  t.is(entries.length, 1)
  t.is(entries[0].confirmed, true)
  t.is(entries[0].conformant, true)
  t.is(gaps.length, 0)
})

// --- otherFamiliesSection: an entry outside the known family lists must not vanish ----------

test('otherFamiliesSection renders an entry whose family is not in the known family lists', (t) => {
  const entry = {
    family: 'unknown',
    brand: 'Mystery',
    provider: 'demo',
    models: [],
    package: 'p',
    link: 'https://x',
    usage: null,
    conformant: false,
    confirmed: false
  }
  const out = otherFamiliesSection([entry], 3, 'MDK-maintained')
  t.ok(out.startsWith('### MDK-maintained Other'))
  t.ok(out.includes('Mystery'))
})

test('otherFamiliesSection renders nothing when every entry has a known family', (t) => {
  const entry = {
    family: 'miner',
    brand: 'Known',
    provider: 'demo',
    models: [],
    package: 'p',
    link: 'https://x',
    usage: null,
    conformant: true,
    confirmed: true
  }
  const out = otherFamiliesSection([entry], 3, 'MDK-maintained')
  t.is(out, '')
})
