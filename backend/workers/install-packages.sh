#!/usr/bin/env bash
# This script relies on bash-only syntax (arrays, process substitution). If
# it's invoked as `sh install-packages.sh`, $0 may still be bash (e.g. macOS
# /bin/sh is bash in POSIX-compat mode), which sets BASH_VERSION but still
# disables process substitution - so check the posix option itself, not just
# BASH_VERSION, and re-exec under plain bash instead of failing.
if [ -z "${BASH_VERSION:-}" ] || shopt -qo posix; then
  exec bash "$0" "$@"
fi
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

REPO_ROOT="$(cd "$ROOT/../.." && pwd)"

MODE="${1:-install}"

# Packages that are members of the repo-root npm `workspaces` resolve sibling
# @tetherto/mdk-* deps via semver ranges, not file: links, so
# `npm install --prefix <pkg>` can no longer install them in isolation - npm
# would try (and fail) to fetch those siblings from the registry, and dev
# bins (e.g. `standard`) also won't link correctly. Workspace members must be
# installed once from the repo root, which hoists and links them together.
# Only genuinely standalone packages (not listed in the root workspaces)
# still install via --prefix.
is_workspace_member () {
  local rel="$1"
  node -e '
    const fs = require("fs")
    const root = process.argv[1]
    const dir = process.argv[2].replace(/\/+$/, "")
    let ws = []
    try { ws = JSON.parse(fs.readFileSync(root + "/package.json", "utf8")).workspaces || [] } catch (_) {}
    if (Array.isArray(ws.packages)) ws = ws.packages
    const norm = (s) => String(s).replace(/\/+$/, "")
    const member = ws.some((w) => {
      w = norm(w)
      if (w === dir) return true
      if (w.endsWith("/**")) { const b = w.slice(0, -3); return dir === b || dir.startsWith(b + "/") }
      if (w.endsWith("/*"))  { const b = w.slice(0, -2); return dir.startsWith(b + "/") && !dir.slice(b.length + 1).includes("/") }
      return false
    })
    process.exit(member ? 0 : 1)
  ' "$REPO_ROOT" "$rel"
}

run_root_install () {
  echo "[mdk-workers] -> repo root (workspace members hoisted here)"
  if [ "$MODE" = "ci" ] && [ -f "$REPO_ROOT/package-lock.json" ]; then
    (cd "$REPO_ROOT" && npm ci)
  else
    (cd "$REPO_ROOT" && npm install)
  fi
}

run_npm_prefix () {
  local dir="$1"
  if [ "$MODE" = "ci" ] && [ -f "$dir/package-lock.json" ]; then
    npm ci --prefix "$dir"
  else
    npm install --prefix "$dir"
  fi
}

echo "[mdk-workers] Installing dependencies (${MODE}) under ${ROOT}..."

PKG_DIRS=()
while IFS= read -r pkgjson; do
  dir=$(dirname "$pkgjson")
  [ "$dir" = "$ROOT" ] && continue
  PKG_DIRS+=("$dir")
done < <(find "$ROOT" -name package.json -not -path '*/node_modules/*' | sort)

needs_root_install=false
for dir in "${PKG_DIRS[@]}"; do
  rel="backend/workers/${dir#${ROOT}/}"
  if is_workspace_member "$rel"; then
    needs_root_install=true
    break
  fi
done

if [ "$needs_root_install" = true ]; then
  run_root_install
fi

for dir in "${PKG_DIRS[@]}"; do
  rel="backend/workers/${dir#${ROOT}/}"
  if ! is_workspace_member "$rel"; then
    echo "[mdk-workers] -> ${dir#${ROOT}/}/ (standalone)"
    run_npm_prefix "$dir"
  fi
done

if [ -f package.json ]; then
  echo "[mdk-workers] -> ./ (root, standalone)"
  run_npm_prefix "."
fi

echo "[mdk-workers] Done."
