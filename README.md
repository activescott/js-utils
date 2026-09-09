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
the form `<package-name>@<version>` (e.g. `analytics@0.1.0`). No automation yet:
bump the version in the package's `package.json`, cut the tag by hand. If churn
justifies it, port the simple-release GitHub-releases+tags workflow from
`activescott/auth/scripts/release.ts`.
