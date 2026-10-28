# Releasing MDK

This document is for maintainers cutting a release. For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Release checklist

Copy this into the PR or release ticket for each release.

### Prepare (private repo)

- [ ] Create release branch: `release/<version>`
- [ ] Run `npm run release:bump -- <version>`. It sets every `package.json` and `mdk-app.yaml` version, moves every internal `@tetherto/mdk-*`
      pin to `^<version>`, updates the README release links, adds the release tag to the `linkinator.config.json` skip list, regenerates every
      lockfile and the UI registry, then runs `npm run release:check`. That covers the version, pin and lockfile-refresh items below, so do those
      by hand only if the script cannot run. Reviewing the lockfile diff, the generated pages, the changelog and the release notes stay manual
- [ ] Update `"version"` in every tracked `package.json` (root, `backend/`, `packages/`, `ui/`, `examples/`; not the vendored `backend/lib/mdk-crypto-lib`), following the [`bump-mdk`](./skills/bump-mdk/SKILL.md) skill
- [ ] Update any pinned `^semver` `@tetherto/*` references in [`ui/packages/`](./ui/packages/) to match the new version
- [ ] Refresh lockfiles: `npm install` at the repo root, in [`ui/`](./ui/README.md), and in each `examples/**` directory with its own `package-lock.json`; [`bump-mdk`](./skills/bump-mdk/SKILL.md) has the exact commands and drift check
- [ ] Confirm no unexpected changes in [`package-lock.json`](./package-lock.json) files
- [ ] Regenerate the generated pages: `npm run regenerate-docs`, then commit anything it changes
- [ ] Confirm nothing is left stale: `npm run regenerate-docs -- --check` passes. The
      [`docs-freshness`](.github/workflows/docs-freshness.yml) workflow enforces the same check as a required status on every PR;
      running it locally first surfaces drift before it turns the release PR red
- [ ] Update [`README.md`](./README.md) — version badge and any inline version references
- [ ] Add entry for `v<version>` in [`CHANGELOG.md`](./CHANGELOG.md)
- [ ] Run tests — pass
- [ ] Run build — pass
- [ ] Private CI passes on the release branch
- [ ] Review the docs queue: list every PR in both repos that still carries `docs-required` (the label comes off when the docs land,
      so anything listed still owes them) and record the open items in this version's [`CHANGELOG.md`](./CHANGELOG.md) entry. An item
      already listed in the prior version's changelog entry has used its one deferral: hold the release until it clears. A release candidate or v1.0 goes out only when no
      docs debt remains. This checklist is the enforcement point until the
      [v1 hard gate](docs/reference/maintainers/README.md#hard-gate-v1) lands; the queue command itself fails nothing in CI.

  ```bash
  for R in "$(gh repo view --json nameWithOwner --jq .nameWithOwner)" tetherto/mdk; do
    gh pr list -R "$R" --label docs-required --state all --limit 100 \
      --json number,title,url --jq '.[] | "\(.url)\t\(.title)"'
  done | sort -u
  ```

### Promote

- [ ] Promote the verified commit to the public repo (`mdk`)
- [ ] Spot-check a [`package.json`](./package.json) version to confirm the commit arrived intact

### Verify and tag (public repo)

- [ ] Confirm all `package.json` versions match the release version
- [ ] Public CI passes
- [ ] Create tag: `v<version>`
- [ ] Push tag to origin

### Publish

- [ ] Publish from the tagged commit: the packages marked `publishable` in the [package reference](./docs/reference/packages.md)
- [ ] Confirm published packages show the correct version
