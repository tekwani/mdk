// Pure helpers for comparing backend/workers/external-workers.json (the registry of
// partner-maintained Workers the catalogue lists) against the git-pinned Worker dependencies
// of examples/mvp-site/package.json. No I/O: callers pass the parsed registry and the
// dependencies object, so the same code runs in a unit test and against the real files.
//
// Two findings are possible:
//   missing  a Worker the example pins from GitHub but the registry does not list, so the
//            catalogue would omit a Worker the repo itself runs
//   stale    both pin the same repository at different commits, so the catalogue describes a
//            different contract than the example installs
// A registry entry the example does not pin is not a finding: the example is a demo, not the
// superset of every partner Worker.

const GIT_DEP_RE = /^git\+https:\/\/github\.com\/([^/]+)\/([^/#]+?)(?:\.git)?#([0-9a-f]{40})$/i
const REPO_URL_RE = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/

// "git+https://github.com/<owner>/<repo>.git#<sha>" -> { owner, repo, ref }, or null for any
// other dependency spec (registry range, file:, a git URL without a full SHA).
export function parseGitDependency (spec) {
  const m = GIT_DEP_RE.exec(String(spec ?? ''))
  return m ? { owner: m[1], repo: m[2], ref: m[3] } : null
}

// "https://github.com/<owner>/<repo>" -> "owner/repo", lower-cased so two spellings of the
// same GitHub path compare equal. null when the URL is not a plain GitHub repository URL.
export function ownerRepo (repoUrl) {
  const m = REPO_URL_RE.exec(String(repoUrl ?? ''))
  return m ? `${m[1]}/${m[2]}`.toLowerCase() : null
}

export function compareRegistryToPins (registry, dependencies) {
  const byRepo = new Map()
  for (const entry of registry) {
    const key = ownerRepo(entry.repoUrl)
    if (key) byRepo.set(key, entry)
  }
  const missing = []
  const stale = []
  for (const [dependency, spec] of Object.entries(dependencies ?? {})) {
    const dep = parseGitDependency(spec)
    if (!dep) continue
    const repo = `${dep.owner}/${dep.repo}`.toLowerCase()
    const entry = byRepo.get(repo)
    if (!entry) {
      missing.push({ dependency, repo })
    } else if (String(entry.ref).toLowerCase() !== dep.ref.toLowerCase()) {
      stale.push({ dependency, repo, registryRef: entry.ref, exampleRef: dep.ref })
    }
  }
  return { missing, stale }
}

export function describeFindings ({ missing, stale }) {
  const lines = []
  for (const m of missing) {
    lines.push(`${m.dependency}: examples/mvp-site pins ${m.repo} but backend/workers/external-workers.json has no entry for it`)
  }
  for (const s of stale) {
    lines.push(`${s.dependency}: registry pins ${s.repo} at ${s.registryRef} but examples/mvp-site pins ${s.exampleRef}`)
  }
  return lines
}
