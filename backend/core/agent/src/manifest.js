import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { CHARTER, CHARTER_VERSION } from './charter.js'
import { TOOL_CONTRACT_VERSION, agentMeta } from './tools.js'

/**
 * The conditions a run happened under, recorded with the run.
 *
 * A score is only a claim about something. Without the question set, the code, the charter and
 * the budget it was taken under, a number in a file six weeks old cannot be compared to anything
 * — and the most common way a benchmark lies is that the questions moved underneath it. Hashing
 * the battery makes that detectable rather than arguable.
 *
 * The endpoint is recorded as a hash, not a URL. A manifest travels further than the machine
 * that made it, and an internal hostname in a file that reaches the public repo is a leak that
 * no one goes looking for. The hash still tells two endpoints apart, which is all a comparison
 * needs; the full URL stays in the local run file.
 */

export const sha256 = (data) => createHash('sha256').update(data).digest('hex')

export const hashFile = (path) => sha256(readFileSync(path))

/**
 * The commit the agent is running from.
 *
 * Fails soft: an eval run outside a git checkout is unusual but not wrong, and it must not lose
 * the whole run. `run` is injected so a test can drive both paths without a repository.
 *
 * @returns {string} the short sha, or 'unknown'
 */
export function gitCommit (cwd, run = execFileSync) {
  try {
    return String(run('git', ['rev-parse', '--short', 'HEAD'], { cwd, encoding: 'utf8' })).trim() || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Build the manifest for one run. Pure — every input is passed in.
 *
 * `tools` are the admitted MCP descriptors; they are recorded by name and declared floor, sorted,
 * so a run made against a different tool surface is visible without diffing two whole reports.
 *
 * @param {object} opts
 * @param {string} opts.batterySha256   hash of the question file this run used
 * @param {string} opts.agentCommit     short sha of the agent under test
 * @param {object} opts.provider        resolved provider — kind, model, baseURL
 * @param {string} opts.capability      declared capability of the running model
 * @param {object} opts.limits          the turn budget that capability bought
 * @param {number} opts.reps            repetitions per case
 * @param {Array}  [opts.tools]         admitted tool descriptors
 * @param {string} [opts.system]        the session's system prompt, to detect a custom charter
 * @param {string} opts.startedAt       ISO timestamp
 * @param {string} opts.finishedAt      ISO timestamp
 * @returns {object} the manifest
 */
export function buildManifest ({
  batterySha256,
  agentCommit,
  provider = {},
  capability,
  limits,
  reps,
  tools = [],
  system,
  startedAt,
  finishedAt
} = {}) {
  return {
    batterySha256,
    agentCommit,
    charter: (system !== undefined && system !== CHARTER) ? 'custom' : CHARTER_VERSION,
    contract: TOOL_CONTRACT_VERSION,
    model: provider.model ?? null,
    providerKind: provider.kind ?? null,
    endpointSha256: provider.baseURL ? sha256(provider.baseURL).slice(0, 16) : null,
    capability,
    limits,
    reps,
    toolSet: tools
      .map((tool) => ({ name: tool.name, minCapability: agentMeta(tool)?.minCapability ?? null }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    startedAt,
    finishedAt
  }
}
