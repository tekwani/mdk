# @tetherto/mdk-skill

The **MDK Developer Skill suite**: version-controlled procedural context, in
the universal Agent Skills format (`SKILL.md`), that makes any
skills-compatible coding agent (Cursor, Claude Code, …) fluent in MDK
conventions the moment the repo is cloned.

Current state: the router and `mdk-device-worker` (use case #1) are fully
implemented and grounded in the real monorepo; `mdk-app-plugin`,
`mdk-ui-component`, and `mdk-deployment` ship as **routing stubs** that
activate on the right prompts and point at the real repo artifacts until
their full workflows land.

## Layout

```text
src/
├── skills/                 # hand-authored suite content (flat: one dir per skill)
│   ├── mdk/                #   router + suite-wide references/
│   ├── mdk-device-worker/  #   full skill: SKILL.md, references/, scripts/, assets/
│   ├── mdk-app-plugin/     #   stub
│   ├── mdk-ui-component/   #   stub
│   └── mdk-deployment/     #   stub
├── mdk-contract.schema.json  # derived contract schema (owned here; see its $comment)
├── sources.map.json        # source-of-truth -> bundle mapping
├── assemble.mjs            # copy-assembler -> dist/skills/
└── install.mjs             # dist/skills/* -> .cursor/skills/ and/or .claude/skills/
dist/skills/                # assembled suite — build output, gitignored, never hand-edited
```

Skills are assembled and installed **flat** — clients discover
`<skills-dir>/<name>/SKILL.md` one level deep, and each skill's `description`
frontmatter is its routing trigger. Copied artifacts (the worker template, the
contract schema) are taken from their owning packages by `assemble.mjs`, never
hand-maintained, so the bundle cannot drift from the source of truth.

## Build & install

```bash
node src/assemble.mjs        # build dist/skills/ (also runs on npm prepack)
npm run install:skills       # assemble + copy into the enclosing repo's
                             # .cursor/skills/ and .claude/skills/ (gitignored)
node src/install.mjs --client cursor   # one client only
```

## Try it — routing prompts

Open the repo in a skills-aware agent after installing, then check that each
prompt activates the matching skill:

| Example prompt | Skill it should invoke |
| --- | --- |
| "Add a new power meter worker for our site" | `mdk-device-worker` |
| "I need to integrate a new miner device into MDK" | `mdk-device-worker` |
| "Author an mdk-contract.json for a temperature sensor" | `mdk-device-worker` |
| "Build a plugin that aggregates hashrate across all miners" | `mdk-app-plugin` (stub) |
| "Add a cross-worker endpoint that rolls up a site summary" | `mdk-app-plugin` (stub) |
| "Create a dashboard widget that shows live telemetry from a worker" | `mdk-ui-component` (stub) |
| "How do I deploy the MDK stack in single-process mode?" | `mdk-deployment` (stub) |
| "What is MDK and how is it structured?" | `mdk` (router) |

## Verify the device-worker skill

```bash
# contract validation (exit 0/1)
node dist/skills/mdk-device-worker/scripts/validate-contract.mjs \
  backend/workers/samples/demo-worker/plugin/mdk-contract.json

# in-process smoke: telemetry sweep + command bounds, no Kernel, no DHT
node dist/skills/mdk-device-worker/scripts/worker-smoke.mjs <worker-dir>
```

The end-to-end proof of the skill is scaffolding a new worker from
`dist/skills/mdk-device-worker/SKILL.md` alone — contract validation, smoke
pass, and brittle unit tests all green before the worker ever meets a Kernel.
