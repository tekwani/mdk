---
name: mdk-app-rbac
description: >
  Derive an MDK App's `permissions` in mdk-app.yaml (the Kernel access its
  code uses, declared as RBAC rules) from the plugin code, check a manifest
  against the code, and keep it least privilege. Use whenever a task mentions
  app permissions, mdk-app.yaml permissions, an app's RBAC rules, or "what
  access does this app need".
argument-hint: "[app dir] [--check | --write]"
metadata:
  suite: mdk-developer-skill
  mdk_version: "{{MDK_VERSION}}"
license: Apache-2.0
---

# RBAC rules for an MDK App (`mdk-app-rbac`)

`permissions` in `mdk-app.yaml` declares the Kernel access an app uses, as RBAC rules (resources, verbs, optional
`resourceNames`). The key is required (`[]` when the app makes no Kernel call), `mdk validate app` checks its shape,
and the operator reads it when installing the app. On 0.12 the Kernel does not enforce it yet; from the next minor
the rules become the app's role, so a manifest that matches the code upgrades without a change. This skill derives
the rules from the plugin code instead of guessing them.

The vocabulary (resources, verbs, instance names, the client-method table) is in
[`references/kernel-access.md`](./references/kernel-access.md).

## Step 1: derive the rules from the code

```bash
node <skills-dir>/mdk-app-rbac/scripts/derive-permissions.mjs <app-dir>            # evidence + the YAML to declare
node <skills-dir>/mdk-app-rbac/scripts/derive-permissions.mjs <app-dir> --check    # exit 1 if the manifest declares less than the code uses
node <skills-dir>/mdk-app-rbac/scripts/derive-permissions.mjs <app-dir> --check --strict   # also exit 1 on access no call needs
node <skills-dir>/mdk-app-rbac/scripts/derive-permissions.mjs <app-dir> --write    # write the rules into mdk-app.yaml (keeps comments)
```

The script scans the plugin's sources (`plugin/`, or the package root when `mdk-plugin.json` is there) for calls of
the Kernel client's methods, maps each to its resource and verb, and prints one rule per resource with the verbs
merged, plus where each call is. `--json` gives the same as data. `--check` and `--write` need the `yaml` package,
which an MDK project has; for an app checked out on its own, `npm install --no-save yaml` first.

Calls are found by method name on any receiver. A method the code destructures off the client
(`const { sendCommand } = client`) is missed, and an unrelated object's `getStatus()` is counted, so Step 2 reads
every site.

Expected output for the scaffold's summary route:

```text
Kernel calls in plugin:
  listWorkers            workers:list (worker.list)               plugin/controllers/summary.js:18

mdk-app.yaml should declare at least:

  permissions:
    - resources: [workers]
      verbs: [list]
```

## Step 2: review each call and scope the rules

The derived rules name every instance. Before writing them:

1. Read each listed call site. A call the route cannot reach (dead code, a debug branch) does not need a rule;
   delete the code instead of declaring it.
2. Scope `devices` and `workers` rules with `resourceNames` when the app serves one device family or one Worker:
   `["miner/*"]`, `["miner/antminer/*"]`, `["powermeter/*"]`. Split into two rules when reads and writes differ
   in scope.
3. Keep `write` only for routes that command devices; a monitoring app ends with `devices: read` and `workers: list`.
4. Treat `workers: delete` as administrative: declare it only for an app whose purpose is administration, and say
   so in its README.
5. If the script reports `sendWorkerCommand` or `pullWorkerTelemetry`, those dial the Worker directly; no app
   permission describes them.

## Step 3: write `permissions`

Write the reviewed rules into `mdk-app.yaml` (`--write`, or by hand), then `mdk validate app <name>`. The key is
required; a manifest without it does not validate or install.

```yaml
permissions:
  - resources: [devices]
    verbs: [read, write]
    resourceNames: ["miner/*"]
  - resources: [workers]
    verbs: [list]
```

## Step 4: let callers in

`permissions` is the app's own access. Who may call its routes is the Gateway's business: mark a route
`"auth": true` in `plugin/mdk-plugin.json` and the Gateway runs its `authVerifier` before anything else (the caller
section in [`kernel-access.md`](./references/kernel-access.md)). An agent on the MCP server sees only routes it is
allowed to call.

## Self-audit checklist

* [ ] `derive-permissions.mjs <app> --check --strict` exits 0: the manifest declares every call the code makes, and
  nothing the code does not use (least privilege).
* [ ] `devices` and `workers` rules carry `resourceNames` when the app serves one family or one Worker.
* [ ] `workers: delete` is declared only on purpose, and documented.
* [ ] `mdk validate app <name>` passes.
* [ ] Routes that change devices are marked `"auth": true`.
