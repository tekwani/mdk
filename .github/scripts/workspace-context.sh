#!/usr/bin/env bash
# workspace-context.sh — resolve how a package directory should be installed.
#
# Since the repo root became an npm *workspaces* monorepo, `cd <pkg> && npm ci`
# inside a workspace member no longer installs that package in isolation: npm
# walks up to the workspace root and performs a partial single-workspace install
# that never links the member's dev bins (e.g. `standard`), so lint/test fail
# with "command not found". The correct install for a member is a single
# `npm ci` at the workspace root, which hoists every member's deps and bins into
# the root node_modules. Standalone packages (not listed in the root
# `workspaces`, e.g. `ui`, `backend/core/plugins`, the example `ui` apps) keep
# installing in place.
#
# Given a repo-relative package dir, this prints three tab-separated fields that
# the cache composite actions consume:
#   <install-dir> <cache-slug> <node-modules-path>
# where install-dir is "." for a workspace member (install at the root) or the
# package dir for a standalone package. All members share the "workspace-root"
# slug so they resolve to one shared node_modules cache keyed on the root lock.
#
# Usage:  read -r INSTALL_DIR SLUG NM < <(workspace-context.sh "$WD")
set -euo pipefail

WD="${1:?package directory required (use . for the repo root)}"
ROOT="${GITHUB_WORKSPACE:-$(pwd)}"

# Normalise: strip trailing slashes.
WD="${WD%/}"; WD="${WD:-.}"

is_member() {
  # Exit 0 if $1 is a member of the root package.json `workspaces`. Supports
  # exact paths (what this repo uses today) plus `dir/*` and `dir/**` globs so
  # the check keeps working if the workspaces list later switches to globs.
  node -e '
    const fs = require("fs");
    const root = process.argv[1];
    const dir = process.argv[2].replace(/\/+$/, "");
    let ws = [];
    try { ws = JSON.parse(fs.readFileSync(root + "/package.json", "utf8")).workspaces || []; } catch (_) {}
    if (Array.isArray(ws.packages)) ws = ws.packages; // { packages: [...] } form
    const norm = (s) => String(s).replace(/\/+$/, "");
    const member = ws.some((w) => {
      w = norm(w);
      if (w === dir) return true;
      if (w.endsWith("/**")) { const b = w.slice(0, -3); return dir === b || dir.startsWith(b + "/"); }
      if (w.endsWith("/*"))  { const b = w.slice(0, -2); return dir.startsWith(b + "/") && !dir.slice(b.length + 1).includes("/"); }
      return false;
    });
    process.exit(member ? 0 : 1);
  ' "$ROOT" "$1"
}

if [ "$WD" = "." ]; then
  # Explicit repo-root install (non-member roots such as `ui`).
  printf '.\troot\tnode_modules\n'
elif is_member "$WD"; then
  # Workspace member → install once at the root, shared cache.
  printf '.\tworkspace-root\tnode_modules\n'
else
  # Standalone package → install in place.
  printf '%s\t%s\t%s\n' "$WD" "${WD//\//-}" "$WD/node_modules"
fi
