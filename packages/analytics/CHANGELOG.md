# Changelog

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.3.2](https://github.com/activescott/js-utils/compare/analytics@0.3.1...analytics@0.3.2) (2026-09-10)

### Bug Fixes

* mount lazy provider client-only to keep SSR clean ([f05d0a9](https://github.com/activescott/js-utils/commit/f05d0a9f203b8c8d2fcce7fade1683e7fd995a4f))

## [0.3.1](https://github.com/activescott/js-utils/compare/analytics@0.3.0...analytics@0.3.1) (2026-09-10)

### Bug Fixes

* split lazy entry so posthog-js leaves the main chunk ([a96f2d4](https://github.com/activescott/js-utils/commit/a96f2d49c334294fcc24cb66f00b20cb53360510))

## [0.3.0](https://github.com/activescott/js-utils/compare/analytics@0.2.1...analytics@0.3.0) (2026-09-10)

### Features

* conditional-load provider, capture hook, host utils ([4c79723](https://github.com/activescott/js-utils/commit/4c79723990ceb00bd3e20f59b690a308980318f5))

## [0.2.1](https://github.com/activescott/js-utils/compare/analytics@0.2.0...analytics@0.2.1) (2026-09-10)

### Bug Fixes

* allow childless PostHogProvider for sibling mounting ([e2a2dec](https://github.com/activescott/js-utils/commit/e2a2dec3c4995ae00e1ab97721c193a35c861c19))

## 0.2.0

- `createPostHogProxy` gains `forwardIp`: when true, the ingress-set
  `X-Forwarded-For` chain is forwarded unchanged for PostHog geoIP. Default
  remains false — no IP signal leaves your infrastructure unless you opt in.

Initial release as `@activescott/analytics`, moved from RambleFeed's
`@activescott/posthog-react-router` (v0.1.1).

Breaking changes from the RambleFeed package:

- Package renamed to `@activescott/analytics`.
- `createPostHogProxy` takes explicit origins (`{ apiHost, assetsHost? }`)
  instead of `{ region }` — the region choice stays explicit at the call site.
- Proxy hardening: `Cookie`/`Authorization` stripped, `Set-Cookie` stripped
  from responses, path-prefix allowlist, request body cap (413), upstream
  timeout (504), bodies never logged or echoed.
