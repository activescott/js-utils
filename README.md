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
