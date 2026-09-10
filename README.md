# js-utils

Shared JavaScript utilities as an npm-workspaces monorepo. Each directory under
`packages/` is an independently versioned public npm package under the
`@activescott` scope.

## Packages

- [`packages/analytics`](packages/analytics) — `@activescott/analytics`: PostHog
  analytics integration for React Router apps (provider, SPA pageview tracking,
  user identification, reverse-proxy helper). Consumed by RambleFeed and Fernfiles.

## Versioning

Each package is versioned independently with plain npm versions and git tags of
the form `<package-name>@<version>` (e.g. `analytics@0.2.0`), managed by
simple-release like `activescott/auth`: conventional commits on `main` drive
the bump (`feat` → minor, `fix` → patch), CI tags a GitHub release, then
publishes to npm with Sigstore provenance (trusted publishing — no tokens).

Commit scopes are limited to `analytics` and `repo` (see `commitlint.config.js`).
Release mechanics live in `scripts/release.ts` + `.github/workflows/ci.yaml`.
`@conventional-changelog/git-client` is override-pinned to 2.6.0 (auth's
known-good version — 2.7.0 breaks with `parseCommits is not a function`
against `conventional-commits-parser@5`).

## Publishing a release

There is no manual release command. Merging to `main` releases automatically:

1. Write the change with a **conventional commit** (or PR title — squash
   merges use the title as the commit subject, and the PR Title workflow
   lints it with the same commitlint rules as the local `commit-msg` hook):
   `feat(analytics): ...` bumps minor, `fix(analytics): ...` bumps patch.
   Anything else (`chore`, `docs`, `test`, `refactor` without `feat`/`fix`
   semantics) bumps nothing.
2. Only changes under `packages/analytics/` release that package (independent
   mode is path-based). Root/`repo`-scoped changes — workflow, docs, tooling —
   never cut a release.
3. CI on the `main` push runs `scripts/release.ts`: bumps the version, commits
   it, cuts tag `analytics@x.y.z`, and creates the GitHub release. The
   `publish` job then runs `npm publish --access public` with Sigstore
   provenance — no npm tokens anywhere; auth is OIDC via trusted publishing.

To verify: open the CI run for the merge, check the `release` job's
`Run release script` step for `New tags created: 1` / `Packages to publish:
@activescott/analytics`, then confirm the version and Provenance badge on the
[npm page](https://www.npmjs.com/package/@activescott/analytics).

One-time setup (already done for `analytics`, repeat per new package): on
npmjs.com, package Settings → Trusted Publisher → add GitHub Actions with org
`activescott`, repo `js-utils`, workflow file `ci.yaml`.

Escape hatch — manual publish (no provenance attestation; prefer automation):

```bash
npm login
npm publish --workspace=packages/analytics --access public
```
