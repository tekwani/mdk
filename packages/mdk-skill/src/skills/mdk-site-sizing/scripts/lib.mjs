// Shared parse / compile / size / match logic for mdk-site-sizing.
// Zero-dependency. The CLI wrappers and the held-out eval all import this.

export const THRESHOLDS = {
  headroomGreenBelow: 0.7,
  headroomAmberBelow: 1.0,
  actionSubmitP99Ms: 2000,
  steadyCpuPctOfOneCore: 80
}

export const FAMILIES = [
  {
    type: 'mdk-worker-whatsminer',
    aliases: ['whatsminer', 'whatsminers', 'microbt'],
    models: ['m56s', 'm50s', 'm30s', 'm60']
  },
  {
    type: 'mdk-worker-antminer',
    aliases: ['antminer', 'antminers', 'bitmain'],
    models: ['s19xp', 's19 xp', 's19', 's21']
  },
  {
    type: 'mdk-worker-avalon',
    aliases: ['avalon', 'avalons', 'canaan'],
    models: []
  }
]

const ONES = {
  zero: 0, a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, handful: 5
}

const TENS = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90
}

const STATUS_RANK = { green: 0, amber: 1, red: 2 }

export function typeKey (workers) {
  return [...new Set((workers || []).map((w) => w.type).filter(Boolean))].sort().join(',')
}

export function familyForAlias (token) {
  const t = String(token || '').toLowerCase().replace(/\s+/g, '')
  for (const fam of FAMILIES) {
    if (fam.type === token) return fam
    if (fam.aliases.some((a) => a.replace(/\s+/g, '') === t)) return fam
    if (fam.models.some((m) => m.replace(/\s+/g, '') === t)) return fam
  }
  return null
}

function parseNumberPhrase (raw) {
  if (raw == null) return null
  const text = String(raw).toLowerCase().replace(/,/g, '').trim()
  if (!text) return null
  const numeric = Number(text)
  if (Number.isFinite(numeric)) return numeric
  if (ONES[text] != null) return ONES[text]
  if (TENS[text] != null) return TENS[text]
  const hundred = text.match(/^(one|two|three|four|five|six|seven|eight|nine)\s+hundred$/)
  if (hundred) return ONES[hundred[1]] * 100
  const compound = text.match(/^(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[-\s](one|two|three|four|five|six|seven|eight|nine)$/)
  if (compound) return TENS[compound[1]] + ONES[compound[2]]
  return null
}

const NUMBER_TOKEN = String.raw`(?:\d[\d,]*|two\s+hundred|three\s+hundred|four\s+hundred|five\s+hundred|six\s+hundred|seven\s+hundred|eight\s+hundred|nine\s+hundred|one\s+hundred|twenty(?:[-\s](?:one|two|three|four|five|six|seven|eight|nine))?|thirty(?:[-\s](?:one|two|three|four|five|six|seven|eight|nine))?|forty(?:[-\s](?:one|two|three|four|five|six|seven|eight|nine))?|fifty(?:[-\s](?:one|two|three|four|five|six|seven|eight|nine))?|sixty(?:[-\s](?:one|two|three|four|five|six|seven|eight|nine))?|seventy(?:[-\s](?:one|two|three|four|five|six|seven|eight|nine))?|eighty(?:[-\s](?:one|two|three|four|five|six|seven|eight|nine))?|ninety(?:[-\s](?:one|two|three|four|five|six|seven|eight|nine))?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|handful)`

function normalizeModel (raw) {
  if (!raw) return null
  return String(raw).toLowerCase().replace(/\s+/g, '')
}

export function parseSiteDescription (text) {
  const src = String(text || '').replace(/\s+/g, ' ').trim()
  const devices = []

  const familyAlt = FAMILIES.flatMap((f) => f.aliases).join('|')
  const modelAlt = FAMILIES.flatMap((f) => f.models).map((m) => m.replace(/\s+/g, '\\s*')).join('|')
  const pairRe = new RegExp(
    `(${NUMBER_TOKEN})\\s+(?:of\\s+)?(${familyAlt})s?(?:\\s+(${modelAlt}))?`,
    'gi'
  )

  for (const m of src.matchAll(pairRe)) {
    const count = parseNumberPhrase(m[1])
    const fam = familyForAlias(m[2])
    if (count == null || !fam) continue
    devices.push({ type: fam.type, model: normalizeModel(m[3]) || defaultModel(fam), count })
  }

  if (!devices.length) {
    const modelRe = new RegExp(`(${NUMBER_TOKEN})\\s+(${modelAlt})\\b`, 'gi')
    for (const m of src.matchAll(modelRe)) {
      const count = parseNumberPhrase(m[1])
      const fam = familyForAlias(normalizeModel(m[2]))
      if (count == null || !fam) continue
      devices.push({ type: fam.type, model: normalizeModel(m[2]), count })
    }
  }

  const mentioned = new Set()
  for (const fam of FAMILIES) {
    const re = new RegExp(`\\b(?:${fam.aliases.join('|')})s?\\b`, 'i')
    if (re.test(src)) mentioned.add(fam.type)
  }

  const totalFromDevices = devices.reduce((s, d) => s + (d.count || 0), 0)
  let deviceCount = totalFromDevices || null

  if (!devices.length && mentioned.size) {
    const generic = src.match(new RegExp(`(${NUMBER_TOKEN})\\s+(?:miners?|asics?|devices?|boxes|units)\\b`, 'i'))
    const count = generic ? parseNumberPhrase(generic[1]) : null
    deviceCount = count
    for (const type of mentioned) {
      const fam = FAMILIES.find((f) => f.type === type)
      devices.push({ type, model: defaultModel(fam), count: mentioned.size === 1 ? count : null })
    }
  }

  if (!devices.length) {
    const generic = src.match(new RegExp(`(${NUMBER_TOKEN})\\s+(?:miners?|asics?|devices?)\\b`, 'i'))
    if (generic) {
      deviceCount = parseNumberPhrase(generic[1])
      devices.push({ type: 'mdk-worker-whatsminer', model: 'm56s', count: deviceCount, assumed: true })
    }
  }

  const cores =
    matchNumber(src, /(\d+)\s*-?\s*core\b/i) ??
    matchNumber(src, /(\d+)\s+physical\s+cores?\b/i) ??
    matchNumber(src, /(\d+)\s+cores?\b/i)

  const ramGiB =
    matchNumber(src, /(\d+(?:\.\d+)?)\s*(?:gi?b)\b/i) ??
    matchNumber(src, /(\d+(?:\.\d+)?)\s*gb\b/i)

  let diskType = null
  if (/\bnvme\b/i.test(src)) diskType = 'nvme'
  else if (/\bsata\b/i.test(src)) diskType = 'sata'
  else if (/\bhdd\b/i.test(src)) diskType = 'hdd'
  else if (/\b(?:sd(?:-card)?|microsd|sd-class)\b/i.test(src)) diskType = 'sd'

  let tier = null
  if (/\bsite[-\s]?server\b/i.test(src)) tier = 'site-server'
  else if (/\bedge\b/i.test(src) || /\b(?:raspberry\s*)?pi\b/i.test(src)) tier = 'edge'
  else tier = inferTier({ cpuCoresPhysical: cores, ramGiB, diskType })

  const workerHint =
    matchNumber(src, new RegExp(`(${NUMBER_TOKEN})\\s+worker\\s+processes`, 'i')) ??
    matchNumber(src, new RegExp(`(${NUMBER_TOKEN})\\s+workers\\b`, 'i'))

  return {
    description: src,
    devices,
    deviceCount: deviceCount ?? totalFromDevices ?? null,
    host: {
      tier,
      cpuCoresPhysical: cores,
      ramGiB,
      diskType
    },
    workerCountHint: workerHint,
    kernels: 1,
    gateways: 1
  }
}

function defaultModel (fam) {
  if (!fam) return null
  if (fam.type === 'mdk-worker-whatsminer') return 'm56s'
  if (fam.type === 'mdk-worker-antminer') return 's19xp'
  return null
}

function matchNumber (src, re) {
  const m = src.match(re)
  return m ? parseNumberPhrase(m[1]) : null
}

export function inferTier (host = {}) {
  if (host.tier) return host.tier
  const cores = host.cpuCoresPhysical
  const ram = host.ramGiB
  const disk = host.diskType
  if (disk === 'sd' || disk === 'hdd') return 'edge'
  if (cores != null && cores <= 8 && ram != null && ram <= 16) return 'edge'
  if ((cores != null && cores >= 16) || (ram != null && ram >= 32) || disk === 'nvme') return 'site-server'
  return null
}

export function fromHarnessReport (raw) {
  if (!raw || typeof raw !== 'object') throw new Error('profile is not an object')
  if (raw.rssSumMiB != null && raw.status && raw.workers) {
    return {
      profileId: raw.profileId,
      tier: raw.tier || raw.hardware?.referenceTier || 'custom',
      hardware: raw.hardware || {},
      deviceCount: raw.deviceCount,
      workerCount: raw.workerCount,
      workers: raw.workers,
      status: raw.status,
      headroomRatio: raw.headroomRatio,
      rssSumMiB: raw.rssSumMiB,
      cpuSumPct: raw.cpuSumPct,
      readP99Ms: raw.readP99Ms,
      actionP99Ms: raw.actionP99Ms,
      source: raw.source || 'fixture'
    }
  }

  const summaries = Object.values(raw.resourceSummary || {})
  const rssSum = summaries.reduce((s, x) => s + (x.avgRssMiB || 0), 0)
  const cpuSum = summaries.reduce((s, x) => s + (x.avgCpuPct || 0), 0)
  return {
    profileId: raw.profileId,
    tier: raw.hardware?.referenceTier || 'custom',
    hardware: raw.hardware || {},
    deviceCount: raw.deviceCount,
    workerCount: raw.workerCount,
    workers: (raw.workersBreakdown || []).map((w) => ({
      type: w.type,
      model: w.model || null,
      deviceCount: w.deviceCount
    })),
    status: raw.verdict?.overall,
    headroomRatio: raw.headroomRatio,
    rssSumMiB: rssSum || null,
    cpuSumPct: cpuSum || null,
    readP99Ms: raw.latencies?.telemetrySingle?.p99Ms ?? raw.latencies?.gatewayTelemetrySingle?.p99Ms,
    actionP99Ms: raw.latencies?.actionSubmit?.p99Ms ?? raw.latencies?.gatewayActionSubmit?.p99Ms,
    source: 'measured'
  }
}

function fitLinear (points, yKey) {
  const usable = points.filter((p) => p.deviceCount > 0 && Number.isFinite(p[yKey]))
  if (usable.length < 2) {
    const one = usable[0]
    if (!one) return null
    return { base: 0, perDevice: one[yKey] / one.deviceCount }
  }
  const sorted = [...usable].sort((a, b) => a.deviceCount - b.deviceCount)
  const lo = sorted[0]
  const hi = sorted[sorted.length - 1]
  const span = hi.deviceCount - lo.deviceCount
  if (span === 0) return { base: 0, perDevice: lo[yKey] / lo.deviceCount }
  const perDevice = (hi[yKey] - lo[yKey]) / span
  const base = lo[yKey] - lo.deviceCount * perDevice
  return { base, perDevice }
}

export function compileEnvelope (rawProfiles, { compiledAt = new Date().toISOString(), provenance } = {}) {
  const profiles = rawProfiles.map(fromHarnessReport).sort((a, b) => a.profileId.localeCompare(b.profileId))
  const measured = profiles.some((p) => p.source === 'measured')
  const supportedUpTo = {}
  const formulas = {}

  const groups = new Map()
  for (const p of profiles) {
    const key = `${p.tier}|${typeKey(p.workers)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(p)
  }

  for (const [key, list] of groups) {
    const green = list.filter((p) => p.status === 'green').sort((a, b) => b.deviceCount - a.deviceCount)
    const densest = green[0]
    const [tier, types] = key.split('|')
    if (!supportedUpTo[tier]) supportedUpTo[tier] = {}
    supportedUpTo[tier][types || '*'] = densest
      ? { devices: densest.deviceCount, workers: densest.workerCount, profileId: densest.profileId }
      : null
    formulas[key] = {
      rssMiB: fitLinear(list.filter((p) => p.status !== 'red'), 'rssSumMiB'),
      cpuPct: fitLinear(list.filter((p) => p.status !== 'red'), 'cpuSumPct')
    }
  }

  return {
    compiledAt,
    provenance: provenance || {
      kind: measured ? 'measured' : 'fixture',
      note: measured
        ? 'Compiled from harness reports.'
        : 'Fixture envelope for skill eval. Replace eval/profiles with committed harness reports (PE-1) and re-run compile-envelope.mjs.'
    },
    thresholds: THRESHOLDS,
    profiles,
    supportedUpTo,
    formulas
  }
}

function scaleFrom (profile, totalD) {
  if (!profile || !profile.deviceCount) return { rssSumMiB: null, cpuSumPct: null, readP99Ms: null, actionP99Ms: null }
  const t = totalD / profile.deviceCount
  return {
    rssSumMiB: profile.rssSumMiB == null ? null : profile.rssSumMiB * t,
    cpuSumPct: profile.cpuSumPct == null ? null : profile.cpuSumPct * t,
    readP99Ms: profile.readP99Ms ?? null,
    actionP99Ms: profile.actionP99Ms ?? null,
    interpolatedBetween: [profile.profileId]
  }
}

function interpolateResources (totalD, smaller, larger) {
  if (!larger) return { rssSumMiB: null, cpuSumPct: null, readP99Ms: null, actionP99Ms: null, interpolatedBetween: [] }
  if (!smaller || smaller.profileId === larger.profileId) return scaleFrom(larger, totalD)
  const span = larger.deviceCount - smaller.deviceCount
  if (span <= 0) return scaleFrom(larger, totalD)
  const t = (totalD - smaller.deviceCount) / span
  const mix = (a, b) => (a == null || b == null ? b ?? a : a + t * (b - a))
  return {
    rssSumMiB: mix(smaller.rssSumMiB, larger.rssSumMiB),
    cpuSumPct: mix(smaller.cpuSumPct, larger.cpuSumPct),
    readP99Ms: mix(smaller.readP99Ms, larger.readP99Ms),
    actionP99Ms: mix(smaller.actionP99Ms, larger.actionP99Ms),
    interpolatedBetween: [smaller.profileId, larger.profileId]
  }
}

function unmeasured (facts, reason) {
  return {
    status: 'unmeasured',
    reason,
    tier: facts.host?.tier || null,
    deviceCount: facts.deviceCount,
    workerCount: null,
    devicesPerWorker: null,
    kernels: facts.kernels ?? 1,
    gateways: facts.gateways ?? 1,
    matchingProfileId: null,
    rssSumMiB: null,
    cpuSumPct: null,
    readP99Ms: null,
    actionP99Ms: null,
    envelope: { supportedUpTo: null, nearestProfileId: null },
    caveats: [
      reason === 'family-not-in-envelope'
        ? 'No measured profile covers this device family. Run the capacity harness before quoting a size.'
        : 'Not enough measured data to size this site. Run the capacity harness on a matching host.'
    ]
  }
}

function beyondEnvelope ({ facts, nearest, supportedUpTo, resources, workerCount, devicesPerWorker }) {
  return {
    status: 'beyond-envelope',
    reason: 'requested-devices-exceed-green-and-amber',
    tier: facts.host?.tier || nearest?.tier || null,
    deviceCount: facts.deviceCount,
    workerCount,
    devicesPerWorker,
    kernels: facts.kernels ?? 1,
    gateways: facts.gateways ?? 1,
    matchingProfileId: nearest?.profileId || null,
    rssSumMiB: resources.rssSumMiB,
    cpuSumPct: resources.cpuSumPct,
    readP99Ms: resources.readP99Ms,
    actionP99Ms: resources.actionP99Ms,
    envelope: {
      supportedUpTo: supportedUpTo
        ? { devices: supportedUpTo.devices, workers: supportedUpTo.workers, profileId: supportedUpTo.profileId }
        : null,
      nearestProfileId: nearest?.profileId || null
    },
    caveats: [
      `Requested ${facts.deviceCount} devices is past the densest green profile` +
        (supportedUpTo ? ` (${supportedUpTo.profileId}, ${supportedUpTo.devices} devices)` : '') +
        '. Do not claim this layout is supported. Run the harness at this size.'
    ]
  }
}

export function sizeSite (facts, envelope) {
  const devices = facts.devices || []
  const totalD = facts.deviceCount ?? devices.reduce((s, d) => s + (Number(d.count) || 0), 0)
  const types = [...new Set(devices.map((d) => d.type).filter(Boolean))].sort()
  const tier = facts.host?.tier || inferTier(facts.host)
  facts = { ...facts, deviceCount: totalD, host: { ...facts.host, tier } }

  if (!types.length) return unmeasured(facts, 'family-not-in-envelope')
  const knownTypes = new Set(envelope.profiles.flatMap((p) => p.workers.map((w) => w.type)))
  if (types.some((t) => !knownTypes.has(t))) return unmeasured(facts, 'family-not-in-envelope')
  if (!totalD) return unmeasured(facts, 'device-count-unknown')

  const mixKey = types.join(',')
  const sameMix = envelope.profiles.filter((p) => typeKey(p.workers) === mixKey)
  if (!sameMix.length) return unmeasured(facts, 'family-not-in-envelope')

  let candidates = sameMix.filter((p) => !tier || p.tier === tier || p.tier === 'custom')
  if (!candidates.length) candidates = sameMix

  const covering = [...candidates]
    .filter((p) => p.deviceCount >= totalD)
    .sort((a, b) => (STATUS_RANK[a.status] - STATUS_RANK[b.status]) || (a.deviceCount - b.deviceCount))

  const greenCovering = covering.filter((p) => p.status === 'green')
  const amberCovering = covering.filter((p) => p.status === 'amber')
  const maxGreen = [...candidates].filter((p) => p.status === 'green').sort((a, b) => b.deviceCount - a.deviceCount)[0]
  const maxNonRed = [...candidates].filter((p) => p.status !== 'red').sort((a, b) => b.deviceCount - a.deviceCount)[0]
  const maxAny = [...candidates].sort((a, b) => b.deviceCount - a.deviceCount)[0]

  const supported = maxGreen
    ? { devices: maxGreen.deviceCount, workers: maxGreen.workerCount, profileId: maxGreen.profileId }
    : null

  if (greenCovering.length) {
    const chosen = greenCovering[0]
    const smaller = [...candidates]
      .filter((p) => p.status === 'green' && p.deviceCount <= totalD)
      .sort((a, b) => b.deviceCount - a.deviceCount)[0] || chosen
    const devicesPerWorker = chosen.deviceCount / chosen.workerCount
    const workerCount = Math.max(1, Math.ceil(totalD / devicesPerWorker))
    const resources = interpolateResources(totalD, smaller, chosen)
    return {
      status: 'green',
      reason: totalD === chosen.deviceCount ? 'exact-profile' : 'within-green-envelope',
      tier: chosen.tier === 'custom' ? (tier || 'custom') : chosen.tier,
      deviceCount: totalD,
      workerCount,
      devicesPerWorker,
      kernels: facts.kernels ?? 1,
      gateways: facts.gateways ?? 1,
      matchingProfileId: chosen.profileId,
      workers: scaleWorkers(devices, workerCount, totalD),
      rssSumMiB: resources.rssSumMiB,
      cpuSumPct: resources.cpuSumPct,
      readP99Ms: resources.readP99Ms,
      actionP99Ms: resources.actionP99Ms,
      interpolatedBetween: resources.interpolatedBetween,
      envelope: {
        supportedUpTo: supported,
        nearestProfileId: chosen.profileId
      },
      caveats: chosen.source === 'fixture'
        ? ['Envelope is fixture data until PE-1 commits a measured harness report.']
        : []
    }
  }

  if (amberCovering.length) {
    const chosen = amberCovering[0]
    const devicesPerWorker = chosen.deviceCount / chosen.workerCount
    const workerCount = Math.max(1, Math.ceil(totalD / devicesPerWorker))
    const resources = scaleFrom(chosen, totalD)
    return {
      status: 'amber',
      reason: 'within-amber-envelope',
      tier: chosen.tier === 'custom' ? (tier || 'custom') : chosen.tier,
      deviceCount: totalD,
      workerCount,
      devicesPerWorker,
      kernels: facts.kernels ?? 1,
      gateways: facts.gateways ?? 1,
      matchingProfileId: chosen.profileId,
      workers: scaleWorkers(devices, workerCount, totalD),
      rssSumMiB: resources.rssSumMiB,
      cpuSumPct: resources.cpuSumPct,
      readP99Ms: resources.readP99Ms,
      actionP99Ms: resources.actionP99Ms,
      interpolatedBetween: resources.interpolatedBetween,
      envelope: {
        supportedUpTo: supported,
        nearestProfileId: chosen.profileId
      },
      caveats: [
        `${chosen.profileId} is amber at ${chosen.deviceCount} devices. Treat as little spare capacity, not a supported-up-to bound.`
      ]
    }
  }

  const nearest = maxNonRed || maxAny
  const devicesPerWorker = nearest && nearest.workerCount
    ? nearest.deviceCount / nearest.workerCount
    : null
  const workerCount = devicesPerWorker ? Math.max(1, Math.ceil(totalD / devicesPerWorker)) : null
  return beyondEnvelope({
    facts,
    nearest: maxAny,
    supportedUpTo: supported,
    resources: nearest ? scaleFrom(nearest, totalD) : {},
    workerCount,
    devicesPerWorker
  })
}

function scaleWorkers (devices, workerCount, totalD) {
  if (!devices.length || !workerCount) return []
  if (devices.every((d) => d.count == null) && totalD) {
    const share = Math.ceil(totalD / devices.length)
    return devices.map((d, i) => ({
      type: d.type,
      model: d.model,
      deviceCount: i === devices.length - 1 ? totalD - share * (devices.length - 1) : share,
      workerCount: 1
    }))
  }
  return devices.map((d) => ({
    type: d.type,
    model: d.model,
    deviceCount: d.count,
    workerCount: Math.max(1, Math.ceil((d.count || 0) / Math.max(1, Math.ceil(totalD / workerCount))))
  }))
}

export function matchRecommendation (rec, expected, { rssTolerance = 0.2 } = {}) {
  const errors = []
  if (expected.status && rec.status !== expected.status) {
    errors.push(`status: got ${rec.status}, expected ${expected.status}`)
  }
  if (expected.tier && rec.tier !== expected.tier) {
    errors.push(`tier: got ${rec.tier}, expected ${expected.tier}`)
  }
  const kernels = expected.kernels ?? 1
  const gateways = expected.gateways ?? 1
  if (rec.kernels !== kernels) errors.push(`kernels: got ${rec.kernels}, expected ${kernels}`)
  if (rec.gateways !== gateways) errors.push(`gateways: got ${rec.gateways}, expected ${gateways}`)

  if (expected.workerCount != null) {
    const [lo, hi] = Array.isArray(expected.workerCount)
      ? expected.workerCount
      : [expected.workerCount, expected.workerCount]
    if (rec.workerCount < lo || rec.workerCount > hi) {
      errors.push(`workerCount: got ${rec.workerCount}, expected [${lo}, ${hi}]`)
    }
  }

  if (expected.matchingProfileId && rec.matchingProfileId !== expected.matchingProfileId) {
    errors.push(`matchingProfileId: got ${rec.matchingProfileId}, expected ${expected.matchingProfileId}`)
  }

  if (expected.supportedUpToDevices != null) {
    const got = rec.envelope?.supportedUpTo?.devices
    if (got !== expected.supportedUpToDevices) {
      errors.push(`supportedUpTo.devices: got ${got}, expected ${expected.supportedUpToDevices}`)
    }
  }

  if (expected.rssSumMiB != null && rec.rssSumMiB != null) {
    const [lo, hi] = Array.isArray(expected.rssSumMiB)
      ? expected.rssSumMiB
      : [expected.rssSumMiB * (1 - rssTolerance), expected.rssSumMiB * (1 + rssTolerance)]
    if (rec.rssSumMiB < lo || rec.rssSumMiB > hi) {
      errors.push(`rssSumMiB: got ${rec.rssSumMiB}, expected [${lo}, ${hi}]`)
    }
  }

  return { ok: errors.length === 0, errors }
}

export function renderRecommendation (rec) {
  const rss = rec.rssSumMiB == null ? '_' : `${Math.round(rec.rssSumMiB)} MiB`
  const cpu = rec.cpuSumPct == null ? '_' : `${rec.cpuSumPct.toFixed(1)}% of 1 core (sum)`
  const lines = [
    `# Site sizing recommendation`,
    ``,
    `| Field | Value |`,
    `| --- | --- |`,
    `| Status | **${rec.status}** |`,
    `| Reference tier | ${rec.tier ?? '_'} |`,
    `| Devices | ${rec.deviceCount ?? '_'} |`,
    `| Workers | ${rec.workerCount ?? '_'} |`,
    `| Devices per Worker | ${rec.devicesPerWorker == null ? '_' : rec.devicesPerWorker} |`,
    `| Kernels | ${rec.kernels} |`,
    `| Gateways | ${rec.gateways} |`,
    `| Matching profile | ${rec.matchingProfileId ?? '_'} |`,
    `| Estimated RSS (site) | ${rss} |`,
    `| Estimated CPU (site) | ${cpu} |`,
    `| Read p99 | ${rec.readP99Ms == null ? '_' : `${Math.round(rec.readP99Ms)} ms`} |`,
    `| Action p99 | ${rec.actionP99Ms == null ? '_' : `${Math.round(rec.actionP99Ms)} ms`} |`
  ]
  if (rec.envelope?.supportedUpTo) {
    const s = rec.envelope.supportedUpTo
    lines.push(``, `Supported up to (densest green): **${s.devices} devices / ${s.workers} Workers** (\`${s.profileId}\`).`)
  }
  if (rec.caveats?.length) {
    lines.push(``, `## Caveats`, ...rec.caveats.map((c) => `- ${c}`))
  }
  lines.push(
    ``,
    `Numbers come from the measured envelope, not from a guess. Hand off to \`mdk-deployment\` to write \`mdk.yaml\`.`
  )
  return lines.join('\n') + '\n'
}
